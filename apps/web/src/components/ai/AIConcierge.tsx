import { useState } from 'react';
import { X, Send, Bot, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
}

export function AIConcierge() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'مرحباً! أنا نخيل، مساعدك الذكي. كيف يمكنني مساعدتك في استكشاف الوادي الجديد؟',
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate bot response
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          'شكراً لتواصلك! هذه نسخة تجريبية من مساعد نخيل. قريباً سأتمكن من مساعدتك في البحث عن المواصلات، الأسعار، فرص الاستثمار، والمعالم السياحية.',
        isBot: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full gradient-hero shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <Bot className="h-6 w-6 text-primary-foreground" />
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 left-6 z-50 w-[calc(100vw-48px)] max-w-sm bg-card rounded-2xl shadow-2xl border border-border overflow-hidden transition-all duration-300 ${
          isOpen
            ? 'scale-100 opacity-100 translate-y-0'
            : 'scale-95 opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="gradient-hero p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-primary-foreground">نخيل</h3>
              <p className="text-xs text-primary-foreground/80">المساعد الذكي</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="h-80 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    message.isBot
                      ? 'bg-muted text-foreground rounded-br-none'
                      : 'bg-primary text-primary-foreground rounded-bl-none'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-br-none px-4 py-2.5">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب رسالتك..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
