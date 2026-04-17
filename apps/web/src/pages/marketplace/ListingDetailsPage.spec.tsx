import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ListingDetailsPage from './ListingDetailsPage';

const mockNavigate = vi.fn();
const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUseListing = vi.hoisted(() => vi.fn());

const defaultListing = {
  id: 'listing-1',
  ownerId: 'owner-1',
  titleAr: 'برتقال مزارع الداخلة',
  titleEn: 'Dakhla farm oranges',
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
};

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
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/use-listings', () => ({
  useListing: () => mockUseListing(),
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
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      language: 'ar',
      user: null,
    });
    mockUseListing.mockReturnValue({
      data: defaultListing,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it('keeps the whole listing summary sidebar sticky instead of only the price card', () => {
    render(<ListingDetailsPage />);

    const sidebar = screen.getByRole('complementary', { name: 'ملخص وتواصل الإعلان' });
    expect(sidebar).toHaveClass('lg:sticky', 'lg:top-20', 'lg:self-start');

    const summaryHeading = screen.getByRole('heading', { name: 'ملخص الإعلان' });
    const summaryCard = summaryHeading.closest('.rounded-lg.border');
    expect(summaryCard).not.toHaveClass('sticky', 'top-20');
  });

  it('localizes solar feature labels and values for English users', () => {
    mockUseAuth.mockReturnValueOnce({
      isAuthenticated: false,
      language: 'en',
      user: null,
    });
    mockUseListing.mockReturnValueOnce({
      data: {
        ...defaultListing,
        category: 'solar_installer',
        features: {
          nrea_cert_number: 'NREA-42',
          services: ['residential', 'commercial'],
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ListingDetailsPage />);

    expect(screen.getByText('NREA certificate number')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByText('Residential, Commercial')).toBeInTheDocument();
  });

  it('localizes grid-connected and off-grid solar service values for English users', () => {
    mockUseAuth.mockReturnValueOnce({
      isAuthenticated: false,
      language: 'en',
      user: null,
    });
    mockUseListing.mockReturnValueOnce({
      data: {
        ...defaultListing,
        category: 'solar_installer',
        features: {
          services: ['grid_connected', 'off_grid'],
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ListingDetailsPage />);

    expect(screen.getByText('Grid-connected, Off-grid')).toBeInTheDocument();
  });

  it('localizes the listing title and static section labels for English users', () => {
    mockUseAuth.mockReturnValueOnce({
      isAuthenticated: false,
      language: 'en',
      user: null,
    });
    mockUseListing.mockReturnValueOnce({
      data: {
        ...defaultListing,
        features: {
          services: ['residential'],
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ListingDetailsPage />);

    expect(screen.getByRole('heading', { name: 'Dakhla farm oranges' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Additional details' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Location' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Listing summary' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Listing owner' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Contact details' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Listing summary and contact' })).toBeInTheDocument();
  });

  it('localizes the owner role label for Arabic users', () => {
    render(<ListingDetailsPage />);

    expect(screen.getByText('مقيم')).toBeInTheDocument();
    expect(screen.queryByText('resident')).not.toBeInTheDocument();
  });
});
