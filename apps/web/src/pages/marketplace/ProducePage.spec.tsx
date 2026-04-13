import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Listing } from '@/services/api';

import ProducePage from './ProducePage';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  Skeleton: () => <div />,
}));

vi.mock('@/components/market/ProduceListingSheet', () => ({
  ProduceListingSheet: () => null,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
  }),
}));

const listing: Listing = {
  id: 'listing-1',
  ownerId: 'owner-1',
  listingType: 'business',
  transaction: 'sale',
  titleAr: 'فول سوداني من باريس',
  titleEn: null,
  description: null,
  category: 'agricultural_produce',
  subCategory: null,
  price: 5600,
  priceUnit: 'EGP',
  priceRange: null,
  areaSqm: null,
  location: null,
  district: 'baris',
  address: null,
  images: ['/images/seed/commodity-peanuts.jpg'],
  features: null,
  amenities: null,
  tags: null,
  contact: null,
  openingHours: null,
  slug: 'peanuts',
  status: 'active',
  isVerified: false,
  isFeatured: false,
  isPublished: true,
  featuredUntil: null,
  approvedBy: null,
  approvedAt: null,
  ratingAvg: null,
  reviewCount: 0,
  viewsCount: 0,
  createdAt: '2026-04-11T00:00:00.000Z',
  updatedAt: '2026-04-11T00:00:00.000Z',
  deletedAt: null,
  produceDetails: {
    commodityType: 'other',
    storageType: 'field',
    preferredBuyer: 'any',
  },
};

vi.mock('@/hooks/use-listings', () => ({
  useListings: () => ({
    data: {
      data: [listing],
      total: 1,
      page: 1,
      limit: 48,
      hasMore: false,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

describe('ProducePage', () => {
  it('normalizes currency-looking listing units and spaces the price label', () => {
    render(<ProducePage />);

    expect(screen.queryByText(/EGP/)).not.toBeInTheDocument();
    expect(screen.getByText('كجم')).toBeInTheDocument();

    const priceLine = screen.getByText('56').closest('div');
    expect(priceLine).toHaveClass('gap-1');
  });
});
