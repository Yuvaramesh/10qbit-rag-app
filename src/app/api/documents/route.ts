import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const mongo = new MongoClient(process.env.MONGO_CONNECTION_STRING!);
const db = mongo.db("10qbit");
const collection = db.collection("Documents");

export async function GET() {
  const docs = await collection.find({}).sort({ uploaded: -1 }).toArray();
  return NextResponse.json(docs);
}
