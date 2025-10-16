"use client";

import { useState } from "react";
import { TopNav } from "../components/layout/top-nav";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Clock,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Bookmark,
  Send,
} from "lucide-react";

interface QueryItem {
  id: string;
  title: string;
  time: string;
}

interface Message {
  id: string;
  type: "ai" | "user";
  content: string;
  timestamp: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content:
        "Hello! I'm your AI SOP Assistant. Ask me anything about your organization's standard operating procedures, and I'll provide accurate answers based on your documentation.",
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");

  const queryHistory: QueryItem[] = [
    { id: "1", title: "Vendor onboarding protocol", time: "2m ago" },
    { id: "2", title: "Reimbursement request process", time: "15m ago" },
    { id: "3", title: "Customer escalation steps", time: "1h ago" },
    { id: "4", title: "Security incident reporting", time: "3h ago" },
    { id: "5", title: "Employee offboarding checklist", time: "5h ago" },
  ];

  const handleSendMessage = () => {
    if (input.trim()) {
      setMessages([
        ...messages,
        {
          id: Date.now().toString(),
          type: "user",
          content: input,
          timestamp: "Just now",
        },
      ]);
      setInput("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <div className="w-72 border-r border-border bg-background p-4">
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Query History
            </h3>
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-2">
                {queryHistory.map((item) => (
                  <button
                    key={item.id}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-blue-600">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.time}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="space-y-3">
                  {message.type === "ai" ? (
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        AI
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold mb-2">
                          AI Assistant
                        </div>
                        <Card className="p-4 bg-card">
                          <p className="text-sm text-card-foreground leading-relaxed">
                            {message.content}
                          </p>
                        </Card>
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                          >
                            <ThumbsUp className="w-4 h-4 mr-1" />
                            Helpful
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                          >
                            <ThumbsDown className="w-4 h-4 mr-1" />
                            Not Helpful
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                          >
                            <Bookmark className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {message.timestamp}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <div className="max-w-2xl">
                        <div className="bg-blue-500 text-white rounded-lg p-4">
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-border bg-background p-6">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-3">
                <Input
                  placeholder="Ask anything from your SOPs... e.g., What's the protocol for vendor onboarding?"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                AI responses are generated from your indexed documents. Always
                verify critical information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
