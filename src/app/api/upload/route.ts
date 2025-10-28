import { NextResponse } from "next/server";
import PDFParser from "pdf2json";
import mammoth from "mammoth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MongoClient } from "mongodb";

export const runtime = "nodejs";
export const maxDuration = 60;

// MongoDB Connection Setup
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

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new (PDFParser as any)(null, 1);

    pdfParser.on("pdfParser_dataError", (errData: any) => {
      reject(new Error(errData.parserError || "PDF parsing failed"));
    });

    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      try {
        const text = pdfData.Pages.map((page: any) => {
          return page.Texts?.map((t: any) =>
            t.R.map((r: any) => {
              try {
                return decodeURIComponent(r.T || "");
              } catch (e) {
                return r.T || "";
              }
            }).join("")
          ).join(" ");
        }).join("\n");
        resolve(text || "");
      } catch (err: any) {
        reject(new Error(`Error processing PDF: ${err.message}`));
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}

async function generateEmbeddings(text: string): Promise<number[]> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const truncatedText = text.substring(0, 10000);
  const result = await model.embedContent(truncatedText);
  return result.embedding.values;
}

async function chunkText(
  text: string,
  chunkSize: number = 500
): Promise<string[]> {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }
  return chunks.length > 0 ? chunks : [text];
}

export async function POST(request: Request) {
  try {
    console.log("=== 📁 Upload Request Started ===");

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const version = (formData.get("version") as string) || "v1.0";
    const category = (formData.get("category") as string) || "Uncategorized";
    const tagsString = formData.get("tags") as string;

    let tags: string[] = [];
    try {
      tags = tagsString ? JSON.parse(tagsString) : [];
    } catch {
      tags = [];
    }

    if (!file)
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create document metadata
    const db = await getDB();
    const documents = db.collection("documents");
    const documentId = Date.now().toString();
    const uploadDate = new Date();

    const fileData = {
      documentId,
      fileName: file.name,
      fileType: file.name.split(".").pop()?.toUpperCase() || "Unknown",
      version,
      category,
      tags,
      status: "Active",
      uploaded: uploadDate,
      fileSize: buffer.length,
    };

    // Store metadata in MongoDB
    await documents.insertOne(fileData);
    console.log(`✓ Metadata for "${file.name}" stored successfully`);

    // 🔹 Prepare binary data for webhook
    console.log(`📤 Sending binary file to n8n webhook for "${file.name}"...`);
    const blob = new Blob([buffer], { type: file.type || "application/pdf" });
    const webhookForm = new FormData();

    webhookForm.append("file", blob, file.name);
    webhookForm.append("documentId", documentId);
    webhookForm.append("fileName", file.name);
    webhookForm.append("version", version);
    webhookForm.append("category", category);
    webhookForm.append("tags", JSON.stringify(tags));
    webhookForm.append("uploaded", uploadDate.toISOString());
    webhookForm.append("status", "Active");
    webhookForm.append(
      "fileType",
      file.name.split(".").pop()?.toUpperCase() || "Unknown"
    );

    // Send to n8n webhook
    const webhookResponse = await fetch(
      "https://jeni09.app.n8n.cloud/webhook/84bbc622-af1d-4e5e-8332-40d7433402df",
      {
        method: "POST",
        body: webhookForm,
      }
    );

    console.log(`✅ Webhook request sent for "${file.name}"`);
    console.log("📨 Webhook response status:", webhookResponse.status);

    return NextResponse.json({
      success: true,
      documentId,
      fileName: file.name,
      version,
      category,
      tags,
      status: "Active",
      uploaded: uploadDate.toISOString(),
    });
  } catch (error: any) {
    console.error("❌ Upload failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET all uploaded documents
export async function GET() {
  try {
    const db = await getDB();
    const docs = await db
      .collection("documents")
      .aggregate([
        {
          $group: {
            _id: "$documentId",
            fileName: { $first: "$fileName" },
            fileType: { $first: "$fileType" },
            version: { $first: "$version" },
            category: { $first: "$category" },
            tags: { $first: "$tags" },
            status: { $first: "$status" },
            totalChunks: { $first: "$totalChunks" },
            uploaded: { $first: "$uploaded" },
          },
        },
        { $sort: { uploaded: -1 } },
      ])
      .toArray();

    const formattedDocs = docs.map((doc: any) => ({
      _id: doc._id,
      fileName: doc.fileName,
      type: doc.fileType,
      version: doc.version,
      category: doc.category,
      tags: doc.tags || [],
      status: doc.status,
      uploaded: new Date(doc.uploaded).toISOString().split("T")[0],
      totalChunks: doc.totalChunks,
    }));

    return NextResponse.json({ documents: formattedDocs });
  } catch (error: any) {
    console.error("Failed to fetch documents:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE/Archive a document
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 }
      );
    }

    const db = await getDB();
    const documents = db.collection("documents");

    const result = await documents.updateMany(
      { documentId },
      { $set: { status: "Archived" } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Document archived successfully",
    });
  } catch (error: any) {
    console.error("Archive failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
