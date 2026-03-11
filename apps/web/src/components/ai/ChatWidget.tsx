import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { aiAPI } from '@/services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: crypto.randomUUID(), role: 'assistant', content: 'مرحباً! أنا مساعدك الذكي في هنا وادينا 🌴\nكيف أقدر أساعدك؟' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState<string | undefined>();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await aiAPI.chat(userMsg, convId);
      setConvId(res.data.conversation_id);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: res.data.response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: 'عذراً، حدث خطأ. حاول مرة أخرى.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 left-6 z-50 h-14 w-14 rounded-full bg-primary text-white shadow-xl hover:bg-primary/90 transition-all flex items-center justify-center hover:scale-110"
        aria-label="مساعد ذكي"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 left-6 z-50 w-[360px] max-h-[500px] bg-background border border-border/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-l from-primary to-primary/80 text-white px-5 py-4 flex items-center gap-3">
            <Bot className="h-6 w-6" />
            <div>
              <p className="font-bold text-sm">المساعد الذكي</p>
              <p className="text-xs text-white/70">هنا وادينا</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[320px]" dir="rtl">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-primary/10' : 'bg-accent/30'}`}
                >
                  {msg.role === 'user' ? (
                    <User className="h-4 w-4 text-primary" />
                  ) : (
                    <Bot className="h-4 w-4 text-accent-foreground" />
                  )}
                </div>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-tr-none'
                      : 'bg-muted rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-accent/30 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-accent-foreground" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3">
                  <div className="flex gap-1">
                    <span
                      className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage();
              }}
              className="flex gap-2"
              dir="rtl"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب سؤالك..."
                className="flex-1 h-10"
                disabled={loading}
              />
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10"
                disabled={loading || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
