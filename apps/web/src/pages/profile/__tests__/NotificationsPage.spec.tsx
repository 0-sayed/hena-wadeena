import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationType, type NotificationListResponse } from '@hena-wadeena/types';

import NotificationsPage from '../NotificationsPage';

let notificationState: NotificationListResponse;
type NotificationItem = NotificationListResponse['data'][number];

const mockQueryClient = {
  invalidateQueries: vi.fn(),
  setQueryData: vi.fn(),
};
const mockGetAll = vi.fn();
const mockMarkAllRead = vi.fn();
const mockMarkAllNotificationsAsRead = vi.fn();
const mockMarkRead = vi.fn();
const mockMarkNotificationAsRead = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  keepPreviousData: Symbol('keepPreviousData'),
  useQuery: () => ({
    data: notificationState,
    isLoading: false,
    error: null,
  }),
  useMutation: ({
    mutationFn,
    onSuccess,
    onError,
  }: {
    mutationFn: (...args: unknown[]) => unknown;
    onSuccess?: (...args: unknown[]) => void;
    onError?: (...args: unknown[]) => void;
  }) => ({
    isPending: false,
    mutate: async (value?: unknown) => {
      try {
        const response = await mutationFn(value);
        onSuccess?.(response, value, undefined, undefined);
      } catch (error) {
        onError?.(error, value, undefined, undefined);
      }
    },
    mutateAsync: async (value?: unknown) => {
      const response = await mutationFn(value);
      onSuccess?.(response, value, undefined, undefined);
      return response;
    },
  }),
  useQueryClient: () => mockQueryClient,
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/PageTransition', () => ({
  PageTransition: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  GradientMesh: () => null,
}));

vi.mock('@/components/motion/ScrollReveal', () => ({
  SR: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({
    children,
    onClick,
    className,
  }: {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <div onClick={onClick} className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type = 'button',
    className,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    className?: string;
  }) => (
    <button type={type} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
  }),
}));

vi.mock('@/lib/notifications-cache', () => ({
  markAllNotificationsAsRead: (...args: unknown[]) => mockMarkAllNotificationsAsRead(...args),
  markNotificationAsRead: (...args: unknown[]) => mockMarkNotificationAsRead(...args),
}));

vi.mock('@/lib/dates', () => ({
  formatRelativeTime: () => 'just now',
}));

vi.mock('@/services/api', () => ({
  notificationsAPI: {
    getAll: (...args: unknown[]) => mockGetAll(...args),
    markAllRead: () => mockMarkAllRead(),
    markRead: (id: string) => mockMarkRead(id),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe('NotificationsPage', () => {
  beforeEach(() => {
    notificationState = {
      data: [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: NotificationType.SYSTEM,
          titleAr: 'First notification',
          titleEn: 'First notification',
          bodyAr: 'A system notification',
          bodyEn: 'A system notification',
          data: null,
          readAt: null,
          createdAt: '2026-04-08T09:00:00.000Z',
        },
        {
          id: 'notif-2',
          userId: 'user-1',
          type: NotificationType.BOOKING_CONFIRMED,
          titleAr: 'Booking confirmed',
          titleEn: 'Booking confirmed',
          bodyAr: 'The booking is confirmed',
          bodyEn: 'The booking is confirmed',
          data: null,
          readAt: null,
          createdAt: '2026-04-08T09:05:00.000Z',
        },
      ],
      total: 2,
      page: 1,
      limit: 20,
      hasMore: false,
      unreadCount: 2,
    };

    mockQueryClient.invalidateQueries.mockReset();
    mockQueryClient.setQueryData.mockReset();
    mockGetAll.mockReset();
    mockMarkAllRead.mockReset();
    mockMarkAllNotificationsAsRead.mockReset();
    mockMarkRead.mockReset();
    mockMarkNotificationAsRead.mockReset();

    mockGetAll.mockResolvedValue(notificationState);
    mockMarkAllRead.mockResolvedValue({ success: true });
    mockMarkRead.mockResolvedValue({ success: true });
    mockMarkAllNotificationsAsRead.mockImplementation((value: NotificationListResponse | undefined) =>
      value
        ? {
            ...value,
            data: value.data.map((notification: NotificationItem) => ({
              ...notification,
              readAt: '2026-04-08T09:10:00.000Z',
            })),
            unreadCount: 0,
          }
        : undefined,
    );
    mockMarkNotificationAsRead.mockImplementation((value: NotificationListResponse | undefined, id: string) =>
      value
        ? {
            ...value,
            data: value.data.map((notification: NotificationItem) =>
              notification.id === id
                ? { ...notification, readAt: '2026-04-08T09:10:00.000Z' }
                : notification,
            ),
            unreadCount: Math.max(
              0,
              value.data.filter(
                (notification: NotificationItem) => !notification.readAt && notification.id !== id,
              ).length,
            ),
          }
        : undefined,
    );

    mockQueryClient.setQueryData.mockImplementation((key: unknown, value: unknown) => {
      if (JSON.stringify(key) === JSON.stringify(['notifications', 'list', { page: 1, limit: 20 }])) {
        notificationState =
          typeof value === 'function'
            ? value(notificationState)
            : (value as NotificationListResponse);
      }
    });
  });

  it('keeps notifications visible after marking all as read and clears the unread badge', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('First notification')).toBeInTheDocument();
    expect(screen.getByText('Booking confirmed')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
    });

    rerender(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('First notification')).toBeInTheDocument();
    expect(screen.getByText('Booking confirmed')).toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('does not clear the cached list or unread badge when the optimistic mark-all update cannot build a next list', async () => {
    mockMarkAllNotificationsAsRead.mockReturnValue(undefined);

    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
    });

    expect(mockQueryClient.setQueryData).not.toHaveBeenCalledWith(
      ['notifications', 'list', { page: 1, limit: 20 }],
      undefined,
    );
    expect(mockQueryClient.setQueryData).not.toHaveBeenCalledWith(
      ['notifications', 'unreadCount'],
      { count: 0 },
    );
  });
});
