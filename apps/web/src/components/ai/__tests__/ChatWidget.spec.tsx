import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UserRole } from '@hena-wadeena/types';
import { ChatWidget } from '@/components/ai/ChatWidget';
import type { AuthContextValue } from '@/contexts/auth-context';

const mockUseAuth = vi.hoisted(() => vi.fn<() => AuthContextValue>());
const mockCreateSession = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());
const mockSendMessage = vi.hoisted(() => vi.fn());
const mockStreamMessage = vi.hoisted(() => vi.fn());
const mockCloseSession = vi.hoisted(() => vi.fn());
const mockLegacyChat = vi.hoisted(() => vi.fn());

vi.mock('@lottiefiles/dotlottie-wc', () => ({}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: (): AuthContextValue => mockUseAuth(),
}));

vi.mock('@/services/api', () => {
  class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'ApiError';
    }
  }

  return {
    ApiError,
    aiAPI: {
      createSession: mockCreateSession,
      getSession: mockGetSession,
      sendMessage: mockSendMessage,
      streamMessage: mockStreamMessage,
      closeSession: mockCloseSession,
      chat: mockLegacyChat,
    },
  };
});

function renderWidget() {
  return render(
    <MemoryRouter>
      <ChatWidget />
    </MemoryRouter>,
  );
}

function buildUnauthedContext(): AuthContextValue {
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    language: 'ar',
    direction: 'rtl',
    login: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    updateUser: vi.fn(),
    setLanguage: vi.fn().mockResolvedValue(undefined),
  };
}

