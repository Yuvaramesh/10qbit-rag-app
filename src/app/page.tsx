"use client";

import { useState, useEffect, useRef } from "react";
import { TopNav } from "../components/layout/top-nav";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { Badge } from "../components/ui/badge";
import {
  Clock,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Bookmark,
  Send,
  Loader2,
  FileText,
} from "lucide-react";

interface Message {
  id: string;
  type: "ai" | "user";
  content: string;
  timestamp: string;
  agent?: string;
  sources?: string[];
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
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadChatHistory = async () => {
    try {
      const response = await fetch("/api/chat?userEmail=anonymous");
      if (!response.ok) return;

      const data = await response.json();
      if (data.history && data.history.length > 0) {
        setChatHistory(data.history.slice(0, 5)); // Last 5 queries
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input.trim(),
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      console.log("Sending chat request...");
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: currentInput,
          userEmail: "anonymous",
        }),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      const data = await response.json();
      console.log("Response data:", data);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: data.answer,
        timestamp: "Just now",
        agent: data.agent,
        sources: data.sources,
      };

      setMessages((prev) => [...prev, aiMessage]);
      loadChatHistory(); // Refresh history
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: "Just now",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryClick = (query: string) => {
    setInput(query);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const getAgentBadge = (agent?: string) => {
    if (!agent) return null;

    const colors: Record<string, string> = {
      technical:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      customer:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      common: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    };

    const icons: Record<string, string> = {
      technical: "⚙️",
      customer: "🤝",
      common: "💬",
    };

    return (
      <Badge
        className={`${colors[agent] || colors.common} border-0 text-xs mb-2`}
      >
        {icons[agent] || icons.common}{" "}
        {agent.charAt(0).toUpperCase() + agent.slice(1)} Agent
      </Badge>
    );
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
                {chatHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No history yet
                  </p>
                ) : (
                  chatHistory.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleQueryClick(item.question)}
                      className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-blue-600">
                            {item.question}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
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
                        {message.agent && getAgentBadge(message.agent)}
                        <Card className="p-4 bg-card">
                          <p className="text-sm text-card-foreground leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </Card>

                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium mb-2">Sources:</p>
                            <div className="flex flex-wrap gap-1">
                              {message.sources.map((source, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  <FileText className="w-3 h-3 mr-1" />
                                  {source}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

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
                            onClick={() => copyToClipboard(message.content)}
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
                        <p className="text-xs text-muted-foreground mt-2 text-right">
                          {message.timestamp}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    AI
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold mb-2">
                      AI Assistant
                    </div>
                    <Card className="p-4 bg-card">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </Card>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
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
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  size="icon"
                  disabled={isLoading || !input.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                AI responses are generated from your indexed documents. Powered
                by multi-agent system with specialized technical, customer, and
                general agents.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
