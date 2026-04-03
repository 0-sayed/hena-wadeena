import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from '../input';

describe('Input contact direction', () => {
  it('forces phone inputs to render LTR', () => {
    render(<Input type="tel" aria-label="phone" />);

    const input = screen.getByLabelText('phone');
    expect(input).toHaveAttribute('dir', 'ltr');
    expect(input).toHaveClass('text-left');
  });

  it('forces email inputs to render LTR', () => {
    render(<Input type="email" aria-label="email" />);

    const input = screen.getByLabelText('email');
    expect(input).toHaveAttribute('dir', 'ltr');
    expect(input).toHaveClass('text-left');
  });

  it('does not override non-contact input types', () => {
    render(<Input type="text" aria-label="generic" />);

    expect(screen.getByLabelText('generic')).not.toHaveAttribute('dir');
  });
});