describe('ChatWidget', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockStreamMessage.mockReset();
    mockUseAuth.mockReturnValue(buildUnauthedContext());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows login CTA and does not call AI APIs when unauthenticated', () => {
    renderWidget();
    fireEvent.click(screen.getByLabelText('AI assistant'));

    expect(screen.getByText('You need to log in to use AI chat sessions.')).toBeInTheDocument();
    expect(mockCreateSession).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('renders the animated palm in the closed launcher', () => {
    const { container } = renderWidget();

    const launcher = screen.getByLabelText('AI assistant');
    const mascot = container.querySelector<HTMLElement>('dotlottie-wc');

    expect(mascot).toBeInTheDocument();
    expect(mascot).toHaveAttribute(
      'src',
      '/animations/nakheel-palm-leaf.lottie?v=palm-only-crop',
    );
    expect(mascot?.style.width).toBe('100%');
    expect(mascot?.style.height).toBe('100%');
    expect(launcher).toHaveClass('bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]');
    expect(launcher).toHaveClass('md:bottom-3');
    expect(launcher).toHaveClass('h-20');
    expect(launcher).toHaveClass('md:h-24');
    expect(launcher).toContainElement(mascot);
    expect(launcher.querySelector('svg')).not.toBeInTheDocument();
  });

  it('keeps the palm animation out of the opened panel', () => {
    const { container } = renderWidget();
    fireEvent.click(screen.getByLabelText('AI assistant'));

    const launcher = screen.getByLabelText('AI assistant');
    const panel = screen.getByTestId('ai-chat-panel');

    expect(launcher.querySelector('dotlottie-wc')).toBeInTheDocument();
    expect(panel).toHaveClass('bottom-[calc(env(safe-area-inset-bottom)+6rem)]');
    expect(panel).toHaveClass('md:bottom-24');
    expect(panel.querySelector('dotlottie-wc')).not.toBeInTheDocument();
    expect(container.querySelectorAll('dotlottie-wc')).toHaveLength(1);
  });

  it('closes the open panel when clicking outside the widget', () => {
    renderWidget();
    fireEvent.click(screen.getByLabelText('AI assistant'));

    expect(screen.getByText('You need to log in to use AI chat sessions.')).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    expect(
      screen.queryByText('You need to log in to use AI chat sessions.'),
    ).not.toBeInTheDocument();
  });

  it('bootstraps session and renders welcome message for authenticated users', async () => {
    mockUseAuth.mockReturnValue({
      ...buildUnauthedContext(),
      user: {
        id: 'user-1',
        email: 'user-1@example.com',
        phone: '+2000000000',
        full_name: 'User One',
        role: UserRole.TOURIST,
        status: 'active',
        language: 'en',
      },
      isAuthenticated: true,
    });

    mockCreateSession.mockResolvedValue({
      session_id: 'sess-1',
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      language_preference: 'auto',
      message_count: 0,
      is_active: true,
      welcome_message: 'Welcome from test',
    });

    renderWidget();
    fireEvent.click(screen.getByLabelText('AI assistant'));

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalled();
    });

    expect(screen.getByText('Welcome from test')).toBeInTheDocument();
    expect(
      screen.getByTestId('ai-chat-panel').querySelector('dotlottie-wc'),
    ).not.toBeInTheDocument();
  });

  it('restores the most recent session page when history spans multiple pages', async () => {
    mockUseAuth.mockReturnValue({
      ...buildUnauthedContext(),
      user: {
        id: 'user-1',
        email: 'user-1@example.com',
        phone: '+2000000000',
        full_name: 'User One',
        role: UserRole.TOURIST,
        status: 'active',
        language: 'en',
      },
      isAuthenticated: true,
    });

    localStorage.setItem('ai_chat_session:user-1', 'sess-1');

    mockGetSession
      .mockResolvedValueOnce({
        session_id: 'sess-1',
        user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
        message_count: 45,
        messages: [
          {
            message_id: 'old-msg-1',
            role: 'assistant',
            content: 'Old page content',
            language: 'en',
            created_at: new Date().toISOString(),
            sources: [],
          },
        ],
        pagination: {
          page: 1,
          per_page: 20,
          total_messages: 45,
          total_pages: 3,
        },
      })
      .mockResolvedValueOnce({
        session_id: 'sess-1',
        user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
        message_count: 45,
        messages: [
          {
            message_id: 'recent-msg-1',
            role: 'assistant',
            content: 'Most recent page content',
            language: 'en',
            created_at: new Date().toISOString(),
            sources: [],
          },
        ],
        pagination: {
          page: 3,
          per_page: 20,
          total_messages: 45,
          total_pages: 3,
        },
      });

    renderWidget();
    fireEvent.click(screen.getByLabelText('AI assistant'));

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalledTimes(2);
    });

    expect(mockGetSession).toHaveBeenNthCalledWith(1, 'sess-1', 1, 20);
    expect(mockGetSession).toHaveBeenNthCalledWith(2, 'sess-1', 3, 20);
    expect(mockCreateSession).not.toHaveBeenCalled();
    expect(screen.getByText('Most recent page content')).toBeInTheDocument();
  });
  it('streams messages progressively and appends assistant reply', async () => {
    mockUseAuth.mockReturnValue({
      ...buildUnauthedContext(),
      user: {
        id: 'user-1',
        email: 'user-1@example.com',
        phone: '+2000000000',
        full_name: 'User One',
        role: UserRole.TOURIST,
        status: 'active',
        language: 'en',
      },
      isAuthenticated: true,
    });

    mockCreateSession.mockResolvedValue({
      session_id: 'sess-1',
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      language_preference: 'auto',
      message_count: 0,
      is_active: true,
      welcome_message: 'Welcome',
    });

    mockStreamMessage.mockImplementation(
      (
        _sessionId,
        _body,
        handlers: { onToken: (delta: string) => void; onComplete: (message: unknown) => void },
      ) => {
        handlers.onToken('Assistant ');
        handlers.onToken('response');
        handlers.onComplete({
          message_id: 'msg-1',
          session_id: 'sess-1',
          role: 'assistant',
          content: 'Assistant response',
          language: 'en',
          created_at: new Date().toISOString(),
          sources: [],
          domain_relevant: true,
          latency_ms: 42,
        });
        return Promise.resolve();
      },
    );

    renderWidget();
    fireEvent.click(screen.getByLabelText('AI assistant'));

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText('Type your question...');
    fireEvent.change(input, { target: { value: 'Tell me about New Valley' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(mockStreamMessage).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Assistant response')).toBeInTheDocument();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('falls back to the non-stream request when streaming fails before the first token', async () => {
    mockUseAuth.mockReturnValue({
      ...buildUnauthedContext(),
      user: {
        id: 'user-1',
        email: 'user-1@example.com',
        phone: '+2000000000',
        full_name: 'User One',
        role: UserRole.TOURIST,
        status: 'active',
        language: 'en',
      },
      isAuthenticated: true,
    });

    mockCreateSession.mockResolvedValue({
      session_id: 'sess-1',
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      language_preference: 'auto',
      message_count: 0,
      is_active: true,
      welcome_message: 'Welcome',
    });

    mockStreamMessage.mockRejectedValue(new TypeError('Failed to fetch'));
    mockSendMessage.mockResolvedValue({
      message_id: 'msg-fallback-1',
      session_id: 'sess-1',
      role: 'assistant',
      content: 'Fallback response',
      language: 'en',
      created_at: new Date().toISOString(),
      sources: [],
      domain_relevant: true,
      latency_ms: 55,
    });

    renderWidget();
    fireEvent.click(screen.getByLabelText('AI assistant'));

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText('Type your question...');
    fireEvent.change(input, { target: { value: 'Tell me about New Valley' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('sess-1', {
        content: 'Tell me about New Valley',
        language: 'auto',
      });
    });

    expect(screen.getByText('Fallback response')).toBeInTheDocument();
  });

  it('keeps the streaming request alive while the backend sends progress updates', async () => {
    vi.useFakeTimers();

    mockUseAuth.mockReturnValue({
      ...buildUnauthedContext(),
      user: {
        id: 'user-1',
        email: 'user-1@example.com',
        phone: '+2000000000',
        full_name: 'User One',
        role: UserRole.TOURIST,
        status: 'active',
        language: 'en',
      },
      isAuthenticated: true,
    });

    mockCreateSession.mockResolvedValue({
      session_id: 'sess-1',
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      language_preference: 'auto',
      message_count: 0,
      is_active: true,
      welcome_message: 'Welcome',
    });

    mockStreamMessage.mockImplementation(
      (
        _sessionId,
        _body,
        handlers: {
          onStatus?: (phase: string, message?: string) => void;
          onToken: (delta: string) => void;
          onComplete: (message: unknown) => void;
        },
        options?: { signal?: AbortSignal },
      ) =>
        new Promise<void>((resolve, reject) => {
          options?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });

          window.setTimeout(() => {
            handlers.onStatus?.('accepted', 'Preparing your answer.');
          }, 55_000);
          window.setTimeout(() => {
            handlers.onStatus?.('generating_answer', 'Generating a grounded answer.');
          }, 95_000);
          window.setTimeout(() => {
            handlers.onToken('Assistant ');
          }, 100_000);
          window.setTimeout(() => {
            handlers.onComplete({
              message_id: 'msg-progress-1',
              session_id: 'sess-1',
              role: 'assistant',
              content: 'Assistant response',
              language: 'en',
              created_at: new Date().toISOString(),
              sources: [],
              domain_relevant: true,
              latency_ms: 4200,
            });
            resolve();
          }, 105_000);
        }),
    );

    renderWidget();
    fireEvent.click(screen.getByLabelText('AI assistant'));

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(mockCreateSession).toHaveBeenCalled();

    const input = screen.getByPlaceholderText('Type your question...');
    fireEvent.change(input, { target: { value: 'Tell me about New Valley' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(105_000);
    });

    expect(screen.getByText('Assistant response')).toBeInTheDocument();

    expect(
      screen.queryByText('The assistant is taking longer than expected. Please try again.'),
    ).not.toBeInTheDocument();
  }, 10_000);

  it('does not retry with the non-stream request after an application-level stream error', async () => {
    mockUseAuth.mockReturnValue({
      ...buildUnauthedContext(),
      user: {
        id: 'user-1',
        email: 'user-1@example.com',
        phone: '+2000000000',
        full_name: 'User One',
        role: UserRole.TOURIST,
        status: 'active',
        language: 'en',
      },
      isAuthenticated: true,
    });

    mockCreateSession.mockResolvedValue({
      session_id: 'sess-1',
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      language_preference: 'auto',
      message_count: 0,
      is_active: true,
      welcome_message: 'Welcome',
    });

    mockStreamMessage.mockRejectedValue(new Error('Unable to send your message right now.'));

    renderWidget();
    fireEvent.click(screen.getByLabelText('AI assistant'));

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText('Type your question...');
    fireEvent.change(input, { target: { value: 'Tell me about New Valley' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(
        screen.getByText('Unable to send your message right now. Please try again.'),
      ).toBeInTheDocument();
    });

    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
