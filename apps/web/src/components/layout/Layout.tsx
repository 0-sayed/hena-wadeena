import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { AIConcierge } from '@/components/ai/AIConcierge';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <AIConcierge />
    </div>
  );
}
