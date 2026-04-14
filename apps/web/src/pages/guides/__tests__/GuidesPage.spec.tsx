import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import GuidesPage from '../GuidesPage';

const mockUseGuides = vi.fn();
const mockUsePublicUsers = vi.fn();
const mockUseDebouncedCallback = vi.fn();

vi.mock('react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

vi.mock('lucide-react', () => {
  const Icon = () => <svg aria-hidden="true" />;
  return {
    AlertCircle: Icon,
    Search: Icon,
    Star: Icon,
    Users: Icon,
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/PageHero', () => ({
  PageHero: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/ScrollReveal', () => ({
  SR: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/PageTransition', () => ({
  PageTransition: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  CardSkeleton: () => <div>loading</div>,
}));

vi.mock('@/components/LoadMoreButton', () => ({
  LoadMoreButton: () => <div>load-more</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    className,
  }: {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    placeholder?: string;
    className?: string;
  }) => <input className={className} value={value} onChange={onChange} placeholder={placeholder} />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock('@/hooks/use-guides', () => ({
  useGuides: (filters?: Record<string, unknown>) => mockUseGuides(filters),
}));

vi.mock('@/hooks/use-debounce', () => ({
  useDebouncedCallback: (callback: (value: string) => void) => mockUseDebouncedCallback(callback),
}));

vi.mock('@/hooks/use-users', () => ({
  usePublicUsers: (userIds: string[]) => mockUsePublicUsers(userIds),
}));

vi.mock('@/assets/hero-guides.webp', () => ({
  default: 'hero-guides.webp',
}));

describe('GuidesPage', () => {
  beforeEach(() => {
    mockUseGuides.mockReset();
    mockUsePublicUsers.mockReset();
    mockUseDebouncedCallback.mockReset();

    mockUseGuides.mockReturnValue({
      data: [
        {
          id: 'guide-1',
          userId: 'user-1',
          bioAr: 'مرشد للرحلات الصحراوية',
          bioEn: null,
          profileImage: null,
          languages: ['arabic'],
          specialties: ['adventure'],
          areasOfOperation: ['kharga'],
          basePrice: 10000,
          ratingAvg: 4.5,
          ratingCount: 5,
          licenseVerified: true,
          packageCount: 2,
        },
        {
          id: 'guide-2',
          userId: 'user-2',
          bioAr: 'مرشد للآثار والمعابد',
          bioEn: null,
          profileImage: null,
          languages: ['english'],
          specialties: ['history'],
          areasOfOperation: ['dakhla'],
          basePrice: 10000,
          ratingAvg: 4.1,
          ratingCount: 3,
          licenseVerified: true,
          packageCount: 1,
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
    });
    mockUsePublicUsers.mockReturnValue({
      data: {
        'user-1': { display_name: 'سالم' },
        'user-2': { display_name: 'محمود' },
      },
    });
    mockUseDebouncedCallback.mockImplementation((callback: (value: string) => void) => callback);
  });

  it('sends search term to backend and renders only matching guides', () => {
    const allGuides = [
      {
        id: 'guide-1',
        userId: 'user-1',
        bioAr: 'مرشد للرحلات الصحراوية',
        bioEn: null,
        profileImage: null,
        languages: ['arabic'],
        specialties: ['adventure'],
        areasOfOperation: ['kharga'],
        basePrice: 10000,
        ratingAvg: 4.5,
        ratingCount: 5,
        licenseVerified: true,
        packageCount: 2,
      },
      {
        id: 'guide-2',
        userId: 'user-2',
        bioAr: 'مرشد للآثار والمعابد',
        bioEn: null,
        profileImage: null,
        languages: ['english'],
        specialties: ['history'],
        areasOfOperation: ['dakhla'],
        basePrice: 10000,
        ratingAvg: 4.1,
        ratingCount: 3,
        licenseVerified: true,
        packageCount: 1,
      },
    ];

    // Simulate backend filtering: only return guide-1 when search='مغا'
    mockUseGuides.mockImplementation((filters?: Record<string, unknown>) => ({
      data: filters?.search ? allGuides.slice(0, 1) : allGuides,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
    }));

    render(<GuidesPage />);

    fireEvent.change(screen.getByPlaceholderText('ابحث بالتخصص أو الوصف...'), {
      target: { value: 'مغا' },
    });

    expect(screen.getByText('سالم')).toBeInTheDocument();
    expect(screen.queryByText('محمود')).not.toBeInTheDocument();
  });

  it('uses the roomy hero search field sizing', () => {
    render(<GuidesPage />);

    expect(screen.getByPlaceholderText('ابحث بالتخصص أو الوصف...')).toHaveClass(
      'h-16',
      'text-lg',
      'md:h-16',
      'md:text-lg',
    );
  });
});
