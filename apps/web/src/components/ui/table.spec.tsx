import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

describe('Table primitives', () => {
  it('apply the shared fixed-layout and logical alignment defaults', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المنتج</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>فول سوداني</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const table = screen.getByRole('table');
    const [headerCell] = within(table).getAllByRole('columnheader');
    const [bodyCell] = within(table).getAllByRole('cell');

    expect(table).toHaveClass('table-fixed');
    expect(headerCell).toHaveClass('text-start');
    expect(bodyCell).toHaveClass('text-start');
  });
});
