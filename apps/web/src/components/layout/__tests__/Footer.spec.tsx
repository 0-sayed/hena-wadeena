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
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Tourism' })).toHaveAttribute('href', '/tourism');
    expect(screen.getByRole('link', { name: 'Guides' })).toHaveAttribute('href', '/guides');
    expect(screen.getByRole('link', { name: 'Accommodation' })).toHaveAttribute(
      'href',
      '/tourism/accommodation',
    );
    expect(screen.getByRole('link', { name: 'Logistics' })).toHaveAttribute('href', '/logistics');
    expect(screen.getByRole('link', { name: 'Marketplace' })).toHaveAttribute(
      'href',
      '/marketplace',
    );
    expect(screen.getByRole('link', { name: 'Investment' })).toHaveAttribute(
      'href',
      '/investment',
    );
    expect(screen.getByRole('link', { name: 'Jobs' })).toHaveAttribute('href', '/jobs');
    expect(screen.getByRole('link', { name: 'News' })).toHaveAttribute('href', '/news');

    const quickLinksSection = screen.getByText('Quick links').parentElement;
    const quickLinksList = quickLinksSection?.querySelector('ul');
    const quickLinksHeading = screen.getByText('Quick links');

    expect(quickLinksSection).toHaveClass('lg:justify-self-center');
    expect(quickLinksList).not.toBeNull();
    expect(quickLinksList).toHaveClass('mx-auto', 'inline-grid', 'grid-cols-3');
    expect(quickLinksHeading).toHaveClass('text-right');
    expect(screen.getByText('700+')).toBeInTheDocument();
    expect(screen.getByAltText('Egypt Vision 2030')).toHaveAttribute(
      'src',
      '/images/vision-2030.svg',
    );
  });
});
