"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { Badge } from "../components/ui/badge";
import { Clock, Send, Loader2, FileText, Menu, X } from "lucide-react";
import { TopNav } from "../components/layout/top-nav";

interface Message {
  id: string;
  type: "ai" | "user";
  content: string;
  timestamp: string;
  sources?: Array<{ name: string; page?: number }>;
}

interface CachedResponse {
  answer: string;
  agent: string;
  sources: Array<{ name: string; page?: number }>;
  timestamp: number;
}

interface ChatHistoryItem {
  id: string;
  question: string;
  timestamp: string;
}

const SESSION_MESSAGES_KEY = "chat_messages_session";
const SHARED_CACHE_KEY = "shared_cache";
const SESSION_HISTORY_KEY = "chat_history_session";

const MessageActions = ({ content, messageId, onFeedback }: any) => {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<
    "helpful" | "not-helpful" | null
  >(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleFeedback = (type: "helpful" | "not-helpful") => {
    setFeedbackGiven(type);
    onFeedback(messageId, type);
  };

  return (
    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
      <div className="flex gap-3">
        <button
          onClick={() => handleFeedback("helpful")}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            feedbackGiven === "helpful"
              ? "text-green-600 font-medium"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="text-base">👍</span>
          <span>Helpful</span>
        </button>
        <button
          onClick={() => handleFeedback("not-helpful")}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            feedbackGiven === "not-helpful"
              ? "text-red-600 font-medium"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="text-base">👎</span>
          <span>Not Helpful</span>
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
            copied
              ? "bg-blue-100 text-blue-700 font-medium"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <span className="text-sm">📋</span>
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
        <button
          onClick={handleSave}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
            saved
              ? "bg-orange-100 text-orange-700 font-medium"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <span className="text-sm">🔖</span>
          <span>{saved ? "Saved" : "Save"}</span>
        </button>
      </div>
    </div>
  );
};

const Page = () => {
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
  const [showCommonQuestions, setShowCommonQuestions] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [responseCache, setResponseCache] = useState<
    Map<string, CachedResponse>
  >(new Map());
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadInitialData = () => {
      // Load messages from sessionStorage
      const savedMessages = sessionStorage.getItem(SESSION_MESSAGES_KEY);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          console.log("[v0] Restored", parsed.length, "messages from session");
          setMessages(parsed);
          setShowCommonQuestions(parsed.length <= 1);
        } catch (error) {
          console.error("[v0] Failed to parse saved messages:", error);
        }
      }

      // Load shared cache from localStorage
      try {
        const cachedData = localStorage.getItem(SHARED_CACHE_KEY);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          const cacheMap = new Map<string, CachedResponse>(
            Object.entries(parsed) as [string, CachedResponse][]
          );
          console.log(
            "[v0] Restored",
            cacheMap.size,
            "cache entries from localStorage"
          );
          setResponseCache(cacheMap);
        }
      } catch (error) {
        console.error("[v0] Failed to load shared cache:", error);
      }

      // Load history from sessionStorage
      const savedHistory = sessionStorage.getItem(SESSION_HISTORY_KEY);
      if (savedHistory) {
        try {
          const parsed = JSON.parse(savedHistory);
          console.log(
            "[v0] Restored",
            parsed.length,
            "history items from session"
          );
          setChatHistory(parsed);
        } catch (error) {
          console.error("[v0] Failed to parse saved history:", error);
        }
      }

      setIsInitialized(true);
      inputRef.current?.focus();
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (isInitialized && messages.length > 0) {
      sessionStorage.setItem(SESSION_MESSAGES_KEY, JSON.stringify(messages));
      console.log("[v0] Saved", messages.length, "messages to session");
    }
  }, [messages, isInitialized]);

  useEffect(() => {
    if (isInitialized && responseCache.size > 0) {
      try {
        const cacheObj = Object.fromEntries(responseCache);
        localStorage.setItem(SHARED_CACHE_KEY, JSON.stringify(cacheObj));
        console.log(
          "[v0] Saved",
          responseCache.size,
          "cache entries to localStorage"
        );
      } catch (error) {
        console.error("[v0] Failed to save cache:", error);
      }
    }
  }, [responseCache, isInitialized]);

  useEffect(() => {
    if (isInitialized && chatHistory.length > 0) {
      sessionStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(chatHistory));
      console.log("[v0] Saved", chatHistory.length, "history items to session");
    }
  }, [chatHistory, isInitialized]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addToHistory = (question: string) => {
    const historyItem: ChatHistoryItem = {
      id: Date.now().toString(),
      question: question,
      timestamp: new Date().toISOString(),
    };
    setChatHistory((prev) => [historyItem, ...prev]);
  };

  const checkCache = (query: string): CachedResponse | null => {
    const normalizedQuery = query.toLowerCase().trim();
    const cached = responseCache.get(normalizedQuery);

    if (cached) {
      const now = Date.now();
      const cacheAge = now - cached.timestamp;
      const maxAge = 24 * 60 * 60 * 1000;

      if (cacheAge < maxAge) {
        console.log("[v0] Cache HIT for query:", query);
        return cached;
      } else {
        console.log("[v0] Cache expired for query:", query);
        const newCache = new Map(responseCache);
        newCache.delete(normalizedQuery);
        setResponseCache(newCache);
      }
    }

    console.log("[v0] Cache MISS for query:", query);
    return null;
  };

  const updateCache = (query: string, response: CachedResponse) => {
    const normalizedQuery = query.toLowerCase().trim();
    const newCache = new Map(responseCache);
    newCache.set(normalizedQuery, response);
    setResponseCache(newCache);
    console.log("[v0] Cache updated for query:", query);
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const removeVerbatimExtract = (text: string): string => {
    let cleaned = text.replace(/^Verbatim extract[:\s-]*/i, "");
    cleaned = cleaned.replace(/^Document:\s*[^\n]+\n*/i, "");
    cleaned = cleaned.replace(/^[-\s]+/, "");
    return cleaned.trim();
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const currentTime = getCurrentTime();
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input.trim(),
      timestamp: currentTime,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input.trim();

    // Add to history
    addToHistory(currentInput);

    setInput("");
    setIsLoading(true);
    setShowCommonQuestions(false);

    try {
      console.log("\n[v0] ===== QUERY PROCESSING =====");
      console.log("[v0] Query:", currentInput);

      const cachedResponse = checkCache(currentInput);

      if (cachedResponse) {
        console.log("[v0] Using CACHED response");
        const cleanedAnswer = removeVerbatimExtract(cachedResponse.answer);
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "ai",
          content: cleanedAnswer,
          timestamp: getCurrentTime(),
          sources: cachedResponse.sources,
        };
        setMessages((prev) => [...prev, aiMessage]);
        return;
      }

      console.log("[v0] Cache miss - calling Multi-Agent LLM...");

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
      console.log("[v0] LLM response received");

      const answerText =
        responseData.answer ||
        "I couldn't generate a proper response. Please try again.";
      const agentType = responseData.agent || "common";

      const sources = (responseData.sources || []).map((source: any) => {
        if (typeof source === "string") {
          const pageMatch = source.match(/[Pp]age\s*(\d+)/i);
          const docName = source
            .replace(/\s*[,;]?\s*[Pp]age\s*\d+/i, "")
            .trim();
          return {
            name: docName || source,
            page: pageMatch ? Number.parseInt(pageMatch[1]) : undefined,
          };
        }
        return source;
      });

      const cleanedAnswer = removeVerbatimExtract(answerText);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: cleanedAnswer,
        timestamp: getCurrentTime(),
        sources: sources,
      };

      setMessages((prev) => [...prev, aiMessage]);

      updateCache(currentInput, {
        answer: cleanedAnswer,
        agent: agentType,
        sources: sources,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error("[v0] Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: getCurrentTime(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleQueryClick = (query: string) => {
    setInput(query);
    inputRef.current?.focus();
  };

  const handleFeedback = (
    messageId: string,
    type: "helpful" | "not-helpful"
  ) => {
    console.log(`[v0] Feedback: ${type} for message ${messageId}`);
  };

  const handleClearChat = () => {
    if (confirm("Clear current chat? This will start a new conversation.")) {
      sessionStorage.removeItem(SESSION_MESSAGES_KEY);
      sessionStorage.removeItem(SESSION_HISTORY_KEY);

      setMessages([
        {
          id: "1",
          type: "ai",
          content:
            "Hello! I'm your AI SOP Assistant. Ask me anything about your organization's standard operating procedures, and I'll provide accurate answers based on your documentation.",
          timestamp: "Just now",
        },
      ]);

      setChatHistory([]);
      setShowCommonQuestions(true);

      console.log("[v0] Chat cleared (cache preserved)");
    }
  };

  const getTopCachedQuestions = () => {
    const cacheEntries = Array.from(responseCache.entries());
    cacheEntries.sort((a, b) => b[1].timestamp - a[1].timestamp);
    return cacheEntries.slice(0, 3).map(([question]) => question);
  };

  const cachedQuestions = getTopCachedQuestions();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation - Using imported component */}
      <TopNav />

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-72 border-r border-gray-200 bg-white p-4">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Chat History
                </h3>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <Button
                onClick={handleClearChat}
                variant="outline"
                size="sm"
                className="w-full mb-4"
              >
                Clear Current Chat
              </Button>

              <ScrollArea className="h-[calc(100vh-250px)]">
                <div className="space-y-2">
                  {chatHistory.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-8">
                      No chat history yet
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-gray-500 mb-2">
                        {chatHistory.length}{" "}
                        {chatHistory.length === 1 ? "query" : "queries"}
                      </p>
                      {chatHistory.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleQueryClick(item.question)}
                          className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                        >
                          <div className="flex items-start gap-2">
                            <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-700 truncate group-hover:text-blue-600">
                                {item.question}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(item.timestamp).toLocaleString()}
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
            <div className="border-b border-gray-200 bg-white p-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          )}

          <ScrollArea className="flex-1 p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Top 3 Cached Questions - Always show when available */}
              {cachedQuestions.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-600">
                    Top Cached Questions:
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {cachedQuestions.map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setInput(question);
                          inputRef.current?.focus();
                        }}
                        className="text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Default Questions - Show only when no cache and initial message */}
              {showCommonQuestions &&
                messages.length === 1 &&
                cachedQuestions.length === 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-600">
                      Try asking about:
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        onClick={() => {
                          setInput("What is Vertex Eval Service?");
                          inputRef.current?.focus();
                        }}
                        className="text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
                      >
                        What is Vertex Eval Service?
                      </button>
                      <button
                        onClick={() => {
                          setInput("How does RAG work?");
                          inputRef.current?.focus();
                        }}
                        className="text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
                      >
                        How does RAG work?
                      </button>
                      <button
                        onClick={() => {
                          setInput("What are the deployment procedures?");
                          inputRef.current?.focus();
                        }}
                        className="text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
                      >
                        What are the deployment procedures?
                      </button>
                    </div>
                  </div>
                )}

              {/* Messages */}
              {messages.map((message) => (
                <div key={message.id} className="space-y-3">
                  {message.type === "ai" ? (
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-800 to-green-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        AI
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold mb-2">
                          AI Assistant
                        </div>
                        <Card className="p-4 bg-white border-gray-200">
                          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </Card>

                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium mb-2 text-gray-600">
                              Sources:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {message.sources.map((source, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  <FileText className="w-3 h-3 mr-1" />
                                  {typeof source === "string"
                                    ? source
                                    : `${source.name}${
                                        source.page
                                          ? `, Page ${source.page}`
                                          : ""
                                      }`}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <MessageActions
                          content={message.content}
                          messageId={message.id}
                          onFeedback={handleFeedback}
                        />

                        <p className="text-xs text-gray-500 mt-2">
                          {message.timestamp}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <div className="max-w-2xl">
                        <div className="bg-green-800 text-white rounded-lg p-4">
                          <p className="text-sm">{message.content}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-right">
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
                    <Card className="p-4 bg-white border-gray-200">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                    </Card>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-gray-200 bg-white p-6">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-3">
                <Input
                  ref={inputRef}
                  placeholder="Ask anything from your SOPs..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  className="bg-green-800 hover:bg-green-800 text-white"
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
              <p className="text-xs text-gray-500 mt-2">
                ⚡ Intelligent caching with multi-agent LLM
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
