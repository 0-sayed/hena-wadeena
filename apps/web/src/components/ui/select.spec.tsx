import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

describe('Select', () => {
  const originalDir = document.documentElement.dir;

  afterEach(() => {
    document.documentElement.dir = originalDir;
  });

  it('inherits rtl direction from the document for portal content', () => {
    document.documentElement.dir = 'rtl';

    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="جميع المدن" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">جميع المدن</SelectItem>
          <SelectItem value="kharga">الخارجة</SelectItem>
        </SelectContent>
      </Select>,
    );

    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByRole('listbox')).toHaveAttribute('dir', 'rtl');
  });
});
