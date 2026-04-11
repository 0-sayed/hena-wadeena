import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...(actual as object),
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  };
});

vi.mock('lucide-react', () => {
  const Icon = () => <svg aria-hidden="true" />;
  return { Briefcase: Icon, Plus: Icon, ChevronLeft: Icon, ChevronRight: Icon, Filter: Icon };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton">loading</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <div onClick={onClick}>{children}</div>
  ),
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: ReactNode;
    onValueChange?: (v: string) => void;
  }) => (
    <div data-testid="select" onClick={() => onValueChange?.('agriculture')}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

const mockUseJobs = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/hooks/use-jobs', () => ({
  useJobs: (...args: unknown[]) => mockUseJobs(...args),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

import JobBoardPage from '../JobBoardPage';

// ── Tests ─────────────────────────────────────────────────────────────────────

const mockJob = {
  id: 'job-1',
  posterId: 'user-1',
  title: 'عامل زراعي',
  descriptionAr: 'وصف الوظيفة',
  descriptionEn: null,
  category: 'agriculture',
  area: 'kharga',
  compensation: 5000,
  compensationType: 'daily',
  slots: 3,
  status: 'open',
  startsAt: null,
  endsAt: null,
  createdAt: '2026-04-01T00:00:00Z',
};

describe('JobBoardPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });
  });

  it('renders skeleton while loading', () => {
    mockUseJobs.mockReturnValue({ isLoading: true, data: undefined, isError: false });
    render(<JobBoardPage />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('renders job cards from mock data', async () => {
    mockUseJobs.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { data: [mockJob], total: 1 },
    });
    render(<JobBoardPage />);
    await waitFor(() => {
      expect(screen.getByText('عامل زراعي')).toBeInTheDocument();
    });
  });

  it('renders empty state when no jobs returned', async () => {
    mockUseJobs.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { data: [], total: 0 },
    });
    render(<JobBoardPage />);
    await waitFor(() => {
      expect(screen.getByText('No jobs available at the moment')).toBeInTheDocument();
    });
  });

  it('shows "نشر وظيفة" button for merchant role', async () => {
    mockUseJobs.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { data: [], total: 0 },
    });
    mockUseAuth.mockReturnValue({
      user: { role: 'merchant' },
      isAuthenticated: true,
    });
    render(<JobBoardPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Post a Job').length).toBeGreaterThan(0);
    });
  });
});
