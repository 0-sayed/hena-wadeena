import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { MessageCircle, X, Send, Bot, User, RotateCcw, LogIn } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { aiAPI, ApiError, type ChatSessionView } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function mapSessionMessages(session: ChatSessionView): Message[] {
  return session.messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      id: message.message_id,
      role: message.role === 'user' ? 'user' : 'assistant',
      content: message.content,
    }));
}

export function ChatWidget() {
  const navigate = useNavigate();
  const { user, isAuthenticated, direction } = useAuth();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapError, setBootstrapError] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const endRef = useRef<HTMLDivElement>(null);

  const sessionStorageKey = useMemo(() => (user ? `ai_chat_session:${user.id}` : null), [user]);

  useEffect(() => {
    const endElement = endRef.current;
    if (endElement && typeof endElement.scrollIntoView === 'function') {
      endElement.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (!isAuthenticated) {
      setMessages([]);
      setSessionId(undefined);
      setInput('');
      setBootstrapError(false);
      setBootstrapping(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!open) {
      setBootstrapError(false);
    }
  }, [open]);

  const bootstrapSession = useCallback(
    async (
      forceNew = false,
      options?: { preserveMessages?: boolean },
    ): Promise<string | undefined> => {
      if (!isAuthenticated || !sessionStorageKey) {
        return undefined;
      }

      setBootstrapping(true);
      setBootstrapError(false);
      try {
        const savedSessionId = !forceNew ? localStorage.getItem(sessionStorageKey) : null;

        if (savedSessionId) {
          try {
            const firstPage = await aiAPI.getSession(savedSessionId, 1, 20);
            const totalPages = firstPage.pagination.total_pages;
            const session =
              totalPages > 1 ? await aiAPI.getSession(savedSessionId, totalPages, 20) : firstPage;
            setSessionId(savedSessionId);
            const restored = mapSessionMessages(session);
            setMessages(restored);
            return savedSessionId;
          } catch {
            localStorage.removeItem(sessionStorageKey);
          }
        }

        const created = await aiAPI.createSession(undefined, forceNew);
        localStorage.setItem(sessionStorageKey, created.session_id);
        setSessionId(created.session_id);

        if (!options?.preserveMessages) {
          setMessages([
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: created.welcome_message,
            },
          ]);
        }

        return created.session_id;
      } catch {
        setBootstrapError(true);
        return undefined;
      } finally {
        setBootstrapping(false);
      }
    },
    [isAuthenticated, sessionStorageKey],
  );

  useEffect(() => {
    if (!open || !isAuthenticated || sessionId || bootstrapping || bootstrapError) return;
    void bootstrapSession();
  }, [open, isAuthenticated, sessionId, bootstrapping, bootstrapError, bootstrapSession]);

  const resetChat = async () => {
    if (!isAuthenticated) return;
    setInput('');
    setBootstrapError(false);
    await bootstrapSession(true);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !isAuthenticated) return;

    const userText = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: userText }]);
    setLoading(true);

    try {
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        activeSessionId = await bootstrapSession(false, { preserveMessages: true });
      }
      if (!activeSessionId) {
        throw new Error('Unable to create chat session');
      }

      const sendToSession = async (targetSessionId: string) =>
        aiAPI.sendMessage(targetSessionId, { content: userText, language: 'auto' });

      let response;
      try {
        response = await sendToSession(activeSessionId);
      } catch (error) {
        if (error instanceof ApiError && [403, 404, 410].includes(error.status)) {
          const refreshedSessionId = await bootstrapSession(true, { preserveMessages: true });
          if (!refreshedSessionId) throw error;
          response = await sendToSession(refreshedSessionId);
          activeSessionId = refreshedSessionId;
        } else {
          throw error;
        }
      }

      setSessionId(activeSessionId);
      setMessages((prev) => [
        ...prev,
        {
          id: response.message_id,
          role: 'assistant',
          content: response.content,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Unable to send your message right now. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-6 start-6 z-50 h-14 w-14 rounded-full bg-primary text-white shadow-xl transition-all hover:scale-110 hover:bg-primary/90"
        aria-label="AI assistant"
      >
        {open ? <X className="m-auto h-6 w-6" /> : <MessageCircle className="m-auto h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 inset-x-4 z-50 flex max-h-[560px] w-auto max-w-[360px] flex-col overflow-hidden rounded-2xl border border-border/50 bg-background shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 sm:inset-x-auto sm:start-6 sm:w-[360px]">
          <div className="flex items-center justify-between bg-gradient-to-l from-primary to-primary/80 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <Bot className="h-6 w-6" />
              <div>
                <p className="text-sm font-bold">Smart Assistant</p>
                <p className="text-xs text-white/70">Hena Wadeena</p>
              </div>
            </div>

            {isAuthenticated ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/15 hover:text-white"
                onClick={() => void resetChat()}
                disabled={loading || bootstrapping}
                title="Start new chat"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          {!isAuthenticated ? (
            <div className="space-y-4 p-5 text-sm">
              <p>You need to log in to use AI chat sessions.</p>
              <Button type="button" className="w-full" onClick={() => void navigate('/login')}>
                <LogIn className="me-2 h-4 w-4" />
                Login
              </Button>
            </div>
          ) : (
            <>
              <div className="max-h-[350px] flex-1 space-y-3 overflow-y-auto p-4" dir={direction}>
                {bootstrapping && messages.length === 0 ? (
                  <div className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                    Preparing your chat session...
                  </div>
                ) : null}

                {bootstrapError && messages.length === 0 ? (
                  <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                    We could not start your chat session. Try sending a message to retry.
                  </div>
                ) : null}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`h-7 w-7 flex-shrink-0 rounded-full flex items-center justify-center ${
                        msg.role === 'user' ? 'bg-primary/10' : 'bg-accent/30'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <User className="h-4 w-4 text-primary" />
                      ) : (
                        <Bot className="h-4 w-4 text-accent-foreground" />
                      )}
                    </div>
                    <div
                      className={`max-w-[75%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'rounded-se-none bg-primary text-white'
                          : 'rounded-ss-none bg-muted'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {loading ? (
                  <div className="flex gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/30">
                      <Bot className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div className="rounded-2xl rounded-ss-none bg-muted px-4 py-3">
                      <div className="flex gap-1">
                        <span
                          className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40"
                          style={{ animationDelay: '0ms' }}
                        />
                        <span
                          className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40"
                          style={{ animationDelay: '150ms' }}
                        />
                        <span
                          className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40"
                          style={{ animationDelay: '300ms' }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
                <div ref={endRef} />
              </div>

              <div className="border-t p-3">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void sendMessage();
                  }}
                  className="flex gap-2"
                  dir={direction}
                >
                  <Input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Type your question..."
                    className="h-10 flex-1"
                    disabled={loading || bootstrapping}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-10 w-10"
                    disabled={loading || bootstrapping || !input.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
