import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeaturedSection } from '../FeaturedSection';
import { HeroSection } from '../HeroSection';
import { MissionCards } from '../MissionCards';
import { PriceSnapshot } from '../PriceSnapshot';
import { QuickAccess } from '../QuickAccess';
import { VisionStrip } from '../VisionStrip';

const mockUseAuth = vi.fn();
const mockUseAttractions = vi.fn();
const mockUsePriceIndex = vi.fn();
const mockUseUnreadNotificationCount = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/use-attractions', () => ({
  useAttractions: (...args: unknown[]) => mockUseAttractions(...args),
}));

vi.mock('@/hooks/use-price-index', () => ({
  usePriceIndex: (...args: unknown[]) => mockUsePriceIndex(...args),
}));

vi.mock('@/hooks/use-notifications', () => ({
  useUnreadNotificationCount: () => mockUseUnreadNotificationCount(),
}));

vi.mock('@/hooks/use-hero-stats', () => ({
  useHeroStats: () => ({ data: null, isLoading: false }),
}));

vi.mock('@/components/motion/ScrollReveal', () => ({
  SR: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FloatingBlob: () => null,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  CardGridSkeleton: () => <div>loading cards</div>,
  TableRowSkeleton: () => (
    <tr>
      <td>loading row</td>
    </tr>
  ),
}));

describe('Home sections localization', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        phone: null,
        full_name: 'John Doe',
        role: 'tourist',
        status: 'active',
        language: 'en',
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

    mockUseAttractions.mockReturnValue({
      data: [
        {
          id: 'attr-1',
          slug: 'white-desert',
          thumbnail: null,
          nameAr: 'الصحراء البيضاء',
          nameEn: 'White Desert',
          descriptionAr: 'وصف عربي',
          descriptionEn: 'A surreal desert landscape.',
          type: 'natural',
          ratingAvg: 4.8,
          durationHours: 3,
        },
      ],
      isLoading: false,
    });

    mockUsePriceIndex.mockReturnValue({
      data: [
        {
          commodity: {
            id: 'cmd-1',
            nameAr: 'طماطم',
            nameEn: 'Tomatoes',
            unit: 'kg',
          },
          latestPrice: 2500,
          changePercent: 12,
        },
      ],
      isLoading: false,
    });

    mockUseUnreadNotificationCount.mockReturnValue({
      data: { count: 3 },
    });
  });

  it('renders hero and mission copy in English mode', () => {
    render(
      <MemoryRouter>
        <HeroSection />
        <MissionCards />
      </MemoryRouter>,
    );

    expect(screen.getByText('Official digital portal')).toBeInTheDocument();
    expect(screen.getByText('Explore.')).toBeInTheDocument();
    expect(screen.getByText('Connect.')).toBeInTheDocument();
    expect(screen.getByText('Invest.')).toBeInTheDocument();
    expect(screen.getByText('Services for New Valley residents')).toBeInTheDocument();
    expect(screen.getAllByText('Explore').length).toBeGreaterThan(0);
  });

  it('uses pink styling for the artisans card CTA by default and on hover', () => {
    render(
      <MemoryRouter>
        <MissionCards />
      </MemoryRouter>,
    );

    const artisansTitle = screen.getByRole('heading', { name: 'Artisans' });
    const artisansLink = artisansTitle.closest('a');

    expect(artisansLink).not.toBeNull();
    expect(artisansTitle).toHaveClass('group-hover:text-pink-600');

    const exploreCta = within(artisansLink as HTMLAnchorElement).getByText('Explore');

    expect(exploreCta).toHaveClass('text-pink-600');
    expect(exploreCta).toHaveClass('group-hover:text-pink-600');
  });

  it('renders the Vision 2030 strip in English mode', () => {
    render(<VisionStrip />);

    expect(screen.getByText('Aligned with Egypt Vision 2030')).toBeInTheDocument();
    expect(screen.getByAltText('Egypt Vision 2030')).toHaveAttribute(
      'src',
      '/images/vision-2030.svg',
    );
  });

  it('renders featured attractions and price snapshot content in English mode', () => {
    render(
      <MemoryRouter>
        <FeaturedSection />
        <PriceSnapshot />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Featured destinations' })).toBeInTheDocument();
    expect(screen.getByText('White Desert')).toBeInTheDocument();
    expect(screen.getByText('A surreal desert landscape.')).toBeInTheDocument();
    expect(screen.getByText("Today's prices")).toBeInTheDocument();
    expect(screen.getByText('Tomatoes')).toBeInTheDocument();
    expect(screen.getByText('EGP/kg')).toBeInTheDocument();
  });

  it('renders quick-access copy in English mode', () => {
    render(
      <MemoryRouter>
        <QuickAccess />
      </MemoryRouter>,
    );

    expect(screen.getByText('Hello, John Doe')).toBeInTheDocument();
    expect(screen.getByText('Quick access to your account')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });
});
