import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatWidget } from '@/components/ai/ChatWidget';

const mockUseAuth = vi.fn();
const mockCreateSession = vi.fn();
const mockGetSession = vi.fn();
const mockSendMessage = vi.fn();
const mockCloseSession = vi.fn();
const mockLegacyChat = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
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

describe('ChatWidget', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });
  });

  it('shows login CTA and does not call AI APIs when unauthenticated', async () => {
    renderWidget();
    fireEvent.click(screen.getByLabelText('AI assistant'));

    expect(screen.getByText('You need to log in to use AI chat sessions.')).toBeInTheDocument();
    expect(mockCreateSession).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('bootstraps session and renders welcome message for authenticated users', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
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
  });

  it('sends messages through session endpoint and appends assistant reply', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
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

    mockSendMessage.mockResolvedValue({
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

    expect(screen.getByText('Assistant response')).toBeInTheDocument();
  });
});
