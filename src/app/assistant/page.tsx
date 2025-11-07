"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { TopNav } from "../../components/layout/top-nav";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { MessageActions } from "../../components/message-actions";
import { Send, Loader2, Bot, User, FileText, Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent?: string;
  sources?: string[];
  timestamp: Date;
}

interface Document {
  _id: string;
  fileName: string;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const generateCacheKey = (query: string, selectedFile: string) => {
    return `chat_${selectedFile}_${query
      .toLowerCase()
      .replace(/\s+/g, "_")}`.slice(0, 100);
  };

  const getCachedResponse = (
    query: string,
    selectedFile: string
  ): Message | null => {
    const cacheKey = generateCacheKey(query, selectedFile);
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      console.log("[v0] Cache HIT for:", query);
      const cachedData = JSON.parse(cached);
      return {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: cachedData.answer,
        agent: cachedData.agent,
        sources: cachedData.sources,
        timestamp: new Date(),
      };
    }
    return null;
  };

  const cacheResponse = (query: string, selectedFile: string, data: any) => {
    const cacheKey = generateCacheKey(query, selectedFile);
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    console.log("[v0] Cached response for:", query);
  };

  useEffect(() => {
    console.log("Assistant page mounted");
    fetchDocuments();
    loadChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchDocuments = async () => {
    try {
      console.log("Fetching documents from /api/upload...");
      const response = await fetch("/api/upload");
      console.log("Documents fetch response status:", response.status);

      if (!response.ok) {
        console.error("Failed to fetch documents");
        return;
      }
      const data = await response.json();
      console.log(
        "Fetched documents:",
        data.documents?.length || 0,
        "documents"
      );
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  const loadChatHistory = async () => {
    try {
      console.log("Loading chat history from /api/chat...");
      const response = await fetch("/api/chat?userEmail=anonymous", {
        headers: {
          "Cache-Control": "max-age=3600",
        },
      });
      console.log("Chat history response status:", response.status);

      if (!response.ok) {
        console.log("No chat history found or error loading history");
        return;
      }

      const data = await response.json();
      console.log("Chat history data:", data);

      if (data.history && data.history.length > 0) {
        console.log("Loading", data.history.length, "chat messages");
        const formattedHistory = data.history
          .flatMap((chat: any) => [
            {
              id: `${chat.id}-q`,
              role: "user" as const,
              content: chat.question,
              timestamp: new Date(chat.timestamp),
            },
            {
              id: `${chat.id}-a`,
              role: "assistant" as const,
              content: chat.answer,
              agent: chat.agent,
              sources: chat.sources,
              timestamp: new Date(chat.timestamp),
            },
          ])
          .reverse();

        setMessages(formattedHistory);
        console.log("Chat history loaded successfully");
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  };

  const handleMessageFeedback = async (
    messageId: string,
    type: "helpful" | "not-helpful"
  ) => {
    try {
      console.log(`Message ${messageId} marked as ${type}`);
      // TODO: Send feedback to backend for analytics
    } catch (error) {
      console.error("Error saving feedback:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("=== Form submitted ===");

    if (!input.trim() || isLoading) {
      console.log("Input empty or already loading, skipping");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    console.log("Adding user message:", userMessage);
    setMessages((prev) => [...prev, userMessage]);

    const currentInput = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      const cachedResponse = getCachedResponse(currentInput, selectedFile);
      if (cachedResponse) {
        console.log("[v0] Using cached response");
        setMessages((prev) => [...prev, cachedResponse]);
        setIsLoading(false);
        return;
      }

      const requestBody = {
        query: currentInput,
        selectedFile: selectedFile === "all" ? undefined : selectedFile,
        userEmail: "anonymous",
      };

      console.log("Sending POST request to /api/chat");
      console.log("Request body:", requestBody);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Response received");
      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response not OK. Status:", response.status);
        console.error("Error response:", errorText);

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }

        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Response data:", data);

      cacheResponse(currentInput, selectedFile, data);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        agent: data.agent,
        sources: data.sources,
        timestamp: new Date(),
      };

      console.log("Adding assistant message:", assistantMessage);
      setMessages((prev) => [...prev, assistantMessage]);
      console.log("=== Request completed successfully ===");
    } catch (error: any) {
      console.error("=== Chat error ===");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Full error:", error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Sorry, I encountered an error: ${error.message}. Please check the console for details.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      console.log("=== Request flow completed ===");
    }
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
      <Badge className={`${colors[agent] || colors.common} border-0 text-xs`}>
        {icons[agent] || icons.common}{" "}
        {agent.charAt(0).toUpperCase() + agent.slice(1)} Agent
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-blue-500" />
            AI Assistant
          </h1>
          <p className="text-muted-foreground mt-1">
            Ask questions about your documents and get intelligent answers
          </p>
        </div>

        {/* Document Selector */}
        <Card className="mb-6 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-medium">Search in:</label>
            <Select value={selectedFile} onValueChange={setSelectedFile}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select document" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                {documents.map((doc) => (
                  <SelectItem key={doc._id} value={doc.fileName}>
                    {doc.fileName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="ml-auto">
              <FileText className="w-3 h-3 mr-1" />
              {documents.length} documents available
            </Badge>
          </div>
        </Card>

        {/* Chat Container */}
        <Card className="h-[600px] flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Bot className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Start a conversation
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Ask me anything about your uploaded documents. I'll use the
                  appropriate specialized agent to help you.
                </p>
                <div className="mt-6 space-y-2 text-left">
                  <p className="text-xs text-muted-foreground">Try asking:</p>
                  <div className="space-y-1">
                    <p className="text-xs bg-muted px-3 py-2 rounded">
                      ⚙️ What are the safety procedures?
                    </p>
                    <p className="text-xs bg-muted px-3 py-2 rounded">
                      🤝 How do I submit a support ticket?
                    </p>
                    <p className="text-xs bg-muted px-3 py-2 rounded">
                      💬 What is the company policy?
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 w-full ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}

                    <div
                      className={`flex flex-col gap-2 ${
                        message.role === "user" ? "items-end" : "items-start"
                      } flex-1 max-w-[80%]`}
                    >
                      <div
                        className={`w-full ${
                          message.role === "user"
                            ? "bg-blue-500 text-white"
                            : "bg-muted"
                        } rounded-lg p-4`}
                      >
                        {message.role === "assistant" && message.agent && (
                          <div className="mb-2">
                            {getAgentBadge(message.agent)}
                          </div>
                        )}

                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>

                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border">
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
                      </div>

                      {message.role === "assistant" && (
                        <MessageActions
                          content={message.content}
                          messageId={message.id}
                          onFeedback={handleMessageFeedback}
                        />
                      )}
                    </div>

                    {message.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about your documents..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2">
              Powered by multi-agent AI system with specialized technical,
              customer, and general agents
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
