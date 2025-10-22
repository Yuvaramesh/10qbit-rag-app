import { NextResponse } from "next/server";
import { QdrantClient } from "@qdrant/js-client-rest";
import { MongoClient } from "mongodb";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfParse from "pdf-parse";

import { v4 as uuidv4 } from "uuid";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY!,
});

const mongo = new MongoClient(process.env.MONGO_CONNECTION_STRING!);
const db = mongo.db("10qbit");
const collection = db.collection("Documents");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// 🧠 Embedding
async function embedText(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "embedding-001" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

// 📄 Split into chunks
function chunkText(text: string, chunkSize = 500) {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

// 🚀 Upload route
export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const data = await pdfParse(buffer);
  const text = data.text;

  const chunks = chunkText(text);
  const embeddings = await Promise.all(chunks.map(embedText));

  const docId = uuidv4();

  // Save in Qdrant
  await qdrant.upsert("10qbit", {
    points: embeddings.map((vector, i) => ({
      id: `${docId}_${i}`,
      vector,
      payload: {
        docId,
        text: chunks[i],
        name: file.name,
      },
    })),
  });

  // Save metadata in MongoDB
  await collection.insertOne({
    id: docId,
    name: file.name,
    uploaded: new Date().toISOString(),
    type: file.type,
    status: "Active",
    category: "Uploads (User-Provided Documents)",
    tags: [],
  });

  return NextResponse.json({ success: true });
}
