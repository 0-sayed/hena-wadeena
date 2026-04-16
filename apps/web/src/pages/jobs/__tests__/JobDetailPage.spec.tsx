import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import i18n from 'i18next';

import JobDetailPage from '../JobDetailPage';

const mockNavigate = vi.fn();
const mockRefetch = vi.fn();

vi.mock('react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'job-1' }),
}));

vi.mock('lucide-react', () => ({
  ArrowRight: () => <svg aria-hidden="true" />,
  Briefcase: () => <svg aria-hidden="true" />,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children, title }: { children: ReactNode; title?: string }) => (
    <div data-title={title}>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
    asChild?: boolean;
    className?: string;
    disabled?: boolean;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode; variant?: string }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode; className?: string }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode; className?: string }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode; className?: string }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: { children: ReactNode; className?: string }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AvatarImage: ({ alt }: { src?: string; alt?: string }) => <img alt={alt} />,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    id,
    placeholder,
    value,
    onChange,
  }: {
    id?: string;
    placeholder?: string;
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    rows?: number;
  }) => <textarea id={id} placeholder={placeholder} value={value} onChange={onChange} />,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'worker-1' },
    isAuthenticated: true,
    language: 'en',
  }),
}));

vi.mock('@/hooks/use-jobs', () => ({
  useJob: () => ({
    data: {
      id: 'job-1',
      posterId: 'poster-1',
      title: 'Harvest worker',
      descriptionAr: 'وصف عربي',
      descriptionEn: 'English description',
      category: 'agriculture',
      area: 'kharga',
      compensation: 5000,
      compensationType: 'daily',
      slots: 3,
      status: 'open',
      startsAt: '2026-05-01T00:00:00.000Z',
      endsAt: '2026-05-05T00:00:00.000Z',
    },
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
  }),
  useMyApplications: () => ({
    data: {
      data: [{ jobId: 'job-1', status: 'accepted' }],
    },
    isLoading: false,
    isError: false,
  }),
  useApplyMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteJobMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/hooks/use-users', () => ({
  usePublicUsers: () => ({
    data: {
      'poster-1': {
        full_name: 'Farm Owner',
        avatar_url: null,
      },
    },
  }),
}));

describe('JobDetailPage', () => {
  beforeEach(() => {
    void i18n.changeLanguage('en');
    mockNavigate.mockReset();
    mockRefetch.mockReset();
  });

  it('renders job metadata labels in the active language', () => {
    render(<JobDetailPage />);

    expect(screen.getByText('Agriculture')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Kharga')).toBeInTheDocument();
    expect(screen.getByText('50 EGP / Daily')).toBeInTheDocument();
    expect(screen.getByText('3 slots')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('English description')).toBeInTheDocument();
    expect(screen.getByText('Current Application')).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.queryByText('زراعة')).not.toBeInTheDocument();
  });
});
