import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ArtisanCard } from './ArtisanCard';

const mockUseAuth = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ArtisanCard', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('renders the localized English bio when available', () => {
    mockUseAuth.mockReturnValue({ language: 'en' });

    render(
      <MemoryRouter>
        <ArtisanCard
          artisan={{
            id: 'artisan-1',
            userId: 'user-1',
            nameAr: 'حرفي',
            nameEn: 'Artisan',
            bioAr: 'نبذة عربية',
            bioEn: 'English bio',
            craftTypes: ['palm_leaf'],
            area: 'kharga',
            whatsapp: '+201234567890',
            profileImageKey: null,
            verifiedAt: '2026-04-17T00:00:00.000Z',
            createdAt: '2026-04-17T00:00:00.000Z',
            updatedAt: '2026-04-17T00:00:00.000Z',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('English bio')).toBeInTheDocument();
    expect(screen.queryByText('نبذة عربية')).not.toBeInTheDocument();
  });
});
