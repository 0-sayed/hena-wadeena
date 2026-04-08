import { fireEvent, render, screen } from '@testing-library/react';
import { Building2 } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BusinessLogo } from '../BusinessLogo';

describe('BusinessLogo', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders relative logo paths against the configured API origin', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.hena.test/api/v1');

    render(
      <BusinessLogo
        src="/uploads/logos/company.png"
        alt="Transport company"
        fallbackIcon={Building2}
      />,
    );

    const image = screen.getByRole('img', { name: 'Transport company' });
    expect(image).toHaveAttribute('src', 'https://api.hena.test/uploads/logos/company.png');
  });

  it('falls back to the placeholder icon when the logo fails to load', () => {
    render(
      <BusinessLogo
        src="https://cdn.hena.test/broken-logo.png"
        alt="Broken company logo"
        fallbackIcon={Building2}
      />,
    );

    const image = screen.getByRole('img', { name: 'Broken company logo' });
    fireEvent.error(image);

    expect(screen.queryByRole('img', { name: 'Broken company logo' })).not.toBeInTheDocument();
    expect(document.querySelector('svg')).toBeInTheDocument();
  });
});
