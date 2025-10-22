import { NextResponse } from "next/server";
import { QdrantClient } from "@qdrant/js-client-rest";
import PDFParser from "pdf2json";
import mammoth from "mammoth";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const qdrant = new QdrantClient({
  url: process.env.NEXT_PUBLIC_QDRANT_URL!,
  apiKey: process.env.NEXT_PUBLIC_QDRANT_API_KEY!,
});

async function extractTextFromPDF(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData: any) =>
      reject(errData.parserError)
    );
    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      const text = pdfData?.formImage?.Pages?.map((page: any) =>
        page.Texts.map((t: any) =>
          decodeURIComponent(t.R.map((r: any) => r.T).join(""))
        ).join(" ")
      ).join("\n");
      resolve(text || "");
    });

    pdfParser.loadPDF(filePath);
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadDir = path.join(process.cwd(), "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, file.name);
    await fs.writeFile(filePath, buffer);

    let textContent = "";

    if (file.name.endsWith(".pdf")) {
      textContent = await extractTextFromPDF(filePath);
    } else if (file.name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ path: filePath });
      textContent = result.value;
    } else if (file.name.endsWith(".txt")) {
      textContent = buffer.toString("utf8");
    }

    await qdrant
      .createCollection("Documents", {
        vectors: {
          size: 3072,
          distance: "Cosine",
        },
      })
      .catch(() => {}); // Ignore if already exists

    return NextResponse.json({ success: true, name: file.name });
  } catch (error: any) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
