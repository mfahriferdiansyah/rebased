import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  onSaveToHistory: (message: Message[]) => void;
}

export const ChatInterface = ({ onSaveToHistory }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const mockAIResponse = (userMessage: string): string => {
    const lowerMsg = userMessage.toLowerCase();
    
    if (lowerMsg.includes("rectangle") || lowerMsg.includes("square")) {
      return "I can help you create rectangles! Click the rectangle tool in the toolbar above, or I can guide you through drawing custom shapes.";
    }
    if (lowerMsg.includes("circle")) {
      return "To create a circle, use the circle tool in the toolbar. You can adjust its size and position after creation.";
    }
    if (lowerMsg.includes("draw") || lowerMsg.includes("sketch")) {
      return "Use the draw tool (pencil icon) to create freehand drawings. Select your color first for the best results!";
    }
    if (lowerMsg.includes("color")) {
      return "You can change colors using the color picker next to the toolbar. Pick any color you like!";
    }
    if (lowerMsg.includes("zoom") || lowerMsg.includes("closer")) {
      return "Use the zoom controls to zoom in/out. You can also use the pan tool to move around the infinite canvas!";
    }
    if (lowerMsg.includes("grid")) {
      return "Toggle the grid on/off using the grid button in the toolbar. It helps align your drawings precisely.";
    }
    
    return "I'm here to help you create! Try asking me about drawing tools, shapes, colors, or canvas navigation.";
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI thinking
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: mockAIResponse(input),
        timestamp: new Date(),
      };
      
      setMessages((prev) => {
        const newMessages = [...prev, aiMessage];
        onSaveToHistory(newMessages);
        return newMessages;
      });
      setIsTyping(false);
      toast.success("AI responded!");
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 w-[600px] max-w-[90vw]">
      <div className="bg-card/80 backdrop-blur-xl border border-border rounded-3xl shadow-2xl overflow-hidden">
        {/* Messages */}
        {messages.length > 0 && (
          <div className="max-h-[300px] overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted px-4 py-2 rounded-2xl">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask AI to help you create..."
                className="w-full pl-10 pr-4 py-3 bg-background/50 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              size="icon"
              className="h-12 w-12 rounded-full"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
