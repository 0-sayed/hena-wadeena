import { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { DemoBanner } from './DemoBanner';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';
import { shouldShowMobileBottomNav } from './mobile-bottom-nav-visibility';
import { usePageTitle } from '@/hooks/use-page-title';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export function Layout({ children, title }: LayoutProps) {
  usePageTitle(title);
  const { pathname } = useLocation();
  const showMobileBottomNav = shouldShowMobileBottomNav(pathname);

  return (
    <div className={`flex min-h-screen flex-col ${showMobileBottomNav ? 'pb-24 md:pb-0' : ''}`}>
      <div className="sticky top-0 z-50">
        <DemoBanner />
        <Header />
      </div>
      <main className="flex-1">{children}</main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
