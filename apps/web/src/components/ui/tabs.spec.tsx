import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Tabs, TabsList, TabsTrigger } from './tabs';

describe('Tabs primitives', () => {
  it('keep the shared segmented-control shape when pages add layout classes', () => {
    render(
      <Tabs defaultValue="prices">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl">
          <TabsTrigger value="prices" className="rounded-xl">
            لوحة الأسعار
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="rounded-xl">
            دليل الموردين
          </TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    const list = screen.getByRole('tablist');
    const priceTab = screen.getByRole('tab', { name: 'لوحة الأسعار' });

    expect(list).toHaveClass('grid', 'w-full', 'grid-cols-2', 'rounded-sm');
    expect(list).not.toHaveClass('rounded-2xl');
    expect(priceTab).toHaveClass('w-full', 'rounded-sm');
    expect(priceTab).not.toHaveClass('rounded-xl');
  });
});
