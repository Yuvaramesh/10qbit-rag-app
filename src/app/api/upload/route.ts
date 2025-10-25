import { NextResponse } from "next/server";
import PDFParser from "pdf2json";
import mammoth from "mammoth";
import fs from "fs/promises";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MongoClient } from "mongodb";
import path from "path";
import os from "os";

export const runtime = "nodejs";

// MongoDB Connection Setup
const mongoClient = new MongoClient(
  process.env.NEXT_PUBLIC_MONGO_CONNECTION_STRING!
);
let db: any;

async function getDB() {
  if (!db) {
    await mongoClient.connect();
    db = mongoClient.db("Rag");
  }
  return db;
}

// Gemini API Setup
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

async function extractTextFromPDF(filePath: string): Promise<string> {
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
                // If decoding fails, return the raw text
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

    pdfParser.loadPDF(filePath);
  });
}

async function generateEmbeddings(text: string): Promise<number[]> {
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
    console.log("=== Upload Request Started ===");

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const version = (formData.get("version") as string) || "v1.0";
    const category = (formData.get("category") as string) || "Uncategorized";
    const tagsString = formData.get("tags") as string;

    let tags: string[] = [];
    try {
      tags = tagsString ? JSON.parse(tagsString) : [];
    } catch (e) {
      tags = [];
    }

    if (!file)
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const tempDir = path.join(os.tmpdir(), "uploads");
    await fs.mkdir(tempDir, { recursive: true });

    const filePath = path.join(tempDir, file.name);
    await fs.writeFile(filePath, buffer);

    // Extract Text
    let textContent = "";
    if (file.name.endsWith(".pdf")) {
      textContent = await extractTextFromPDF(filePath);
    } else if (file.name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ path: filePath });
      textContent = result.value;
    } else if (file.name.endsWith(".txt")) {
      textContent = buffer.toString("utf8");
    } else {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    if (!textContent.trim()) {
      return NextResponse.json({ error: "No text extracted" }, { status: 400 });
    }

    const db = await getDB();
    const documents = db.collection("documents");

    const chunks = await chunkText(textContent);
    const documentId = Date.now().toString();
    const uploadDate = new Date();

    console.log(`Embedding ${chunks.length} chunks...`);
    const embeddingsData = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateEmbeddings(chunk);
      embeddingsData.push({
        documentId,
        fileName: file.name,
        fileType: file.name.split(".").pop()?.toUpperCase() || "Unknown",
        version,
        category,
        tags,
        status: "Active",
        chunkIndex: i,
        totalChunks: chunks.length,
        text: chunk,
        embedding,
        uploaded: uploadDate,
      });
    }

    await documents.insertMany(embeddingsData);

    console.log(`✓ Document "${file.name}" stored successfully`);
    return NextResponse.json({
      success: true,
      documentId,
      chunks: chunks.length,
      fileName: file.name,
      version,
      category,
      tags,
      status: "Active",
      uploaded: uploadDate.toISOString(),
    });
  } catch (error: any) {
    console.error("Upload failed:", error);
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

    const formattedDocs = docs.map((doc) => ({
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

    // Update status to "Archived" instead of deleting
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
