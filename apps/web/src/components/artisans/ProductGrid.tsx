import type { ArtisanProduct } from '@/services/api';

import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: ArtisanProduct[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">لا توجد منتجات متاحة حالياً</div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
