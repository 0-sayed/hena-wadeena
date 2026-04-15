import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Send, User, RotateCcw, LogIn } from 'lucide-react';
import '@lottiefiles/dotlottie-wc';

import { useAuth } from '@/hooks/use-auth';
import { aiAPI, ApiError, type ChatSessionView } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

const PALM_ANIMATION_SRC = '/animations/nakheel-palm-leaf.lottie?v=palm-only-crop';

interface PalmAnimationIconProps {
  className: string;
}

function PalmAnimationIcon({ className }: PalmAnimationIconProps) {
  return (
    <span
      className={`relative block overflow-visible drop-shadow-lg ${className}`}
      aria-hidden="true"
    >
      <dotlottie-wc
        autoplay
        loop
        speed={1}
        src={PALM_ANIMATION_SRC}
        style={{
          display: 'block',
          height: '100%',
          pointerEvents: 'none',
          width: '100%',
        }}
      />
    </span>
  );
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
  const STREAM_ACTIVITY_TIMEOUT_MS = 60_000;
  const navigate = useNavigate();
  const { user, isAuthenticated, direction } = useAuth();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapError, setBootstrapError] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (launcherRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
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

  const shouldRetryWithoutStreaming = (error: unknown) => {
    if (error instanceof TypeError) {
      return true;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      return true;
    }

    return error instanceof ApiError && [405, 501].includes(error.status);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !isAuthenticated) return;

    const userText = input.trim();
    const pendingAssistantId = crypto.randomUUID();
    setInput('');
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: userText },
      { id: pendingAssistantId, role: 'assistant', content: '', streaming: true },
    ]);
    setLoading(true);

    const updatePendingAssistant = (updater: (message: Message) => Message) => {
      setMessages((prev) =>
        prev.map((message) => (message.id === pendingAssistantId ? updater(message) : message)),
      );
    };

    const finalizePendingAssistant = (response: { message_id: string; content: string }) => {
      updatePendingAssistant((message) => ({
        ...message,
        id: response.message_id,
        content: response.content,
        streaming: false,
      }));
    };

    let firstTokenLogged = false;

    try {
      let activeSessionId =
        sessionId ?? (await bootstrapSession(false, { preserveMessages: true }));
      if (!activeSessionId) throw new Error('Unable to create chat session');

      const resolveSessionRequest = async <T,>(
        operation: (targetSessionId: string) => Promise<T>,
      ): Promise<{ activeSessionId: string; result: T }> => {
        const targetSessionId = activeSessionId;
        if (!targetSessionId) {
          throw new Error('Unable to create chat session');
        }

        try {
          return {
            activeSessionId: targetSessionId,
            result: await operation(targetSessionId),
          };
        } catch (error) {
          if (error instanceof ApiError && [403, 404, 410].includes(error.status)) {
            const refreshedSessionId = await bootstrapSession(true, { preserveMessages: true });
            if (!refreshedSessionId) throw error;
            activeSessionId = refreshedSessionId;
            return {
              activeSessionId: refreshedSessionId,
              result: await operation(refreshedSessionId),
            };
          }
          throw error;
        }
      };

      const submittedAt = performance.now();
      let timedOut = false;

      const streamRequest = async (targetSessionId: string) => {
        const controller = new AbortController();
        let timeoutId: number | undefined;

        const resetStreamTimeout = () => {
          if (timeoutId !== undefined) {
            window.clearTimeout(timeoutId);
          }

          timeoutId = window.setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, STREAM_ACTIVITY_TIMEOUT_MS);
        };

        resetStreamTimeout();

        try {
          await aiAPI.streamMessage(
            targetSessionId,
            { content: userText, language: 'auto' },
            {
              onStatus: () => {
                resetStreamTimeout();
              },
              onToken: (delta) => {
                resetStreamTimeout();
                if (!firstTokenLogged) {
                  firstTokenLogged = true;
                  window.dispatchEvent(
                    new CustomEvent('ai-chat-ttft', {
                      detail: { ttftMs: Math.round(performance.now() - submittedAt) },
                    }),
                  );
                }
                updatePendingAssistant((message) => ({
                  ...message,
                  content: `${message.content}${delta}`,
                }));
              },
              onComplete: (response) => {
                if (timeoutId !== undefined) {
                  window.clearTimeout(timeoutId);
                }
                finalizePendingAssistant(response);
              },
            },
            { signal: controller.signal },
          );
        } finally {
          if (timeoutId !== undefined) {
            window.clearTimeout(timeoutId);
          }
        }
      };

      try {
        const resolved = await resolveSessionRequest((targetSessionId) =>
          streamRequest(targetSessionId),
        );
        setSessionId(resolved.activeSessionId);
      } catch (error) {
        if (!firstTokenLogged && !timedOut && shouldRetryWithoutStreaming(error)) {
          const resolved = await resolveSessionRequest((targetSessionId) =>
            aiAPI.sendMessage(targetSessionId, { content: userText, language: 'auto' }),
          );
          setSessionId(resolved.activeSessionId);
          finalizePendingAssistant(resolved.result);
        } else {
          throw error;
        }
      }
    } catch (error) {
      const content =
        error instanceof DOMException && error.name === 'AbortError'
          ? firstTokenLogged
            ? 'The assistant stopped responding before the answer was complete. Please try again.'
            : 'The assistant is taking longer than expected. Please try again.'
          : 'Unable to send your message right now. Please try again.';

      updatePendingAssistant((message) => ({
        ...message,
        content: message.content.trim().length > 0 ? `${message.content}\n\n${content}` : content,
        streaming: false,
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        ref={launcherRef}
        onClick={() => setOpen((value) => !value)}
        className="group fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] start-3 z-50 h-20 w-20 overflow-visible bg-transparent text-white transition-all hover:scale-105 md:bottom-3 md:h-24 md:w-24"
        aria-label="AI assistant"
      >
        <PalmAnimationIcon className="h-20 w-20 md:h-24 md:w-24" />
      </button>

      {open && (
        <div
          ref={panelRef}
          data-testid="ai-chat-panel"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+6rem)] inset-x-4 z-50 flex max-h-[560px] w-auto max-w-[360px] flex-col overflow-hidden rounded-2xl border border-border/50 bg-background shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 md:bottom-24 sm:inset-x-auto sm:start-6 sm:w-[360px]"
        >
          <div className="flex items-center justify-between bg-gradient-to-l from-primary to-primary/80 px-5 py-4 text-white">
            <div>
              <p className="text-sm font-bold">Smart Assistant</p>
              <p className="text-xs text-white/70">Hena Wadeena</p>
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
                        <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
                      )}
                    </div>
                    <div
                      className={`max-w-[75%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'rounded-se-none bg-primary text-white'
                          : 'rounded-ss-none bg-muted'
                      }`}
                    >
                      {msg.streaming && msg.content.length === 0 ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
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
                          <span className="text-xs font-medium">Nakheel is typing...</span>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
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
