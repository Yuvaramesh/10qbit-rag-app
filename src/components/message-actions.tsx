"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Copy, Bookmark } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "../hooks/use-toast";

interface MessageActionsProps {
  content: string;
  messageId: string;
  onFeedback?: (messageId: string, type: "helpful" | "not-helpful") => void;
}

export function MessageActions({
  content,
  messageId,
  onFeedback,
}: MessageActionsProps) {
  const [isHelpful, setIsHelpful] = useState<boolean | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      console.log("[v0] Text copied to clipboard");
      toast({
        title: "Copied",
        description: "Response copied to clipboard",
        duration: 2000,
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("[v0] Copy failed:", error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleHelpful = () => {
    const newValue = isHelpful === true ? null : true;
    setIsHelpful(newValue);
    console.log("[v0] Marked as helpful");

    if (onFeedback && newValue !== null) {
      onFeedback(messageId, "helpful");
    }

    toast({
      title: "Thanks for feedback",
      description: "Your feedback helps us improve",
      duration: 2000,
    });
  };

  const handleNotHelpful = () => {
    const newValue = isHelpful === false ? null : false;
    setIsHelpful(newValue);
    console.log("[v0] Marked as not helpful");

    if (onFeedback && newValue !== null) {
      onFeedback(messageId, "not-helpful");
    }

    toast({
      title: "Thanks for feedback",
      description: "We'll use this to improve responses",
      duration: 2000,
    });
  };

  const handleSave = () => {
    const newSavedState = !isSaved;
    setIsSaved(newSavedState);
    console.log(`[v0] Message ${newSavedState ? "saved" : "unsaved"}`);

    const message = newSavedState ? "Saved for later" : "Removed from saved";
    toast({
      title: "Success",
      description: message,
      duration: 2000,
    });

    try {
      const savedMessages = JSON.parse(
        localStorage.getItem("savedMessages") || "[]"
      );
      if (newSavedState) {
        // Check if message already exists
        const exists = savedMessages.some(
          (msg: any) => msg.messageId === messageId
        );
        if (!exists) {
          savedMessages.push({
            messageId,
            content,
            savedAt: new Date().toISOString(),
          });
        }
        localStorage.setItem("savedMessages", JSON.stringify(savedMessages));
      } else {
        const filtered = savedMessages.filter(
          (msg: any) => msg.messageId !== messageId
        );
        localStorage.setItem("savedMessages", JSON.stringify(filtered));
      }
    } catch (error) {
      console.error("[v0] Error saving message:", error);
      toast({
        title: "Error",
        description: "Failed to save message",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex gap-2 items-center mt-3 pt-3 border-t border-border w-full">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleHelpful}
        className={`flex items-center gap-1 h-8 px-3 py-1 rounded transition-all duration-200 cursor-pointer ${
          isHelpful === true
            ? "bg-green-100 text-green-700 hover:bg-green-200"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        <ThumbsUp className="w-4 h-4" />
        <span className="text-xs font-medium">Helpful</span>
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleNotHelpful}
        className={`flex items-center gap-1 h-8 px-3 py-1 rounded transition-all duration-200 cursor-pointer ${
          isHelpful === false
            ? "bg-red-100 text-red-700 hover:bg-red-200"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        <ThumbsDown className="w-4 h-4" />
        <span className="text-xs font-medium">Not Helpful</span>
      </Button>

      <div className="flex-1" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className={`flex items-center gap-1 h-8 px-3 py-1 rounded transition-all duration-200 cursor-pointer ${
          isCopied
            ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        <Copy className="w-4 h-4" />
        <span className="text-xs font-medium">
          {isCopied ? "Copied" : "Copy"}
        </span>
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleSave}
        className={`flex items-center gap-1 h-8 px-3 py-1 rounded transition-all duration-200 cursor-pointer ${
          isSaved
            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        <Bookmark className="w-4 h-4" />
        <span className="text-xs font-medium">
          {isSaved ? "Saved" : "Save"}
        </span>
      </Button>
    </div>
  );
}
