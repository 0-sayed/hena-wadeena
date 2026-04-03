import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import TourismPage from '../TourismPage';

const mockNavigate = vi.fn();
const mockUseAuth = vi.fn();
const mockUseAttractions = vi.fn();
const mockUseGuides = vi.fn();
const mockUsePublicUsers = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('lucide-react', () => {
  const Icon = () => <svg aria-hidden="true" />;

  return {
    ArrowLeft: Icon,
    Calendar: Icon,
    Clock: Icon,
    MapPin: Icon,
    Search: Icon,
    Star: Icon,
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

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    type,
  }: {
    children: ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    placeholder?: string;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <div onClick={onClick}>{children}</div>
  ),
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/hooks/use-attractions', () => ({
  useAttractions: (filters?: Record<string, unknown>) => mockUseAttractions(filters),
}));

vi.mock('@/hooks/use-guides', () => ({
  useGuides: (filters?: Record<string, unknown>) => mockUseGuides(filters),
}));

vi.mock('@/hooks/use-users', () => ({
  usePublicUsers: (userIds: string[]) => mockUsePublicUsers(userIds),
}));

vi.mock('@/assets/hero-tourism.jpg', () => ({
  default: 'hero-tourism.jpg',
}));

describe('TourismPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseAuth.mockReset();
    mockUseAttractions.mockReset();
    mockUseGuides.mockReset();
    mockUsePublicUsers.mockReset();

    mockUseAuth.mockReturnValue({ language: 'ar', user: null });

    mockUseAttractions.mockImplementation((filters?: Record<string, unknown>) => ({
      data:
        filters?.featured === true
          ? [
              {
                id: 'attr-1',
                nameAr: 'معبد هيبس',
                nameEn: 'Temple of Hibis',
                slug: 'hibis',
                type: 'historical',
                area: 'kharga',
                descriptionAr: 'معبد أثري مشهور',
                descriptionEn: null,
                historyAr: null,
                bestSeason: null,
                bestTimeOfDay: null,
                entryFee: null,
                openingHours: null,
                durationHours: 2,
                difficulty: null,
                tips: [],
                nearbySlugs: [],
                location: null,
                images: [],
                thumbnail: null,
                isActive: true,
                isFeatured: true,
                ratingAvg: 4.7,
                reviewCount: 12,
                createdAt: '',
                updatedAt: '',
              },
            ]
          : [
              {
                id: 'attr-2',
                nameAr: 'عين الفرافرة',
                nameEn: 'Farafra Spring',
                slug: 'farafra-spring',
                type: 'natural',
                area: 'farafra',
                descriptionAr: 'موقع طبيعي هادئ',
                descriptionEn: null,
                historyAr: null,
                bestSeason: null,
                bestTimeOfDay: null,
                entryFee: null,
                openingHours: null,
                durationHours: 1,
                difficulty: null,
                tips: [],
                nearbySlugs: [],
                location: null,
                images: [],
                thumbnail: null,
                isActive: true,
                isFeatured: false,
                ratingAvg: 4.3,
                reviewCount: 8,
                createdAt: '',
                updatedAt: '',
              },
            ],
      isLoading: false,
    }));

    mockUseGuides.mockReturnValue({
      data: [
        {
          id: 'guide-1',
          userId: 'user-1',
          bioAr: 'مرشد لرحلات الصحراء',
          bioEn: null,
          profileImage: null,
          languages: ['arabic'],
          specialties: ['adventure'],
          areasOfOperation: ['kharga'],
          basePrice: 10000,
          ratingAvg: 4.5,
          ratingCount: 5,
        },
      ],
      isLoading: false,
    });

    mockUsePublicUsers.mockReturnValue({
      data: {
        'user-1': { display_name: 'سالم' },
      },
    });
  });

  it('filters tourism content locally instead of navigating to the global search page', () => {
    render(<TourismPage />);

    fireEvent.change(screen.getByPlaceholderText('ابحث عن معالم أو مرشدين...'), {
      target: { value: 'هيب' },
    });

    expect(screen.getByText('معبد هيبس')).toBeInTheDocument();
    expect(screen.queryByText('عين الفرافرة')).not.toBeInTheDocument();
    expect(screen.queryByText('سالم')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ابحث' }));

    expect(mockNavigate).not.toHaveBeenCalledWith('/search?q=%D9%87%D9%8A%D8%A8');
  });

  it('matches guide display names through normalized local search', () => {
    render(<TourismPage />);

    fireEvent.change(screen.getByPlaceholderText('ابحث عن معالم أو مرشدين...'), {
      target: { value: 'سال' },
    });

    expect(screen.getByText('سالم')).toBeInTheDocument();
    expect(screen.queryByText('معبد هيبس')).not.toBeInTheDocument();
    expect(screen.queryByText('عين الفرافرة')).not.toBeInTheDocument();
  });
});
