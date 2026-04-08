import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAdminStats = vi.fn();
const mockUseAdminKyc = vi.fn();
const mockUseAdminPendingListings = vi.fn();
const mockUseAdminPendingBusinesses = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  };
});

vi.mock('@/components/dashboard/DashboardShell', () => ({
  DashboardShell: ({
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle: string;
    children: ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
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

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, colSpan }: { children: ReactNode; colSpan?: number }) => (
    <td colSpan={colSpan}>{children}</td>
  ),
  TableHead: ({ children, className }: { children: ReactNode; className?: string }) => (
    <th className={className}>{children}</th>
  ),
  TableHeader: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value }: { value?: string }) => <textarea value={value} readOnly />,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/components/admin/DocumentViewerDialog', () => ({
  DocumentViewerDialog: () => <div>document-viewer</div>,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    language: 'en',
    direction: 'ltr',
    user: null,
  }),
}));

vi.mock('@/hooks/use-admin', () => ({
  useAdminStats: () => mockUseAdminStats(),
  useAdminKyc: (...args: unknown[]) => mockUseAdminKyc(...args),
  useAdminPendingListings: () => mockUseAdminPendingListings(),
  useAdminPendingBusinesses: () => mockUseAdminPendingBusinesses(),
  useReviewKyc: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
  useVerifyListing: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
  useVerifyBusiness: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
}));

import AdminOverview from '../admin/AdminOverview';
import ReviewerDashboard from '../reviewer/ReviewerDashboard';

describe('Admin localization', () => {
  beforeEach(() => {
    mockUseAdminStats.mockReset();
    mockUseAdminKyc.mockReset();
    mockUseAdminPendingListings.mockReset();
    mockUseAdminPendingBusinesses.mockReset();

    mockUseAdminStats.mockReturnValue({
      data: {
        users: { total: 120, byRole: {}, byStatus: {}, newLast30Days: 8 },
        kyc: { total: 10, pending: 3, underReview: 2, approved: 4, rejected: 1 },
        listings: { total: 24, verified: 20, unverified: 4 },
        pois: { total: 18, pending: 2, approved: 16, rejected: 0 },
        guides: { total: 6, active: 5, verified: 4, inactive: 1 },
        bookings: { total: 41, pending: 7, confirmed: 20, completed: 14, cancelled: 0 },
        investments: { total: 9, totalApplications: 11 },
        meta: { cachedAt: '2026-04-02T10:00:00.000Z', degraded: false },
      },
      isLoading: false,
      error: null,
    });

    mockUseAdminKyc.mockReturnValue({
      data: {
        total: 1,
        data: [
          {
            id: 'kyc-1',
            userId: 'user-1',
            fullName: 'Salma Hassan',
            documentType: 'national_id',
            documentUrl: 'https://example.com/doc.pdf',
            status: 'pending',
            submittedAt: '2026-04-01T10:00:00.000Z',
            reviewedAt: null,
            reviewedBy: null,
            reviewedByName: null,
            notes: null,
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    mockUseAdminPendingListings.mockReturnValue({
      data: { total: 1, data: [] },
      isLoading: false,
      error: null,
    });

    mockUseAdminPendingBusinesses.mockReturnValue({
      data: { total: 1, data: [] },
      isLoading: false,
      error: null,
    });
  });

  it('renders AdminOverview in English mode', () => {
    render(<AdminOverview />);

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('Platform metrics and pending review queues')).toBeInTheDocument();
    expect(screen.getByText('Total users')).toBeInTheDocument();
    expect(screen.getByText('Pending KYC submissions')).toBeInTheDocument();
    expect(screen.getByText('Pending points of interest')).toBeInTheDocument();
    expect(screen.getByText('Announcements')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New announcement' })).toBeInTheDocument();
    expect(screen.getByText(/Updated:/)).toBeInTheDocument();
  });

  it('renders ReviewerDashboard and moderation tables in English mode', () => {
    render(<ReviewerDashboard />);

    expect(screen.getByRole('heading', { name: 'Reviewer dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Track content and moderation items that need review')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Moderation and approvals' })).toBeInTheDocument();
    expect(screen.getByText('Review pending requests and approve or reject them')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Listings/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Businesses/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'KYC submissions' })).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Document type')).toBeInTheDocument();
    expect(screen.getByText('Submitted on')).toBeInTheDocument();
    expect(screen.getByText('National ID')).toBeInTheDocument();
  });
});
