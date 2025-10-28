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
  Menu,
} from "lucide-react";

interface Message {
  id: string;
  type: "ai" | "user";
  content: string;
  timestamp: string;
  agent?: string;
  sources?: string[];
}

interface CachedResponse {
  answer: string;
  agent: string;
  sources: string[];
  timestamp: number;
}

const COMMON_QUESTIONS = ["What Vertex Eval Service?", "How does Rag Works?"];

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
  const [showCommonQuestions, setShowCommonQuestions] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // In-memory cache for this session
  const [responseCache, setResponseCache] = useState<
    Map<string, CachedResponse>
  >(new Map());

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ✅ New: Ref for input box
  const inputRef = useRef<HTMLInputElement>(null);

  // ✅ Focus input when component loads
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadChatHistory = async () => {
    try {
      console.log("📚 Loading chat history from MongoDB...");
      const response = await fetch("/api/chat?userEmail=anonymous");
      if (!response.ok) {
        console.log("❌ Failed to fetch chat history");
        return;
      }

      const data = await response.json();

      if (data.history && data.history.length > 0) {
        console.log(`📊 Loaded ${data.history.length} chat history items`);
        setChatHistory(data.history.slice(0, 10));

        // Pre-populate in-memory cache
        const cache = new Map<string, CachedResponse>();
        data.history.forEach((item: any) => {
          const normalizedQuery = item.question.toLowerCase().trim();
          cache.set(normalizedQuery, {
            answer: item.answer,
            agent: item.agent || "common",
            sources: item.sources || [],
            timestamp: new Date(item.timestamp).getTime(),
          });
        });
        setResponseCache(cache);
        console.log(`💾 Cache populated with ${cache.size} entries`);
      }
    } catch (error) {
      console.error("❌ Error loading chat history:", error);
    }
  };

  useEffect(() => {
    loadChatHistory();
  }, []);

  // Check in-memory cache only
  const checkCache = (query: string): CachedResponse | null => {
    const normalizedQuery = query.toLowerCase().trim();
    const cached = responseCache.get(normalizedQuery);

    if (cached) {
      const now = Date.now();
      const cacheAge = now - cached.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (cacheAge < maxAge) {
        console.log("⚡ Cache HIT for query:", query);
        return cached;
      } else {
        console.log("🕐 Cache expired for query:", query);
        const newCache = new Map(responseCache);
        newCache.delete(normalizedQuery);
        setResponseCache(newCache);
      }
    }

    console.log("❌ Cache MISS for query:", query);
    return null;
  };

  const updateCache = (query: string, response: CachedResponse) => {
    const normalizedQuery = query.toLowerCase().trim();
    const newCache = new Map(responseCache);
    newCache.set(normalizedQuery, response);
    setResponseCache(newCache);
    console.log("💾 Cache updated for query:", query);
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
    setShowCommonQuestions(false);

    try {
      console.log("\n🔍 ===== QUERY PROCESSING =====");
      console.log("Query:", currentInput);

      // Step 1: Check in-memory cache
      const cachedResponse = checkCache(currentInput);

      if (cachedResponse) {
        console.log("✅ Using CACHED response");
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "ai",
          content: cachedResponse.answer,
          timestamp: "Just now",
          agent: "cached",
          sources: cachedResponse.sources,
        };
        setMessages((prev) => [...prev, aiMessage]);
        return;
      }

      // Step 2: No cache - call Multi-Agent LLM
      console.log("🤖 Cache miss - calling Multi-Agent LLM...");

      const apiResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: currentInput,
          userEmail: "anonymous",
        }),
      });

      if (!apiResponse.ok) throw new Error("API request failed");

      const responseData = await apiResponse.json();
      console.log("✅ LLM response received");

      const answerText =
        responseData.answer ||
        "I couldn't generate a proper response. Please try again.";
      const agentType = responseData.agent || "common";
      const sources = responseData.sources || [];

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: answerText,
        timestamp: "Just now",
        agent: agentType,
        sources: sources,
      };

      setMessages((prev) => [...prev, aiMessage]);

      updateCache(currentInput, {
        answer: answerText,
        agent: agentType,
        sources: sources,
        timestamp: Date.now(),
      });

      await loadChatHistory();
    } catch (error: any) {
      console.error("❌ Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: "Just now",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus(); // ✅ Re-focus after sending
    }
  };

  const handleQueryClick = (query: string) => {
    setInput(query);
    inputRef.current?.focus(); // ✅ Focus again when a query is clicked
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getAgentBadge = (agent?: string) => {
    if (!agent) return null;

    const agentConfig: Record<
      string,
      { color: string; icon: string; label: string }
    > = {
      technical: {
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        icon: "⚙️",
        label: "Technical Agent",
      },
      customer: {
        color:
          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        icon: "🤝",
        label: "Customer Agent",
      },
      common: {
        color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
        icon: "💬",
        label: "Common Agent",
      },
      cached: {
        color:
          "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
        icon: "⚡",
        label: "Cached",
      },
    };

    const config = agentConfig[agent] || agentConfig.common;

    return (
      <Badge className={`${config.color} border-0 text-xs mb-2`}>
        {config.icon} {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-72 border-r border-border bg-background p-4">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Query History
                </h3>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  <Menu className="w-4 h-4" />
                </button>
              </div>
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-2">
                  {chatHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No history yet
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground mb-2">
                        {chatHistory.length} queries
                      </p>
                      {chatHistory.map((item) => (
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
                      ))}
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {!sidebarOpen && (
            <div className="border-b border-border bg-background p-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          )}

          <ScrollArea className="flex-1 p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {showCommonQuestions && messages.length === 1 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Common Questions:
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {COMMON_QUESTIONS.map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setInput(question);
                          inputRef.current?.focus(); // ✅ focus when selecting
                        }}
                        className="text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                  ref={inputRef} // ✅ attach ref
                  placeholder="Ask anything from your SOPs..."
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
                ⚡ Intelligent caching with multi-agent LLM
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
