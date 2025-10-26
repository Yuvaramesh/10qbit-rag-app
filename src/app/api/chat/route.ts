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

// Generate embeddings for query
async function generateQueryEmbedding(text: string): Promise<number[]> {
  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
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

// Extract context from documents
async function extractContext(
  query: string,
  selectedFile?: string
): Promise<{ chunks: string[]; sources: string[] }> {
  try {
    console.log("Extracting context for query:", query);
    console.log("Selected file:", selectedFile || "all");

    const db = await getDB();
    const documents = db.collection("documents");

    // Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(query);
    console.log("Query embedding generated, length:", queryEmbedding.length);

    // Build filter
    const filter: any = { status: "Active" };
    if (selectedFile) {
      filter.fileName = selectedFile;
    }

    // Fetch all matching documents
    const docs = await documents.find(filter).toArray();
    console.log(`Found ${docs.length} document chunks`);

    if (docs.length === 0) {
      return { chunks: [], sources: [] };
    }

    // Calculate similarities and sort
    const scoredDocs = docs
      .map((doc: any) => ({
        ...doc,
        similarity: cosineSimilarity(queryEmbedding, doc.embedding),
      }))
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, 3); // Top 3 most relevant chunks

    console.log(
      "Top similarities:",
      scoredDocs.map((d: any) => d.similarity)
    );

    return {
      chunks: scoredDocs.map((doc: any) => doc.text),
      sources: scoredDocs.map((doc: any) => doc.fileName),
    };
  } catch (error) {
    console.error("Error extracting context:", error);
    throw error;
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
- common: General queries, FAQs, simple questions, policies, schedules

Rules:
- Return ONLY one word: technical, customer, or common
- No explanation, no punctuation

Query: ${query}

Context:
${contextText}

Agent:`;

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const response = await model.generateContent(prompt);
    const agentType = response.response
      .text()
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, "");

    console.log("Classified agent type:", agentType);

    // Validate response
    if (["technical", "customer", "common"].includes(agentType)) {
      return agentType;
    }

    console.log("Invalid agent type, defaulting to common");
    return "common";
  } catch (error) {
    console.error("Error classifying agent:", error);
    return "common";
  }
}

// Generate response based on agent type
async function generateResponse(
  query: string,
  context: string[],
  agentType: string,
  chatHistory: any[]
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
        "You are a helpful assistant who answers general questions clearly and concisely.",
    };

    const prompt = `${roleDescriptions[agentType] || roleDescriptions.common}

IMPORTANT INSTRUCTIONS:
- Answer ONLY using the provided context below
- If the context doesn't contain the answer, say "I don't have enough information in the documents to answer that question."
- Be clear, concise, and professional
- Write in simple paragraphs without markdown formatting
- Do NOT use bold, italics, bullet points, or special formatting
- Reference specific information from the context when applicable

${historyText ? `Previous Conversation:\n${historyText}\n\n` : ""}

Current Question:
${query}

Context from Documents:
${contextText}

Answer:`;

    console.log("Generating response with", agentType, "agent");

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const response = await model.generateContent(prompt);

    let cleanedResponse = response.response.text().trim();

    // Clean response - remove markdown formatting
    cleanedResponse = cleanedResponse
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/^[•\-\*]\s+/gm, "")
      .replace(/^#{1,6}\s+/gm, "");

    console.log("Response generated successfully");
    return cleanedResponse;
  } catch (error) {
    console.error("Error generating response:", error);
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
    const db = await getDB();
    const chatHistory = db.collection("chat_history");

    await chatHistory.insertOne({
      question: query,
      answer,
      agent: agentType,
      selectedFile,
      userEmail,
      sources,
      timestamp: new Date(),
    });

    console.log("Chat history saved");
  } catch (error) {
    console.error("Error saving chat history:", error);
  }
}

// POST - Handle chat query
export async function POST(request: Request) {
  try {
    console.log("=== Chat Request Started ===");

    const body = await request.json();
    const { query, selectedFile, userEmail = "anonymous" } = body;

    console.log("Request body:", { query, selectedFile, userEmail });

    if (!query || !query.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Step 1: Extract context from documents
    console.log("Step 1: Extracting context...");
    const { chunks, sources } = await extractContext(query, selectedFile);

    if (chunks.length === 0) {
      console.log("No relevant chunks found");
      return NextResponse.json({
        answer:
          "I couldn't find any relevant information in the documents. Please make sure documents are uploaded and try rephrasing your question.",
        agent: "common",
        sources: [],
      });
    }

    // Step 2: Classify which agent should handle the query
    console.log("Step 2: Classifying agent...");
    const agentType = await classifyAgent(query, chunks);

    // Step 3: Get chat history for context
    console.log("Step 3: Fetching chat history...");
    const db = await getDB();
    const chatHistory = await db
      .collection("chat_history")
      .find({ userEmail })
      .sort({ timestamp: -1 })
      .limit(3)
      .toArray();

    // Step 4: Generate response using the appropriate agent
    console.log("Step 4: Generating response...");
    const answer = await generateResponse(
      query,
      chunks,
      agentType,
      chatHistory
    );

    // Step 5: Save to chat history
    console.log("Step 5: Saving chat history...");
    await saveChatHistory(
      query,
      answer,
      agentType,
      selectedFile || "all",
      userEmail,
      [...new Set(sources)]
    );

    console.log("✓ Chat request completed successfully");

    return NextResponse.json({
      answer,
      agent: agentType,
      sources: [...new Set(sources)],
    });
  } catch (error: any) {
    console.error("Chat error:", error);
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

    console.log("Fetching chat history for:", userEmail);

    const db = await getDB();
    const chatHistory = await db
      .collection("chat_history")
      .find({ userEmail })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    console.log(`Found ${chatHistory.length} chat messages`);

    return NextResponse.json({
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
    console.error("Failed to fetch chat history:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
