import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { usePageTitle } from '@/hooks/use-page-title';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export function Layout({ children, title }: LayoutProps) {
  usePageTitle(title);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
