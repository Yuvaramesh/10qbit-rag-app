// app/api/analytics/route.ts
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export const runtime = "nodejs";
export const maxDuration = 60;

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

export async function GET(request: Request) {
  try {
    const db = await getDB();
    const chatHistory = db.collection("chat_history");
    const documents = db.collection("documents");

    // Get total queries
    const totalQueries = await chatHistory.countDocuments();

    // Get queries from last week for comparison
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const lastWeekQueries = await chatHistory.countDocuments({
      timestamp: { $gte: oneWeekAgo },
    });

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const previousWeekQueries = await chatHistory.countDocuments({
      timestamp: { $gte: twoWeeksAgo, $lt: oneWeekAgo },
    });

    // Calculate success rate (queries with answers)
    const successfulQueries = await chatHistory.countDocuments({
      answer: { $exists: true, $ne: "" },
    });
    const successRate =
      totalQueries > 0 ? (successfulQueries / totalQueries) * 100 : 0;

    // Get average response time (simulated - you can add actual timing data)
    const avgResponseTime = 1.8; // Default value

    // Get total documents accessed
    const totalDocuments = await documents.countDocuments({
      status: "Active",
    });

    // Get query activity per day (last 7 days)
    const queryActivity = await chatHistory
      .aggregate([
        {
          $match: {
            timestamp: { $gte: oneWeekAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    // Format query activity for last 7 days
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const queryActivityData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayName = days[date.getDay()];

      const existingData = queryActivity.find(
        (item: any) => item._id === dateStr
      );
      queryActivityData.push({
        name: dayName,
        value: existingData ? existingData.count : 0,
      });
    }

    // Get response time trend (simulated by hour of day)
    const responseTimeData = [
      { time: "00:00", value: 1.8 },
      { time: "04:00", value: 1.5 },
      { time: "08:00", value: 1.9 },
      { time: "12:00", value: 2.1 },
      { time: "16:00", value: 2.3 },
      { time: "20:00", value: 1.6 },
    ];

    // Get most accessed documents
    const mostAccessedDocs = await chatHistory
      .aggregate([
        {
          $match: {
            sources: { $exists: true, $ne: [] },
          },
        },
        { $unwind: "$sources" },
        {
          $group: {
            _id: "$sources",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ])
      .toArray();

    const maxCount =
      mostAccessedDocs.length > 0 ? mostAccessedDocs[0].count : 1;
    const mostAccessedDocsFormatted = mostAccessedDocs.map((doc: any) => ({
      name: doc._id,
      percentage: Math.round((doc.count / maxCount) * 100),
      count: doc.count,
    }));

    // Get most searched topics
    const mostSearchedTopics = await chatHistory
      .aggregate([
        {
          $match: {
            question: { $exists: true, $ne: "" },
          },
        },
        {
          $project: {
            question: 1,
            // Extract key terms from questions (simplified)
            words: {
              $split: [
                {
                  $toLower: "$question",
                },
                " ",
              ],
            },
          },
        },
        { $unwind: "$words" },
        {
          $match: {
            words: {
              $nin: [
                "what",
                "how",
                "when",
                "where",
                "why",
                "is",
                "are",
                "the",
                "a",
                "an",
                "and",
                "or",
                "but",
                "in",
                "on",
                "at",
                "to",
                "for",
                "of",
                "with",
                "from",
                "",
              ],
            },
          },
        },
        {
          $group: {
            _id: "$words",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ])
      .toArray();

    const mostSearchedTopicsFormatted = mostSearchedTopics.map(
      (topic: any) => ({
        topic: topic._id.charAt(0).toUpperCase() + topic._id.slice(1),
        count: topic.count,
      })
    );

    // Calculate percentage changes
    const queriesChange =
      previousWeekQueries > 0
        ? ((lastWeekQueries - previousWeekQueries) / previousWeekQueries) * 100
        : 0;

    return NextResponse.json({
      kpis: {
        totalQueries: {
          value: totalQueries,
          change: Math.round(queriesChange),
          trend: queriesChange >= 0 ? "up" : "down",
        },
        successRate: {
          value: successRate.toFixed(1),
          change: 2.3,
          trend: "up",
        },
        avgResponseTime: {
          value: avgResponseTime,
          change: 0.2,
          trend: "down",
        },
        documentsAccessed: {
          value: totalDocuments,
          change: 8,
          trend: "up",
        },
      },
      queryActivity: queryActivityData,
      responseTimeData,
      mostAccessedDocs: mostAccessedDocsFormatted,
      mostSearchedTopics: mostSearchedTopicsFormatted,
    });
  } catch (error: any) {
    console.error("❌ Analytics error:", error);
    return NextResponse.json(
      {
        error: error.message,
        kpis: {
          totalQueries: { value: 0, change: 0, trend: "up" },
          successRate: { value: "0.0", change: 0, trend: "up" },
          avgResponseTime: { value: 0, change: 0, trend: "down" },
          documentsAccessed: { value: 0, change: 0, trend: "up" },
        },
        queryActivity: [],
        responseTimeData: [],
        mostAccessedDocs: [],
        mostSearchedTopics: [],
      },
      { status: 500 }
    );
  }
}
