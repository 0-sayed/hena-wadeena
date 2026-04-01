import { UserRole } from '@hena-wadeena/types';
import {
  BarChart3,
  Home,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  Shield,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Suspense, useState } from 'react';
import { Link, Navigate, NavLink, Outlet } from 'react-router';

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
  const { user, isLoading, direction, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarEdgeClass = direction === 'rtl' ? 'right-0' : 'left-0';
  const sidebarHiddenClass = direction === 'rtl' ? 'translate-x-full' : '-translate-x-full';

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
          'fixed inset-y-0 z-50 flex w-64 flex-col bg-card shadow-lg transition-transform lg:static lg:translate-x-0',
          sidebarEdgeClass,
          sidebarOpen ? 'translate-x-0' : `${sidebarHiddenClass} lg:translate-x-0`,
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

        <div className="mt-auto border-t p-4">
          <div className="space-y-1">
            <Link
              to="/"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Home className="h-5 w-5" />
              العودة إلى الرئيسية
            </Link>
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <User className="h-5 w-5" />
              الملف الشخصي
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" />
              تسجيل الخروج
            </button>
          </div>
        </div>
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
          <div className="hidden items-center gap-2 lg:flex">
            <Button asChild variant="outline" size="sm">
              <Link to="/">
                <Home className="h-4 w-4" />
                الرئيسية
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/profile">
                <User className="h-4 w-4" />
                الملف الشخصي
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
              خروج
            </Button>
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
