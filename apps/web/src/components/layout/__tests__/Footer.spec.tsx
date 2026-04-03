import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Footer } from '../Footer';

const mockUseAuth = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Footer localization', () => {
  beforeEach(() => {
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
  });

  it('renders English copy when the app language is English', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getByText('Hena Wadeena')).toBeInTheDocument();
    expect(screen.getByText('Quick links')).toBeInTheDocument();
    expect(screen.getByText('Contact us')).toBeInTheDocument();
    expect(screen.getByText('Follow us')).toBeInTheDocument();
    expect(
      screen.getByText(/official digital gateway for new valley/i),
    ).toBeInTheDocument();
  });
});
