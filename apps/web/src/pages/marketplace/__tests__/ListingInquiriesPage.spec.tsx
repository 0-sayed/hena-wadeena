import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { UserRole } from '@hena-wadeena/types';
import type { ListingInquiry } from '@/services/api';

import ListingInquiriesPage from '../ListingInquiriesPage';

type ListingInquiriesQueryResult = {
  data: { data: ListingInquiry[]; total: number } | undefined;
  isLoading: boolean;
  isError: boolean;
};

type ListingInquiriesQueryOptions = {
  enabled?: boolean;
};

type MarkReadMutation = {
  mutate: (id: string) => void;
  isPending: boolean;
};

type ReplyMutation = {
  mutate: (payload: { id: string; message: string }) => void;
  isPending: boolean;
};

type PublicUsersResult = {
  data: Record<string, { full_name: string } | undefined> | undefined;
};

const mockSearchParamsState = { value: new URLSearchParams() };
const mockSetSearchParams = vi.fn();
const mockUseListingInquiriesReceived =
  vi.fn<(filters: unknown, options?: ListingInquiriesQueryOptions) => ListingInquiriesQueryResult>();
const mockUseListingInquiriesSent = vi.fn<(filters: unknown) => ListingInquiriesQueryResult>();
const mockUseMarkListingInquiryRead = vi.fn<() => MarkReadMutation>();
const mockUseMarkListingInquiryReplied = vi.fn<() => ReplyMutation>();
const mockUsePublicUsers = vi.fn<(ids: string[]) => PublicUsersResult>();
const mockUseAuth = vi.fn<() => { user: { role: UserRole } | null }>();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
    useSearchParams: () => [mockSearchParamsState.value, mockSetSearchParams] as const,
  };
});

vi.mock('lucide-react', () => {
  const Icon = () => <svg aria-hidden="true" />;
  return {
    Bell: Icon,
    Inbox: Icon,
    Mail: Icon,
    MessageSquare: Icon,
    Phone: Icon,
    Send: Icon,
    Store: Icon,
    User: Icon,
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div className={className} />,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (event: { target: { value: string } }) => void;
  }) => <textarea value={value} onChange={onChange} />,
}));

vi.mock('@/hooks/use-listing-inquiries', () => ({
  useListingInquiriesReceived: (filters: unknown, options?: ListingInquiriesQueryOptions) =>
    mockUseListingInquiriesReceived(filters, options),
  useListingInquiriesSent: (filters: unknown) => mockUseListingInquiriesSent(filters),
  useMarkListingInquiryRead: () => mockUseMarkListingInquiryRead(),
  useMarkListingInquiryReplied: () => mockUseMarkListingInquiryReplied(),
}));

vi.mock('@/hooks/use-users', () => ({
  usePublicUsers: (ids: string[]) => mockUsePublicUsers(ids),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/lib/dates', () => ({
  formatRelativeTime: () => 'just now',
}));

const inquiry: ListingInquiry = {
  id: 'inquiry-1',
  listingId: 'listing-1',
  listingTitle: 'Fresh Dates',
  listingOwnerId: 'owner-1',
  senderId: 'sender-1',
  receiverId: 'owner-1',
  contactName: 'Interested Buyer',
  contactEmail: 'buyer@example.com',
  contactPhone: '01000000000',
  message: 'Is this still available?',
  replyMessage: null,
  status: 'pending' as const,
  readAt: null,
  respondedAt: null,
  createdAt: '2026-04-01T09:00:00.000Z',
  updatedAt: '2026-04-01T09:00:00.000Z',
};

describe('ListingInquiriesPage', () => {
  beforeEach(() => {
    mockSearchParamsState.value = new URLSearchParams('focus=inquiry-1&tab=received');
    mockSetSearchParams.mockReset();
    mockUseListingInquiriesReceived.mockReset();
    mockUseListingInquiriesSent.mockReset();
    mockUseMarkListingInquiryRead.mockReset();
    mockUseMarkListingInquiryReplied.mockReset();
    mockUsePublicUsers.mockReset();
    mockUseAuth.mockReset();

    mockUseListingInquiriesReceived.mockReturnValue({
      data: { data: [inquiry], total: 1 },
      isLoading: false,
      isError: false,
    });
    mockUseListingInquiriesSent.mockReturnValue({
      data: { data: [], total: 0 },
      isLoading: false,
      isError: false,
    });
    mockUseMarkListingInquiryRead.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseMarkListingInquiryReplied.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUsePublicUsers.mockReturnValue({
      data: {
        'sender-1': { full_name: 'Interested Buyer' },
      },
    });
    mockUseAuth.mockReturnValue({
      user: { role: UserRole.MERCHANT },
    });
  });

  it('requests a larger page size when opening a focused inquiry from notifications', () => {
    render(<ListingInquiriesPage />);

    expect(mockUseListingInquiriesReceived).toHaveBeenCalledWith(
      { limit: 100 },
      { enabled: true },
    );
    expect(mockUseListingInquiriesSent).toHaveBeenCalledWith({ limit: 100 });
  });

  it('auto-marks a focused inquiry as read only once across rerenders', async () => {
    const mutate = vi.fn();
    let mutationState = {
      mutate,
      isPending: false,
    };

    mockUseMarkListingInquiryRead.mockImplementation(() => mutationState);

    const { rerender } = render(<ListingInquiriesPage />);

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledTimes(1);
    });

    mutationState = {
      mutate,
      isPending: false,
    };

    rerender(<ListingInquiriesPage />);

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledTimes(1);
    });
  });

  it('skips the received query for users who cannot receive marketplace inquiries', () => {
    mockUseAuth.mockReturnValue({
      user: { role: UserRole.TOURIST },
    });

    render(<ListingInquiriesPage />);

    expect(mockUseListingInquiriesReceived).toHaveBeenCalledWith(
      { limit: 100 },
      { enabled: false },
    );
    expect(mockUseListingInquiriesSent).toHaveBeenCalledWith({ limit: 100 });
  });
});
