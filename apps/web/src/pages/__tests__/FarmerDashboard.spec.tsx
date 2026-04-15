import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUseWellLogSummary = vi.fn();
const mockUseCreateWellLog = vi.fn();

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

vi.mock('@/components/dashboard/StatCard', () => ({
  StatCard: ({ label, value }: { label: string; value: string | number }) => (
    <div>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
}));

vi.mock('@/components/dashboard/EmptyState', () => ({
  EmptyState: ({
    message,
    actionLabel,
    actionHref,
  }: {
    icon: unknown;
    message: string;
    actionLabel?: string;
    actionHref?: string;
  }) => (
    <div>
      <p>{message}</p>
      {actionLabel && actionHref && <a href={actionHref}>{actionLabel}</a>}
    </div>
  ),
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
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CardFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    open = true,
  }: {
    children: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: ReactNode;
    onValueChange?: (value: string) => void;
  }) => (
    <div data-testid="select" onClick={() => onValueChange?.('kharga')}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
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

vi.mock('lucide-react', () => {
  const Icon = () => <svg aria-hidden="true" />;
  return {
    Droplets: Icon,
    Zap: Icon,
    DollarSign: Icon,
    Gauge: Icon,
    Plus: Icon,
    Sun: Icon,
    ExternalLink: Icon,
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    language: 'en',
    direction: 'ltr',
    user: null,
    isAuthenticated: true,
  }),
}));

vi.mock('@/hooks/use-well-logs', () => ({
  useWellLogSummary: () => mockUseWellLogSummary(),
  useCreateWellLog: () => mockUseCreateWellLog(),
}));

import FarmerDashboard from '../roles/FarmerDashboard';

describe('FarmerDashboard', () => {
  beforeEach(() => {
    mockUseWellLogSummary.mockReset();
    mockUseCreateWellLog.mockReset();

    mockUseCreateWellLog.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it('shows loading skeletons when data is loading', () => {
    mockUseWellLogSummary.mockReturnValue({ isLoading: true, data: undefined });

    render(<FarmerDashboard />);

    expect(screen.getAllByText('loading').length).toBeGreaterThan(0);
  });

  it('shows empty state and Log Reading button when months is empty', () => {
    mockUseWellLogSummary.mockReturnValue({
      isLoading: false,
      data: { months: [], solar: null },
    });

    render(<FarmerDashboard />);

    expect(screen.getByText('Log your first pump session')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Log Reading' }).length).toBeGreaterThanOrEqual(1);
  });

  it('shows table rows for each month when data is present', () => {
    mockUseWellLogSummary.mockReturnValue({
      isLoading: false,
      data: {
        months: [
          {
            year_month: '2025-03',
            total_pump_hours: 120,
            total_kwh: 480,
            total_cost_piasters: 96000,
            avg_cost_per_m3_piasters: null,
            avg_depth_to_water_m: 15,
          },
          {
            year_month: '2025-02',
            total_pump_hours: 100,
            total_kwh: 400,
            total_cost_piasters: 80000,
            avg_cost_per_m3_piasters: null,
            avg_depth_to_water_m: 14,
          },
        ],
        solar: null,
      },
    });

    render(<FarmerDashboard />);

    const rows = screen.getAllByRole('row');
    // 1 header row + 2 data rows
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('2025-03')).toBeInTheDocument();
    expect(screen.getByText('2025-02')).toBeInTheDocument();
    expect(screen.getAllByText('480').length).toBeGreaterThan(0);
    // 960 EGP = 96000 piasters / 100
    expect(screen.getAllByText('960').length).toBeGreaterThan(0);
  });

  it('hides the solar card when solar is null', () => {
    mockUseWellLogSummary.mockReturnValue({
      isLoading: false,
      data: {
        months: [
          {
            year_month: '2025-01',
            total_pump_hours: 80,
            total_kwh: 320,
            total_cost_piasters: 64000,
            avg_cost_per_m3_piasters: null,
            avg_depth_to_water_m: null,
          },
        ],
        solar: null,
      },
    });

    render(<FarmerDashboard />);

    expect(screen.queryByText('Solar Estimator')).not.toBeInTheDocument();
    expect(screen.queryByText('تقدير الطاقة الشمسية')).not.toBeInTheDocument();
  });

  it('shows solar card when solar estimate is available', () => {
    mockUseWellLogSummary.mockReturnValue({
      isLoading: false,
      data: {
        months: [
          {
            year_month: '2025-01',
            total_pump_hours: 80,
            total_kwh: 320,
            total_cost_piasters: 64000,
            avg_cost_per_m3_piasters: null,
            avg_depth_to_water_m: null,
          },
          {
            year_month: '2025-02',
            total_pump_hours: 90,
            total_kwh: 360,
            total_cost_piasters: 72000,
            avg_cost_per_m3_piasters: null,
            avg_depth_to_water_m: null,
          },
          {
            year_month: '2025-03',
            total_pump_hours: 100,
            total_kwh: 400,
            total_cost_piasters: 80000,
            avg_cost_per_m3_piasters: null,
            avg_depth_to_water_m: null,
          },
        ],
        solar: {
          avg_monthly_kwh: 360,
          avg_monthly_cost_piasters: 72000,
          estimated_monthly_saving_piasters: 50000,
          farmer_net_cost_piasters: 22000,
          break_even_months: 24,
          nrea_url: 'https://nrea.gov.eg',
        },
      },
    });

    render(<FarmerDashboard />);

    expect(screen.getByText('Solar Estimator')).toBeInTheDocument();
    // 720 EGP = 72000 piasters / 100 — appears in both table row and solar card
    expect(screen.getAllByText('720').length).toBeGreaterThan(0);
  });

  it('shows break-even months when present in solar estimate', () => {
    mockUseWellLogSummary.mockReturnValue({
      isLoading: false,
      data: {
        months: [
          {
            year_month: '2025-01',
            total_pump_hours: 80,
            total_kwh: 320,
            total_cost_piasters: 64000,
            avg_cost_per_m3_piasters: null,
            avg_depth_to_water_m: null,
          },
          {
            year_month: '2025-02',
            total_pump_hours: 90,
            total_kwh: 360,
            total_cost_piasters: 72000,
            avg_cost_per_m3_piasters: null,
            avg_depth_to_water_m: null,
          },
          {
            year_month: '2025-03',
            total_pump_hours: 100,
            total_kwh: 400,
            total_cost_piasters: 80000,
            avg_cost_per_m3_piasters: null,
            avg_depth_to_water_m: null,
          },
        ],
        solar: {
          avg_monthly_kwh: 360,
          avg_monthly_cost_piasters: 72000,
          estimated_monthly_saving_piasters: 50000,
          farmer_net_cost_piasters: 22000,
          break_even_months: 36,
          nrea_url: 'https://nrea.gov.eg',
        },
      },
    });

    render(<FarmerDashboard />);

    expect(screen.getByText('36')).toBeInTheDocument();
  });
});
