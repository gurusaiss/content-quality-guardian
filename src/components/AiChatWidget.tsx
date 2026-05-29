import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Bot, Loader2, Minimize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AnalysisResults } from "@/types/analysis";
import { getOverallScore } from "@/lib/scoring";

interface AiChatWidgetProps {
  results?: AnalysisResults | null;
}

interface Message {
  role: "user" | "ai";
  content: string;
}

export const AiChatWidget = ({ results }: AiChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content: results
        ? `Hi! I've analyzed your content — overall score is **${getOverallScore(results)}/100**. Ask me anything about your results or how to improve them.`
        : "Hi! I'm your AI content assistant. Run an audit and I'll give you personalized recommendations.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildAuditContext = () => {
    if (!results) return undefined;
    const allIssues = [
      ...results.seoScore.issues,
      ...results.serpScore.issues,
      ...results.aeoScore.issues,
    ];
    const allRecs = [
      ...results.seoScore.recommendations,
      ...results.serpScore.recommendations,
    ];
    return {
      overallScore: getOverallScore(results),
      targetKeyword: results.targetKeyword,
      seoScore: results.seoScore.score,
      serpScore: results.serpScore.score,
      aeoScore: results.aeoScore.score,
      humanizationScore: results.humanizationScore.score,
      topIssues: allIssues.slice(0, 5),
      topRecommendations: allRecs.slice(0, 5),
    };
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const chatHistory = updated
        .filter((m) => m.role !== "ai" || updated.indexOf(m) > 0)
        .map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content }));

      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: chatHistory,
          auditContext: buildAuditContext(),
        },
      });

      if (error) throw error;

      setMessages([...updated, { role: "ai", content: data.reply }]);
    } catch (err) {
      setMessages([...updated, { role: "ai", content: "Sorry, I couldn't process that. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl z-50 gap-0"
        onClick={() => setIsOpen(true)}
        title="AI Assistant"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-80 md:w-96 shadow-2xl z-50 flex flex-col h-[480px]">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Assistant
          {results && (
            <span className="text-xs font-normal opacity-80">• audit loaded</span>
          )}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsOpen(false)}
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </CardContent>

      <div className="p-3 border-t shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your content..."
            className="flex-1 text-sm"
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </Card>
  );
};
