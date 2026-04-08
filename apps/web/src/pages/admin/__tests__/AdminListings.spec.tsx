import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAdminListings = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockRemoveListing = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock('@/components/market/ListingEditorDialog', () => ({
  ListingEditorDialog: ({ open }: { open: boolean }) => (open ? <div>listing-dialog</div> : null),
}));

vi.mock('@/components/market/listing-editor-form', () => ({
  emptyListingForm: {
    titleAr: '',
    description: '',
    priceEgp: '',
    district: 'kharga',
    category: 'shopping',
    address: '',
  },
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type = 'button',
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
}));

vi.mock('@/hooks/use-admin', () => ({
  useAdminListings: (...args: unknown[]) => mockUseAdminListings(...args),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    language: 'en',
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual('@/services/api');

  return {
    ...(actual as object),
    listingsAPI: {
      create: vi.fn(),
      update: vi.fn(),
      remove: (...args: unknown[]) => mockRemoveListing(...args),
    },
  };
});

import AdminListings from '../AdminListings';

describe('AdminListings', () => {
  beforeEach(() => {
    mockUseAdminListings.mockReset();
    mockInvalidateQueries.mockReset();
    mockRemoveListing.mockReset();

    mockUseAdminListings.mockReturnValue({
      data: {
        data: [
          {
            id: 'listing-1',
            ownerId: 'merchant-uuid-1',
            listingType: 'business',
            transaction: 'sale',
            titleAr: 'Fresh dates',
            titleEn: 'Fresh dates',
            description: 'Dates from Kharga',
            category: 'shopping',
            subCategory: null,
            price: 20000,
            priceUnit: 'piece',
            priceRange: null,
            areaSqm: null,
            location: null,
            district: 'kharga',
            address: 'Main street',
            images: null,
            features: null,
            amenities: null,
            tags: null,
            contact: null,
            openingHours: null,
            slug: 'fresh-dates',
            status: 'active',
            isVerified: true,
            isFeatured: false,
            isPublished: true,
            featuredUntil: null,
            approvedBy: null,
            approvedAt: null,
            ratingAvg: null,
            reviewCount: 0,
            viewsCount: 0,
            createdAt: '2026-04-08T09:00:00.000Z',
            updatedAt: '2026-04-08T09:00:00.000Z',
            deletedAt: null,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      },
      isLoading: false,
      error: null,
    });

    mockRemoveListing.mockResolvedValue(undefined);
  });

  it('renders admin announcements tools and lets admin delete a merchant listing', async () => {
    render(<AdminListings />);

    expect(screen.getByRole('heading', { name: 'Announcements' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New announcement' })).toBeInTheDocument();
    expect(screen.getByText('Fresh dates')).toBeInTheDocument();
    expect(screen.getByText('merchant-uuid-1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockRemoveListing).toHaveBeenCalledWith('listing-1');
    });
  });
});
