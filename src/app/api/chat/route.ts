// app/api/chat/route.ts
import { NextResponse } from "next/server";
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

// 🔹 Send query to n8n webhook and get response
async function getChatResponseFromN8N(
  query: string,
  selectedFile: string,
  userEmail: string
): Promise<any> {
  try {
    console.log("\n🌐 ========== N8N WEBHOOK REQUEST ==========");
    console.log("📤 Sending query to n8n webhook for processing...");
    console.log(
      "🔗 Webhook URL: https://jeni09.app.n8n.cloud/webhook/c3df4268-13bf-4c01-9ce2-56732d7bc5ad"
    );

    const webhookData = {
      query,
      selectedFile: selectedFile || "all",
      userEmail,
      timestamp: new Date().toISOString(),
    };

    console.log("📦 Payload being sent:");
    console.log(JSON.stringify(webhookData, null, 2));
    console.log(
      "📏 Payload size:",
      JSON.stringify(webhookData).length,
      "bytes"
    );

    const startTime = Date.now();

    const webhookResponse = await fetch(
      "https://jeni09.app.n8n.cloud/webhook/c3df4268-13bf-4c01-9ce2-56732d7bc5ad",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookData),
      }
    );

    const duration = Date.now() - startTime;

    console.log("\n📨 ========== N8N WEBHOOK RESPONSE ==========");
    console.log("✅ Webhook request completed");
    console.log("📊 Response status:", webhookResponse.status);
    console.log("📊 Response status text:", webhookResponse.statusText);
    console.log("⏱️  Response time:", duration, "ms");

    if (!webhookResponse.ok) {
      console.error(
        "❌ Webhook returned error status:",
        webhookResponse.status
      );
      const errorText = await webhookResponse.text();
      console.error("❌ Error response:", errorText);
      throw new Error(
        `Webhook returned status ${webhookResponse.status}: ${errorText}`
      );
    }

    const responseData = await webhookResponse.json();
    console.log("📄 Response data received:");
    console.log(JSON.stringify(responseData, null, 2));

    // Handle different response formats from n8n
    // If response has "output" field, use that as the answer
    if (responseData.output && !responseData.answer) {
      responseData.answer = responseData.output;
      console.log("✅ Converted 'output' field to 'answer'");
    }

    console.log("✅✅✅ WEBHOOK SUCCESS - Answer received from n8n!");
    console.log("========================================\n");

    return responseData;
  } catch (error: any) {
    console.error("\n❌ ========== N8N WEBHOOK ERROR ==========");
    console.error("❌ Failed to get response from webhook");
    console.error("❌ Error type:", error.constructor.name);
    console.error("❌ Error message:", error.message);
    if (error.stack) {
      console.error("❌ Error stack:", error.stack);
    }
    console.error("========================================\n");
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
  sources: string[],
  similarity?: string,
  multiQuestion?: boolean
) {
  try {
    console.log("💾 Saving chat history to MongoDB...");

    const db = await getDB();
    const chatHistory = db.collection("chat_history");

    const chatDocument = {
      question: query,
      answer,
      agent: agentType || "common",
      selectedFile: selectedFile || "all",
      userEmail,
      sources: sources || [],
      similarity: similarity || "N/A",
      multiQuestion: multiQuestion || false,
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
    console.log("📁 Selected file:", selectedFile || "all");
    console.log("👤 User:", userEmail);

    if (!query || !query.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    console.log("\n🤖 === SENDING TO N8N FOR PROCESSING ===");

    // Send query to n8n and get response
    const n8nResponse = await getChatResponseFromN8N(
      query,
      selectedFile || "all",
      userEmail
    );

    // Extract data from n8n response
    const {
      answer,
      output, // fallback if answer is not provided
      agent = "common",
      sources = [],
      similarity = "N/A",
      multiQuestion = false,
    } = n8nResponse;

    // Use answer if available, otherwise use output
    const finalAnswer = answer || output;

    if (!finalAnswer) {
      throw new Error("No answer received from n8n webhook");
    }

    console.log("\n📍 Received from n8n:");
    console.log("  Answer:", finalAnswer.substring(0, 100) + "...");
    console.log("  Agent:", agent);
    console.log("  Sources:", sources);
    console.log("  Similarity:", similarity);
    console.log("  Multi-question:", multiQuestion);

    // Save to MongoDB
    console.log("\n📍 Saving to MongoDB...");
    await saveChatHistory(
      query,
      finalAnswer,
      agent,
      selectedFile || "all",
      userEmail,
      sources,
      similarity,
      multiQuestion
    );

    console.log("✅ === CHAT REQUEST COMPLETED ===\n");

    return NextResponse.json({
      answer: finalAnswer,
      agent,
      sources,
      similarity,
      multiQuestion,
    });
  } catch (error: any) {
    console.error("❌ CHAT ERROR:", error.message);
    return NextResponse.json(
      {
        error: error.message || "Failed to process query",
        details:
          "Could not get response from n8n webhook. Please check webhook configuration.",
      },
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
        similarity: chat.similarity,
        multiQuestion: chat.multiQuestion,
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
