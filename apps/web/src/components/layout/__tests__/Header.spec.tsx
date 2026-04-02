import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Header } from '../Header';

const mockUseAuth = vi.fn();
const mockUseUnreadNotificationCount = vi.fn();
const mockUseTheme = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/use-notifications', () => ({
  useUnreadNotificationCount: () => mockUseUnreadNotificationCount(),
}));

vi.mock('next-themes', () => ({
  useTheme: () => mockUseTheme(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe('Header localization', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({
      resolvedTheme: 'light',
      setTheme: vi.fn(),
    });

    mockUseUnreadNotificationCount.mockReturnValue({
      data: { count: 2 },
    });
  });

  it('renders English guest copy when the app language is English', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      language: 'en',
      direction: 'ltr',
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
      setLanguage: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.getByAltText('Hena Wadeena')).toBeInTheDocument();
    expect(screen.getByText('Hena Wadeena')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Search').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
  });

  it('renders English authenticated copy when the app language is English', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        phone: null,
        full_name: 'John Doe',
        role: 'tourist',
        status: 'active',
        language: 'en',
        avatar_url: null,
      },
      isAuthenticated: true,
      isLoading: false,
      language: 'en',
      direction: 'ltr',
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
      setLanguage: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.getByText('Wallet')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('My bookings')).toBeInTheDocument();
    expect(screen.getByText('Marketplace inquiries')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Log out')).toBeInTheDocument();
  });
});
