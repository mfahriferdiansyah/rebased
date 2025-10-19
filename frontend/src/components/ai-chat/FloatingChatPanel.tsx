import React, { useState } from "react";
import { aiApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Strategy } from "@/lib/types/strategy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Minimize2 } from "lucide-react";

interface FloatingChatPanelProps {
  onStrategyGenerated: (strategy: Strategy) => void;
  currentStrategy?: Strategy | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function FloatingChatPanel({ onStrategyGenerated, currentStrategy }: FloatingChatPanelProps) {
  const { getBackendToken } = useAuth();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "I'm here to help you create portfolio strategies! Describe what you want to build.",
    },
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setLoading(true);
    setIsExpanded(true);

    try {
      const token = await getBackendToken();
      if (!token) {
        throw new Error("Please sign in to use AI features");
      }

      // Build conversation history from messages (exclude initial assistant greeting)
      const conversationHistory = messages
        .slice(1) // Skip initial greeting
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      const strategy = await aiApi.generateStrategy(
        userMessage,
        token,
        currentStrategy,
        conversationHistory,
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I've created "${strategy.name}" strategy for you! ${strategy.description}\n\nI'll visualize it on the canvas now.`,
        },
      ]);

      onStrategyGenerated(strategy);
    } catch (error) {
      console.error("Strategy generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Sorry, I couldn't generate that strategy. Could you try describing it differently?";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMessage,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`
        fixed bottom-8 left-1/2 -translate-x-1/2 z-50
        bg-white rounded-xl shadow-lg
        border border-gray-200
        transition-all duration-300 ease-out
        ${isExpanded ? "max-w-2xl w-[600px] h-[500px]" : "max-w-lg w-[500px] h-[70px]"}
      `}
    >
      {/* Expanded content */}
      {isExpanded && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gray-700" />
              <span className="font-semibold text-gray-900">AI Strategy Assistant</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <Minimize2 className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`
                      max-w-[80%] px-4 py-2.5 rounded-lg
                      ${message.role === "user"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-900"
                      }
                    `}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white focus-within:border-gray-400">
              <Sparkles className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <Input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask AI to help you create..."
                disabled={loading}
                className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm p-0"
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                size="icon"
                className="rounded-lg w-8 h-8 flex-shrink-0 bg-gray-900 hover:bg-gray-800"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Collapsed state */}
      {!isExpanded && (
        <form onSubmit={handleSubmit} className="p-3 h-full">
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white h-full">
            <Sparkles className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              placeholder="Ask AI to help you create..."
              disabled={loading}
              className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm p-0"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              size="icon"
              className="rounded-lg w-8 h-8 flex-shrink-0 bg-gray-900 hover:bg-gray-800"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
