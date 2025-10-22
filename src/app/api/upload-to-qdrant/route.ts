import { NextResponse } from "next/server";
import { QdrantClient } from "@qdrant/js-client-rest";
import PDFParser from "pdf2json";
import mammoth from "mammoth";
import fs from "fs/promises";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const qdrant = new QdrantClient({
  url: process.env.NEXT_PUBLIC_QDRANT_URL!,
  apiKey: process.env.NEXT_PUBLIC_QDRANT_API_KEY!,
});

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

const COLLECTION_NAME = "Documents";

async function extractTextFromPDF(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new (PDFParser as any)(null, 1);

    pdfParser.on("pdfParser_dataError", (errData: any) => {
      console.error("PDF Parser Error:", errData);
      reject(new Error(errData.parserError || "PDF parsing failed"));
    });

    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      try {
        if (!pdfData || !pdfData.Pages || pdfData.Pages.length === 0) {
          reject(new Error("PDF has no readable pages"));
          return;
        }

        const text = pdfData.Pages.map((page: any) => {
          if (!page.Texts) return "";
          return page.Texts.map((t: any) => {
            if (!t.R) return "";
            return t.R.map((r: any) => decodeURIComponent(r.T || "")).join("");
          }).join(" ");
        }).join("\n");

        resolve(text || "");
      } catch (err: any) {
        reject(new Error(`Error processing PDF data: ${err.message}`));
      }
    });

    try {
      pdfParser.loadPDF(filePath);
    } catch (err: any) {
      reject(new Error(`Error loading PDF: ${err.message}`));
    }
  });
}

async function generateEmbeddings(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

  // Limit text length for embedding (Gemini has token limits)
  const truncatedText = text.substring(0, 10000);

  const result = await model.embedContent(truncatedText);
  return result.embedding.values;
}

async function chunkText(
  text: string,
  chunkSize: number = 500
): Promise<string[]> {
  const chunks: string[] = [];
  const words = text.split(/\s+/);

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

    if (!file) {
      console.error("No file in request");
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    console.log(
      `File received: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`
    );

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save file to uploads directory
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, file.name);
    await fs.writeFile(filePath, buffer);
    console.log(`File saved to: ${filePath}`);

    // Extract text based on file type
    let textContent = "";

    try {
      console.log(`Starting text extraction for ${file.name}`);

      if (file.name.toLowerCase().endsWith(".pdf")) {
        console.log("Extracting from PDF...");
        textContent = await extractTextFromPDF(filePath);
      } else if (file.name.toLowerCase().endsWith(".docx")) {
        console.log("Extracting from DOCX...");
        const result = await mammoth.extractRawText({ path: filePath });
        textContent = result.value;
      } else if (file.name.toLowerCase().endsWith(".txt")) {
        console.log("Reading TXT file...");
        textContent = buffer.toString("utf8");
      } else {
        console.error(`Unsupported file extension: ${file.name}`);
        return NextResponse.json(
          {
            error:
              "Unsupported file type. Please upload PDF, DOCX, or TXT files.",
          },
          { status: 400 }
        );
      }
    } catch (extractError: any) {
      console.error("Text extraction error:", extractError);
      console.error("Error stack:", extractError.stack);
      return NextResponse.json(
        { error: `Failed to extract text: ${extractError.message}` },
        { status: 400 }
      );
    }

    console.log(`Text extracted: ${textContent.length} characters`);
    console.log(`First 100 chars: ${textContent.substring(0, 100)}`);

    if (!textContent || !textContent.trim()) {
      console.error("Extracted text is empty");
      return NextResponse.json(
        {
          error:
            "Could not extract text from document. The file may be empty or corrupted.",
        },
        { status: 400 }
      );
    }

    console.log(
      `Successfully extracted ${textContent.length} characters from ${file.name}`
    );

    // Ensure collection exists with 768 dimensions (Gemini text-embedding-004 output size)
    try {
      const collections = await qdrant.getCollections();
      const collectionExists = collections.collections.some(
        (col: any) => col.name === COLLECTION_NAME
      );

      if (!collectionExists) {
        await qdrant.createCollection(COLLECTION_NAME, {
          vectors: {
            size: 768,
            distance: "Cosine",
          },
        });
        console.log(`Collection "${COLLECTION_NAME}" created successfully`);
      } else {
        console.log(`Collection "${COLLECTION_NAME}" already exists`);
      }
    } catch (error: any) {
      console.error("Error with collection:", error);
      return NextResponse.json(
        { error: `Collection error: ${error.message}` },
        { status: 500 }
      );
    }

    // Chunk the text for better retrieval
    const chunks = await chunkText(textContent);
    const documentId = Date.now();

    console.log(`Split into ${chunks.length} chunks, starting embeddings...`);

    // Generate embeddings and store each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      try {
        console.log(`Processing chunk ${i + 1}/${chunks.length}...`);
        const embedding = await generateEmbeddings(chunk);

        console.log(`Embedding generated, dimension: ${embedding.length}`);

        // Ensure the ID is a valid format (UUID string or integer)
        const pointId = documentId * 1000 + i; // Use numeric ID

        await qdrant.upsert(COLLECTION_NAME, {
          wait: true,
          points: [
            {
              id: pointId,
              vector: embedding,
              payload: {
                documentId: documentId.toString(),
                fileName: file.name,
                fileType:
                  file.name.split(".").pop()?.toUpperCase() || "Unknown",
                chunkIndex: i,
                totalChunks: chunks.length,
                text: chunk,
                uploadedAt: new Date().toISOString(),
                filePath: `/uploads/${file.name}`,
              },
            },
          ],
        });

        console.log(`✓ Chunk ${i + 1}/${chunks.length} uploaded successfully`);
      } catch (embeddingError: any) {
        console.error(`Error processing chunk ${i}:`, embeddingError);
        console.error(
          "Error details:",
          JSON.stringify(embeddingError, null, 2)
        );
        throw new Error(
          `Failed to process chunk ${i}: ${embeddingError.message}`
        );
      }
    }

    console.log(`✓ Successfully uploaded all ${chunks.length} chunks`);

    return NextResponse.json({
      success: true,
      id: documentId.toString(),
      name: file.name,
      chunks: chunks.length,
    });
  } catch (error: any) {
    console.error("Upload failed:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve all documents
export async function GET() {
  try {
    // Check if collection exists
    const collections = await qdrant.getCollections();
    const collectionExists = collections.collections.some(
      (col: any) => col.name === COLLECTION_NAME
    );

    // If collection doesn't exist, return empty array
    if (!collectionExists) {
      return NextResponse.json({ documents: [] });
    }

    // Scroll through all points to get unique documents
    const scrollResult = await qdrant.scroll(COLLECTION_NAME, {
      limit: 1000,
      with_payload: true,
      with_vector: false,
    });

    // Group by documentId to get unique documents
    const documentsMap = new Map();

    scrollResult.points.forEach((point: any) => {
      const payload = point.payload;
      if (!documentsMap.has(payload.documentId)) {
        documentsMap.set(payload.documentId, {
          id: payload.documentId,
          name: payload.fileName,
          type: payload.fileType,
          version: "v1.0",
          uploaded: payload.uploadedAt.split("T")[0],
          status: "Active",
          category: "Uploads (User-Provided Documents)",
          tags: ["Uploaded"],
          filePath: payload.filePath,
        });
      }
    });

    const documents = Array.from(documentsMap.values());

    return NextResponse.json({ documents });
  } catch (error: any) {
    console.error("Failed to fetch documents:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
