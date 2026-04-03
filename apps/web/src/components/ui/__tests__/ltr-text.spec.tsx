import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LtrText } from '../ltr-text';

describe('LtrText', () => {
  it('renders display-only contact text in LTR', () => {
    render(<LtrText>user@example.com</LtrText>);

    expect(screen.getByText('user@example.com')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByText('user@example.com')).toHaveClass('text-left');
  });
});
