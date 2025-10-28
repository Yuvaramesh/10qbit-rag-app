// app/api/chat/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MongoClient } from "mongodb";

export const runtime = "nodejs";
export const maxDuration = 60;

// MongoDB Connection
let mongoClient: MongoClient | null = null;
let db: any;

async function getDB() {
  if (!db) {
    const connectionString = process.env.NEXT_PUBLIC_MONGO_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("MongoDB connection string not configured");
    }
    if (!mongoClient) {
      mongoClient = new MongoClient(connectionString);
      await mongoClient.connect();
    }
    db = mongoClient.db("Rag");
  }
  return db;
}

// Gemini API Setup
function getGenAI() {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }
  return new GoogleGenerativeAI(apiKey);
}

// Retry logic with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if it's a 503 error
      if (error.status === 503 || error.message?.includes("overloaded")) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(
          `⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // For other errors, throw immediately
      throw error;
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

// Generate embeddings for query
async function generateQueryEmbedding(text: string): Promise<number[]> {
  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    return await retryWithBackoff(async () => {
      const result = await model.embedContent(text);
      return result.embedding.values;
    });
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

// Calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Detect if query contains multiple questions (simplified pattern matching)
function detectMultipleQuestions(query: string): boolean {
  // Count question marks
  const questionMarks = (query.match(/\?/g) || []).length;
  if (questionMarks > 1) return true;

  // Check for connecting words with multiple topics
  const hasMultipleTopics =
    /\b(and|also|plus|additionally)\s+what|how|why|when|where|who/i.test(query);
  if (hasMultipleTopics) return true;

  // Check for comma-separated questions
  const parts = query.split(/[,;]/);
  const questionWords =
    /\b(what|how|why|when|where|who|explain|describe|tell)\b/i;
  const questionParts = parts.filter((part) => questionWords.test(part));

  return questionParts.length > 1;
}

// Extract context from documents with similarity scoring
async function extractContext(
  query: string,
  selectedFile?: string
): Promise<{ chunks: string[]; sources: string[]; topSimilarity: number }> {
  try {
    console.log("📄 Extracting context for query:", query);
    console.log("📁 Selected file:", selectedFile || "all");

    const db = await getDB();
    const documents = db.collection("documents");

    const queryEmbedding = await generateQueryEmbedding(query);
    console.log("🔢 Query embedding generated, length:", queryEmbedding.length);

    const filter: any = { status: "Active" };
    if (selectedFile) {
      filter.fileName = selectedFile;
    }

    const docs = await documents.find(filter).toArray();
    console.log(`📚 Found ${docs.length} document chunks`);

    if (docs.length === 0) {
      return { chunks: [], sources: [], topSimilarity: 0 };
    }

    const scoredDocs = docs
      .map((doc: any) => ({
        ...doc,
        similarity: cosineSimilarity(queryEmbedding, doc.embedding),
      }))
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, 8);

    const similarities = scoredDocs.map((d: any) => d.similarity.toFixed(4));
    console.log("📊 Top similarities:", similarities);

    const topSimilarity = scoredDocs[0]?.similarity || 0;

    return {
      chunks: scoredDocs.map((doc: any) => doc.text),
      sources: [...new Set(scoredDocs.map((doc: any) => doc.fileName))],
      topSimilarity,
    };
  } catch (error) {
    console.error("❌ Error extracting context:", error);
    throw error;
  }
}

// Google Search function
async function searchGoogle(query: string): Promise<string> {
  try {
    console.log("🔍 Searching Google for:", query);

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      console.log(
        "⚠️ Google Search API not configured, using LLM general knowledge"
      );
      return "";
    }

    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(
      query
    )}&num=5`;

    const response = await fetch(searchUrl);

    if (!response.ok) {
      console.log("⚠️ Google Search failed, falling back to general knowledge");
      return "";
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      console.log("⚠️ No search results found");
      return "";
    }

    const searchContext = data.items
      .slice(0, 5)
      .map((item: any, idx: number) => {
        return `Source ${idx + 1}: ${item.title}\n${item.snippet}\nURL: ${
          item.link
        }`;
      })
      .join("\n\n");

    console.log(
      "✅ Google search completed, found",
      data.items.length,
      "results"
    );
    return searchContext;
  } catch (error) {
    console.error("❌ Google Search error:", error);
    return "";
  }
}

