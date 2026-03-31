import { UserRole } from '@hena-wadeena/types';
import { BarChart3, Leaf, MapPin, Menu, Shield, UserCheck, Users, X } from 'lucide-react';
import { Suspense, useState } from 'react';
import { Navigate, NavLink, Outlet } from 'react-router';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/admin/overview', label: 'نظرة عامة', icon: BarChart3 },
  { to: '/admin/users', label: 'المستخدمون', icon: Users },
  { to: '/admin/moderation', label: 'المراجعة', icon: UserCheck },
  { to: '/admin/guides', label: 'المرشدون', icon: Shield },
  { to: '/admin/map', label: 'الخريطة', icon: MapPin },
  { to: '/admin/crops', label: 'المحاصيل', icon: Leaf },
];

export default function AdminLayout() {
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || user.role !== UserRole.ADMIN) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-64 transform bg-card shadow-lg transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold">لوحة التحكم</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="space-y-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }: { isActive: boolean }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">مرحباً،</span>
            <span className="font-medium">{user.full_name}</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
