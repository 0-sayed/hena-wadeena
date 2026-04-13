import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ListingDetailsPage from './ListingDetailsPage';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'listing-1' }),
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/maps/InteractiveMap', () => ({
  InteractiveMap: () => <div>Map</div>,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  Skeleton: () => <div />,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
  }),
}));

vi.mock('@/hooks/use-listings', () => ({
  useListing: () => ({
    data: {
      id: 'listing-1',
      ownerId: 'owner-1',
      titleAr: 'برتقال مزارع الداخلة',
      category: 'agricultural_produce',
      transaction: 'sale',
      tags: [],
      images: ['/images/seed/commodity-oranges.jpg'],
      district: 'dakhla',
      address: 'الداخلة',
      price: 3600,
      priceUnit: 'kg',
      description: 'برتقال طازج',
      amenities: [],
      features: {},
      location: null,
      contact: null,
      reviewCount: 0,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-users', () => ({
  usePublicUsers: () => ({
    data: {
      'owner-1': {
        id: 'owner-1',
        full_name: 'محمد الواحاتي',
        avatar_url: null,
        role: 'resident',
      },
    },
  }),
}));

describe('ListingDetailsPage', () => {
  it('keeps the whole listing summary sidebar sticky instead of only the price card', () => {
    render(<ListingDetailsPage />);

    const sidebar = screen.getByRole('complementary', { name: 'ملخص وتواصل الإعلان' });
    expect(sidebar).toHaveClass('lg:sticky', 'lg:top-20', 'lg:self-start');

    const summaryHeading = screen.getByRole('heading', { name: 'ملخص الإعلان' });
    const summaryCard = summaryHeading.closest('.rounded-lg.border');
    expect(summaryCard).not.toHaveClass('sticky', 'top-20');
  });
});