// Classify agent based on query and context
async function classifyAgent(
  query: string,
  context: string[]
): Promise<string> {
  try {
    const contextText = context.join("\n");
    const prompt = `You are a routing agent. Analyze the query and determine the appropriate agent.

Agent types:
- technical: Engineering, technical specs, procedures, safety protocols, technical documentation, equipment, machinery
- customer: Customer support, product inquiries, service requests, complaints, returns, general assistance
- common: General queries, FAQs, simple questions, policies, schedules, general knowledge questions

Rules:
- Return ONLY one word: technical, customer, or common
- No explanation, no punctuation
- If multiple topics, choose the most prominent

Query: ${query}

Context:
${contextText}

Agent:`;

    const genAI = getGenAI();

    // Try primary model with retry
    return await retryWithBackoff(
      async () => {
        try {
          const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
          });
          const response = await model.generateContent(prompt);
          const agentType = response.response
            .text()
            .trim()
            .toLowerCase()
            .replace(/[^a-z]/g, "");

          console.log("🤖 Classified agent type:", agentType);

          if (["technical", "customer", "common"].includes(agentType)) {
            return agentType;
          }
          return "common";
        } catch (error: any) {
          // If primary model fails, try fallback
          if (error.status === 503) {
            console.log("⚠️ Primary model overloaded, trying fallback...");
            const fallbackModel = genAI.getGenerativeModel({
              model: "gemini-2.5-flash",
            });
            const response = await fallbackModel.generateContent(prompt);
            const agentType = response.response
              .text()
              .trim()
              .toLowerCase()
              .replace(/[^a-z]/g, "");

            if (["technical", "customer", "common"].includes(agentType)) {
              return agentType;
            }
          }
          throw error;
        }
      },
      2,
      1000
    );
  } catch (error) {
    console.error("❌ Error classifying agent:", error);
    return "common";
  }
}

// Generate response with retry and fallback
async function generateResponse(
  query: string,
  context: string[],
  agentType: string,
  chatHistory: any[],
  topSimilarity: number,
  isMultiQuestion: boolean
): Promise<string> {
  try {
    const contextText = context.join("\n\n");
    const historyText = chatHistory
      .slice(-3)
      .map((msg) => `Q: ${msg.question}\nA: ${msg.answer}`)
      .join("\n\n");

    const roleDescriptions: Record<string, string> = {
      technical:
        "You are a technical specialist who provides detailed, accurate information about engineering processes, technical specifications, and procedures.",
      customer:
        "You are a customer support agent who provides friendly, helpful assistance with product inquiries and service requests.",
      common:
        "You are a knowledgeable assistant who provides clear, accurate answers to questions.",
    };

    const SIMILARITY_THRESHOLD = 0.35;
    const hasRelevantContext = topSimilarity >= SIMILARITY_THRESHOLD;

    console.log(
      `📈 Context relevance: ${(topSimilarity * 100).toFixed(
        2
      )}% (threshold: ${(SIMILARITY_THRESHOLD * 100).toFixed(0)}%)`
    );
    console.log(`🔢 Multiple questions detected: ${isMultiQuestion}`);

    let prompt = "";

    if (hasRelevantContext && context.length > 0) {
      prompt = `${roleDescriptions[agentType] || roleDescriptions.common}

CRITICAL INSTRUCTIONS:
- Answer using the provided document context below
- The context has ${(topSimilarity * 100).toFixed(1)}% relevance to the question
${
  isMultiQuestion
    ? "- This query contains MULTIPLE QUESTIONS - address each question separately and clearly\n- Structure your response to answer all parts of the question comprehensively"
    : ""
}
- If the context doesn't fully answer the question, provide what information is available and clearly note what additional details might not be in the current documents
- Be accurate, clear, and professional
- Write in natural, conversational language
- Do NOT use markdown formatting, bold, italics, bullet points, or special symbols
- Reference specific information from the context when applicable
${
  isMultiQuestion
    ? "- For multiple questions, address them in the order they were asked"
    : ""
}

${historyText ? `Previous Conversation:\n${historyText}\n\n` : ""}

Current Question:
${query}

Document Context:
${contextText}

Your Answer:`;
    } else {
      prompt = `${roleDescriptions[agentType] || roleDescriptions.common}

CRITICAL INSTRUCTIONS:
- The user asked: "${query}"
${
  isMultiQuestion
    ? "- This query contains MULTIPLE QUESTIONS - address each question separately and comprehensively\n- Structure your response to cover all aspects of the query"
    : ""
}
- Provide a comprehensive, accurate answer using your general knowledge
- Be natural and conversational in your response
- Do NOT mention documents, context, or that information is missing
- Simply answer the question as if you naturally know the information
- Keep it informative, accurate, and helpful
- Write in natural language without markdown formatting
- Do NOT use bold, italics, bullet points, or special symbols
- Be confident and professional
${
  isMultiQuestion
    ? "- Address all questions in a logical, organized manner"
    : ""
}

${historyText ? `Previous Conversation:\n${historyText}\n\n` : ""}

Current Question:
${query}

Provide a complete and helpful answer:`;
    }

    console.log("🔄 Generating response with", agentType, "agent");

    const genAI = getGenAI();

    const cleanedResponse = await retryWithBackoff(
      async () => {
        try {
          const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
          });
          const response = await model.generateContent(prompt);
          return response.response.text().trim();
        } catch (error: any) {
          // If primary model fails, try fallback
          if (error.status === 503) {
            console.log("⚠️ Primary model overloaded, using fallback model...");
            const fallbackModel = genAI.getGenerativeModel({
              model: "gemini-2.5-flash",
            });
            const response = await fallbackModel.generateContent(prompt);
            return response.response.text().trim();
          }
          throw error;
        }
      },
      3,
      1000
    );

    // Remove markdown formatting
    const finalResponse = cleanedResponse
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/^[•\-\*]\s+/gm, "")
      .replace(/^#{1,6}\s+/gm, "");

    console.log("✅ Response generated successfully");
    return finalResponse;
  } catch (error) {
    console.error("❌ Error generating response:", error);
    throw error;
  }
}

