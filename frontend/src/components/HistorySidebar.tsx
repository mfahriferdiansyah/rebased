import { useState } from "react";
import { Clock, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  messages: Message[];
  timestamp: Date;
  preview: string;
}

interface HistorySidebarProps {
  sessions: ChatSession[];
  onClearHistory: () => void;
  onLoadSession: (session: ChatSession) => void;
}

export const HistorySidebar = ({ sessions, onClearHistory, onLoadSession }: HistorySidebarProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`fixed left-0 top-0 h-full w-80 z-10 transition-all duration-300 ${
        isHovered ? "bg-card/95 backdrop-blur-xl opacity-100" : "bg-card/30 opacity-30"
      } border-r border-border`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="h-full flex flex-col p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Chat History</h2>
          </div>
          {sessions.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearHistory}
              className="h-8 w-8"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Sessions List */}
        <ScrollArea className="flex-1">
          {sessions.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              No chat history yet.
              <br />
              Start a conversation!
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onLoadSession(session)}
                  className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                >
                  <p className="text-sm font-medium line-clamp-2 mb-1">
                    {session.preview}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.timestamp.toLocaleTimeString()} • {session.messages.length} messages
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer Info */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            {sessions.length} conversation{sessions.length !== 1 ? "s" : ""} saved
          </p>
        </div>
      </div>
    </div>
  );
};
