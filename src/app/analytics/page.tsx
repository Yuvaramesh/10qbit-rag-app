"use client";

import { TopNav } from "../../components/layout/top-nav";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Download } from "lucide-react";
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

const queryActivityData = [
  { name: "Mon", value: 240 },
  { name: "Tue", value: 290 },
  { name: "Wed", value: 280 },
  { name: "Thu", value: 350 },
  { name: "Fri", value: 320 },
  { name: "Sat", value: 180 },
  { name: "Sun", value: 160 },
];

const responseTimeData = [
  { time: "00:00", value: 1.8 },
  { time: "04:00", value: 1.5 },
  { time: "08:00", value: 1.9 },
  { time: "12:00", value: 2.1 },
  { time: "16:00", value: 2.3 },
  { time: "20:00", value: 1.6 },
];

const mostAccessedDocs = [
  { name: "HR_Policies_v3.pdf", percentage: 98 },
  { name: "Finance_SOP_v2.pdf", percentage: 95 },
  { name: "IT_Security_SOP_v2.docx", percentage: 92 },
  { name: "Operations_Manual_v1.pdf", percentage: 88 },
  { name: "Customer_Support_Guide.pdf", percentage: 74 },
];

const mostSearchedTopics = [
  { topic: "Expense Reimbursement", count: 342 },
  { topic: "Leave Policies", count: 289 },
  { topic: "Security Protocols", count: 234 },
  { topic: "Onboarding Process", count: 198 },
  { topic: "Vendor Management", count: 176 },
];

export default function AnalyticsPage() {
  const colors = ["#3b82f6", "#06b6d4", "#8b5cf6", "#ec4899", "#f59e0b"];

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
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-2">
              Total Queries
            </div>
            <div className="text-3xl font-bold">12,847</div>
            <div className="text-xs text-green-600 mt-2">
              ↑ 12% vs last week
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-2">
              Success Rate
            </div>
            <div className="text-3xl font-bold">94.2%</div>
            <div className="text-xs text-green-600 mt-2">
              ↑ 2.3% improvement
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-2">
              Avg Response Time
            </div>
            <div className="text-3xl font-bold">1.8s</div>
            <div className="text-xs text-green-600 mt-2">↓ 0.2s faster</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-2">
              Documents Accessed
            </div>
            <div className="text-3xl font-bold">847</div>
            <div className="text-xs text-green-600 mt-2">↑ 8% vs last week</div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Query Activity */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Query Activity</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Queries per day over the last week
            </p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={queryActivityData}>
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
              <LineChart data={responseTimeData}>
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
        <div className="grid grid-cols-2 gap-6">
          {/* Most Accessed Documents */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Most Accessed Documents</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Top 5 documents by query volume
            </p>
            <div className="space-y-4">
              {mostAccessedDocs.map((doc, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <span className="text-sm font-medium">{doc.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {doc.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${doc.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Most Searched Topics */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Most Searched Topics</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Popular search terms and topics
            </p>
            <div className="space-y-3">
              {mostSearchedTopics.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </div>
                    <span className="text-sm font-medium">{item.topic}</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