// Save chat to history
async function saveChatHistory(
  query: string,
  answer: string,
  agentType: string,
  selectedFile: string,
  userEmail: string,
  sources: string[]
) {
  try {
    console.log("💾 Saving chat history...");

    const db = await getDB();
    const chatHistory = db.collection("chat_history");

    const chatDocument = {
      question: query,
      answer,
      agent: agentType,
      selectedFile: selectedFile || "all",
      userEmail,
      sources: sources || [],
      timestamp: new Date(),
      createdAt: new Date().toISOString(),
    };

    const result = await chatHistory.insertOne(chatDocument);
    console.log("✅ Chat history saved! ID:", result.insertedId.toString());

    return result;
  } catch (error: any) {
    console.error("❌ ERROR saving chat history:", error.message);
    return null;
  }
}

// POST - Handle chat query
export async function POST(request: Request) {
  try {
    console.log("\n🚀 ===== CHAT REQUEST STARTED =====");

    const body = await request.json();
    const { query, selectedFile, userEmail = "anonymous" } = body;

    console.log("📝 Query:", query);
    console.log("👤 User:", userEmail);

    if (!query || !query.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    console.log("\n🤖 === MULTI-AGENT LLM PROCESSING ===");

    // Detect if query has multiple questions (using pattern matching)
    const isMultiQuestion = detectMultipleQuestions(query);
    console.log(`🔍 Multi-question detection: ${isMultiQuestion}`);

    // Step 1: Extract context from documents
    console.log("📍 Step 1: Extracting context from documents...");
    const { chunks, sources, topSimilarity } = await extractContext(
      query,
      selectedFile
    );

    // Get chat history for context
    const db = await getDB();
    const chatHistoryDocs = await db
      .collection("chat_history")
      .find({ userEmail })
      .sort({ timestamp: -1 })
      .limit(3)
      .toArray();

    // Step 2: Determine response approach based on context availability
    const SIMILARITY_THRESHOLD = 0.35;
    const hasRelevantDocs =
      chunks.length > 0 && topSimilarity >= SIMILARITY_THRESHOLD;

    let generatedAnswer: string;
    let finalAgentType: string;

    if (!hasRelevantDocs) {
      console.log("⚠️ No relevant documents found or low similarity");
      console.log("🌐 Using Common Agent with general knowledge...");

      finalAgentType = "common";
      const googleContext = await searchGoogle(query);

      const genAI = getGenAI();

      if (googleContext) {
        const prompt = `You are a helpful assistant with access to web information.

The user asked: "${query}"
${
  isMultiQuestion
    ? "\nThis query contains MULTIPLE QUESTIONS. Address each question clearly and comprehensively."
    : ""
}

Here is relevant information from the web:

${googleContext}

${
  chatHistoryDocs.length > 0
    ? `Previous Conversation:\n${chatHistoryDocs
        .slice(-3)
        .map((msg: any) => `Q: ${msg.question}\nA: ${msg.answer}`)
        .join("\n\n")}\n\n`
    : ""
}

INSTRUCTIONS:
- Synthesize this information into a clear, natural answer
${
  isMultiQuestion
    ? "- Address all parts of the multi-part question systematically"
    : ""
}
- Do NOT mention searching the web, Google, or missing documents
- Answer as if you naturally know this information
- Be conversational, accurate, and helpful
- Write in plain language without markdown, bullet points, or special formatting
- Be confident and informative

Your answer:`;

        generatedAnswer = await retryWithBackoff(
          async () => {
            try {
              const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
              });
              const response = await model.generateContent(prompt);
              return response.response.text().trim();
            } catch (error: any) {
              if (error.status === 503) {
                console.log("⚠️ Using fallback model for general knowledge...");
                const fallbackModel = genAI.getGenerativeModel({
                  model: "gemini-2.5-flash",
                });
                const response = await fallbackModel.generateContent(prompt);
                return response.response.text().trim();
              }
              throw error;
            }
          },
          3,
          1000
        );
      } else {
        const prompt = `You are a knowledgeable assistant with broad general knowledge.

The user asked: "${query}"
${
  isMultiQuestion
    ? "\nThis query contains MULTIPLE QUESTIONS. Address each question clearly and thoroughly."
    : ""
}

${
  chatHistoryDocs.length > 0
    ? `Previous Conversation:\n${chatHistoryDocs
        .slice(-3)
        .map((msg: any) => `Q: ${msg.question}\nA: ${msg.answer}`)
        .join("\n\n")}\n\n`
    : ""
}

INSTRUCTIONS:
- Provide a comprehensive, accurate answer based on your general knowledge
${
  isMultiQuestion
    ? "- Address all parts of the multi-part question in a logical, organized way"
    : ""
}
- Answer naturally and confidently as if you know this information well
- Do NOT mention documents, searching, or missing information
- Be informative, clear, and helpful
- Write in plain conversational language
- Do NOT use markdown, bullet points, bold, italics, or special formatting
- Be professional and accurate

Your answer:`;

        generatedAnswer = await retryWithBackoff(
          async () => {
            try {
              const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
              });
              const response = await model.generateContent(prompt);
              return response.response.text().trim();
            } catch (error: any) {
              if (error.status === 503) {
                console.log("⚠️ Using fallback model for general knowledge...");
                const fallbackModel = genAI.getGenerativeModel({
                  model: "gemini-2.5-flash",
                });
                const response = await fallbackModel.generateContent(prompt);
                return response.response.text().trim();
              }
              throw error;
            }
          },
          3,
          1000
        );
      }

      // Remove markdown formatting
      generatedAnswer = generatedAnswer
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/^[•\-\*]\s+/gm, "")
        .replace(/^#{1,6}\s+/gm, "");
    } else {
      console.log("📍 Step 2: Documents found, classifying agent...");
      finalAgentType = await classifyAgent(query, chunks);

      console.log("📍 Step 3: Generating document-based response...");
      generatedAnswer = await generateResponse(
        query,
        chunks,
        finalAgentType,
        chatHistoryDocs,
        topSimilarity,
        isMultiQuestion
      );
    }

    // Step 4: Save to MongoDB
    console.log("📍 Step 4: Saving to MongoDB...");
    await saveChatHistory(
      query,
      generatedAnswer,
      finalAgentType,
      selectedFile || "all",
      userEmail,
      hasRelevantDocs ? sources : []
    );

    console.log("✅ === CHAT REQUEST COMPLETED ===\n");

    return NextResponse.json({
      answer: generatedAnswer,
      agent: finalAgentType,
      sources: hasRelevantDocs ? sources : [],
      similarity: (topSimilarity * 100).toFixed(1) + "%",
      multiQuestion: isMultiQuestion,
    });
  } catch (error: any) {
    console.error("❌ CHAT ERROR:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to process query" },
      { status: 500 }
    );
  }
}

// GET - Fetch chat history
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get("userEmail") || "anonymous";

    console.log("📚 Fetching chat history for:", userEmail);

    const db = await getDB();
    const chatHistory = await db
      .collection("chat_history")
      .find({ userEmail })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    console.log(`✅ Found ${chatHistory.length} chat messages`);

    return NextResponse.json({
      success: true,
      history: chatHistory.map((chat: any) => ({
        id: chat._id.toString(),
        question: chat.question,
        answer: chat.answer,
        agent: chat.agent,
        sources: chat.sources || [],
        timestamp: chat.timestamp,
      })),
    });
  } catch (error: any) {
    console.error("❌ Failed to fetch chat history:", error);
    return NextResponse.json(
      { error: error.message, history: [] },
      { status: 500 }
    );
  }
}
