"use client";

import { useState, useEffect } from "react";
import { TopNav } from "../../components/layout/top-nav";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Download, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface KPI {
  value: number | string;
  change: number;
  trend: "up" | "down";
}

interface AnalyticsData {
  kpis: {
    totalQueries: KPI;
    successRate: KPI;
    avgResponseTime: KPI;
    documentsAccessed: KPI;
  };
  queryActivity: { name: string; value: number }[];
  responseTimeData: { time: string; value: number }[];
  mostAccessedDocs: { name: string; percentage: number; count: number }[];
  mostSearchedTopics: { topic: string; count: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/analytics");

      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err: any) {
      console.error("Error fetching analytics:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = () => {
    if (!data) return;

    const reportData = {
      generatedAt: new Date().toISOString(),
      ...data,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics-report-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getTrendIcon = (trend: "up" | "down") => {
    return trend === "up" ? (
      <TrendingUp className="w-3 h-3" />
    ) : (
      <TrendingDown className="w-3 h-3" />
    );
  };

  const getTrendColor = (trend: "up" | "down", inverse: boolean = false) => {
    const isPositive = inverse ? trend === "down" : trend === "up";
    return isPositive ? "text-green-600" : "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex items-center justify-center h-[calc(100vh-73px)]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex items-center justify-center h-[calc(100vh-73px)]">
          <div className="text-center">
            <p className="text-red-600 mb-4">
              {error || "Failed to load analytics"}
            </p>
            <Button onClick={fetchAnalytics}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <div className="p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Monitor query performance and usage insights
            </p>
          </div>
          <Button variant="outline" onClick={downloadReport}>
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-2">
              Total Queries
            </div>
            <div className="text-3xl font-bold">
              {data.kpis.totalQueries.value.toLocaleString()}
            </div>
            <div
              className={`text-xs mt-2 flex items-center gap-1 ${getTrendColor(
                data.kpis.totalQueries.trend
              )}`}
            >
              {getTrendIcon(data.kpis.totalQueries.trend)}
              {Math.abs(data.kpis.totalQueries.change)}% vs last week
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-2">
              Success Rate
            </div>
            <div className="text-3xl font-bold">
              {data.kpis.successRate.value}%
            </div>
            <div
              className={`text-xs mt-2 flex items-center gap-1 ${getTrendColor(
                data.kpis.successRate.trend
              )}`}
            >
              {getTrendIcon(data.kpis.successRate.trend)}
              {Math.abs(data.kpis.successRate.change)}% improvement
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-2">
              Avg Response Time
            </div>
            <div className="text-3xl font-bold">
              {data.kpis.avgResponseTime.value}s
            </div>
            <div
              className={`text-xs mt-2 flex items-center gap-1 ${getTrendColor(
                data.kpis.avgResponseTime.trend,
                true
              )}`}
            >
              {getTrendIcon(data.kpis.avgResponseTime.trend)}
              {Math.abs(data.kpis.avgResponseTime.change)}s faster
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-2">
              Documents Accessed
            </div>
            <div className="text-3xl font-bold">
              {data.kpis.documentsAccessed.value.toLocaleString()}
            </div>
            <div
              className={`text-xs mt-2 flex items-center gap-1 ${getTrendColor(
                data.kpis.documentsAccessed.trend
              )}`}
            >
              {getTrendIcon(data.kpis.documentsAccessed.trend)}
              {Math.abs(data.kpis.documentsAccessed.change)}% vs last week
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Query Activity */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Query Activity</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Queries per day over the last week
            </p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.queryActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Response Time Trend */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Response Time Trend</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Average response time throughout the day
            </p>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Most Accessed & Searched */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Accessed Documents */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Most Accessed Documents</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Top 5 documents by query volume
            </p>
            <div className="space-y-4">
              {data.mostAccessedDocs.length > 0 ? (
                data.mostAccessedDocs.map((doc, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                          {idx + 1}
                        </div>
                        <span className="text-sm font-medium truncate">
                          {doc.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {doc.count} queries
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {doc.percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${doc.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No document access data available yet
                </p>
              )}
            </div>
          </Card>

          {/* Most Searched Topics */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Most Searched Topics</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Popular search terms and topics
            </p>
            <div className="space-y-3">
              {data.mostSearchedTopics.length > 0 ? (
                data.mostSearchedTopics.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <span className="text-sm font-medium">{item.topic}</span>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-0">
                      {item.count}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No search topic data available yet
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
