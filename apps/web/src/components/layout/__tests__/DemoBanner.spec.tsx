import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DemoBanner } from '../DemoBanner';

const mockUseAuth = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('DemoBanner', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      language: 'en',
    });
  });

  it('renders repeated moving demo notices with animated icons', () => {
    const { container } = render(<DemoBanner />);

    expect(screen.getByRole('status', { name: 'Demo mode notice' })).toBeInTheDocument();
    expect(
      screen.getAllByText(
        'DEMO MODE - All data on this platform is simulated for demonstration only',
      ),
    ).toHaveLength(4);
    expect(container.querySelectorAll('[data-testid="demo-banner-icon"]')).toHaveLength(4);
    expect(container.querySelector('.animate-ticker-ltr')).toBeInTheDocument();
  });
});
