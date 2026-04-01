import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  Bell,
  CalendarCheck,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  User,
  Wallet,
} from 'lucide-react';
import { Classic } from '@theme-toggles/react';
import '@theme-toggles/react/css/Classic.css';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useUnreadNotificationCount } from '@/hooks/use-notifications';
import { useAuth } from '@/hooks/use-auth';

type NavigationItem = {
  href: string;
  key: string;
  label: string;
  matcher: (pathname: string) => boolean;
};

function buildNavigation(language: 'ar' | 'en'): NavigationItem[] {
  const labels =
    language === 'en'
      ? {
          home: 'Home',
          tourism: 'Tourism',
          accommodation: 'Accommodation',
          guides: 'Guides',
          marketplace: 'Marketplace',
          logistics: 'Logistics',
          investment: 'Investment',
        }
      : {
          home: 'الرئيسية',
          tourism: 'السياحة',
          accommodation: 'الإقامة',
          guides: 'المرشدين',
          marketplace: 'البورصة',
          logistics: 'اللوجستيات',
          investment: 'الاستثمار',
        };

  const isAccommodationPath = (pathname: string) =>
    pathname.startsWith('/tourism/accommodation');

  return [
    {
      key: 'home',
      href: '/',
      label: labels.home,
      matcher: (pathname) => pathname === '/',
    },
    {
      key: 'tourism',
      href: '/tourism',
      label: labels.tourism,
      matcher: (pathname) =>
        pathname === '/tourism' || (pathname.startsWith('/tourism/') && !isAccommodationPath(pathname)),
    },
    {
      key: 'accommodation',
      href: '/tourism/accommodation',
      label: labels.accommodation,
      matcher: (pathname) => isAccommodationPath(pathname),
    },
    {
      key: 'guides',
      href: '/guides',
      label: labels.guides,
      matcher: (pathname) => pathname.startsWith('/guides'),
    },
    {
      key: 'marketplace',
      href: '/marketplace',
      label: labels.marketplace,
      matcher: (pathname) => pathname.startsWith('/marketplace'),
    },
    {
      key: 'logistics',
      href: '/logistics',
      label: labels.logistics,
      matcher: (pathname) => pathname.startsWith('/logistics'),
    },
    {
      key: 'investment',
      href: '/investment',
      label: labels.investment,
      matcher: (pathname) => pathname.startsWith('/investment'),
    },
  ];
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground">
        <div className="h-5 w-5" />
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Classic
      toggled={isDark}
      onToggle={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-amber-500 dark:hover:text-amber-400 [&>svg]:h-5 [&>svg]:w-5"
      aria-label="تبديل الوضع"
      placeholder={undefined}
      onPointerEnterCapture={undefined}
      onPointerLeaveCapture={undefined}
    />
  );
}

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const location = useLocation();
  const navigate = useNavigate();
  const authCtx = useAuth();
  const { user, direction, language } = authCtx;
  const { data: unreadData } = useUnreadNotificationCount();
  const unreadCount = unreadData?.count ?? 0;

  const navigation = useMemo(() => buildNavigation(language), [language]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    void navigate(`/search?q=${encodeURIComponent(query)}`);
    setSearchQuery('');
    setSearchOpen(false);
    setIsOpen(false);
  };

  const isActive = (item: NavigationItem) => item.matcher(location.pathname);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/icon-source.png" alt="هُنا وَادِينَا" className="h-9 w-9 rounded-lg" />
          <span className="text-xl font-bold text-foreground">هُنا وَادِينَا</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.key}
              to={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(item)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-1 lg:flex">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center gap-1">
              <Input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onBlur={() => {
                  if (!searchQuery) setSearchOpen(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setSearchQuery('');
                    setSearchOpen(false);
                  }
                }}
                placeholder="بحث..."
                className="h-9 w-48 text-sm"
              />
            </form>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setSearchOpen(true)}
              aria-label="بحث"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}

          <ThemeToggle />

          {user ? (
            <>
              <Link to="/notifications" className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-card animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </Link>

              <Link to="/wallet">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <Wallet className="h-4 w-4" />
                  <span className="text-xs font-semibold">المحفظة</span>
                </Button>
              </Link>

              <div className="relative mr-1">
                <button
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-full p-1.5 transition-colors hover:bg-muted"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <User className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute left-0 top-full z-50 mt-2 w-56 animate-in slide-in-from-top-2 rounded-xl border border-border bg-card py-2 shadow-xl duration-200 fade-in">
                      <div className="border-b border-border px-4 py-3">
                        <p className="truncate text-sm font-semibold">{user.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          to="/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                        >
                          <User className="h-4 w-4 text-muted-foreground" /> الملف الشخصي
                        </Link>
                        <Link
                          to="/bookings"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                        >
                          <CalendarCheck className="h-4 w-4 text-muted-foreground" /> حجوزاتي
                        </Link>
                        <Link
                          to="/wallet"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                        >
                          <Wallet className="h-4 w-4 text-muted-foreground" /> المحفظة
                        </Link>
                        <Link
                          to="/notifications"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                        >
                          <Bell className="h-4 w-4 text-muted-foreground" />
                          الإشعارات
                          {unreadCount > 0 && (
                            <span className="mr-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                              {unreadCount}
                            </span>
                          )}
                        </Link>
                      </div>
                      <div className="border-t border-border pt-1">
                        <button
                          onClick={() => {
                            void authCtx.logout();
                            setProfileOpen(false);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          <LogOut className="h-4 w-4" /> تسجيل الخروج
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="mr-2 flex items-center gap-2">
              <Link to="/login">
                <Button variant="outline" size="sm">
                  <User className="ml-2 h-4 w-4" />
                  تسجيل الدخول
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">إنشاء حساب</Button>
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <Link to="/search">
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Search className="h-5 w-5" />
            </Button>
          </Link>

          {user && (
            <Link to="/notifications" className="relative">
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-card animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </Link>
          )}

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side={direction === 'rtl' ? 'right' : 'left'} className="w-80">
              <div className="mt-8 flex flex-col gap-6">
                {user && (
                  <div className="flex items-center gap-3 rounded-xl border border-primary/10 bg-primary/5 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <User className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="بحث في المنصة..."
                    className="h-10 pr-10"
                  />
                </form>

                <nav className="flex flex-col gap-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.key}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                        isActive(item)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                {user ? (
                  <div className="flex flex-col gap-1 border-t border-border pt-4">
                    <Link
                      to="/profile"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <User className="h-5 w-5 text-muted-foreground" /> الملف الشخصي
                    </Link>
                    <Link
                      to="/bookings"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <CalendarCheck className="h-5 w-5 text-muted-foreground" /> حجوزاتي
                    </Link>
                    <Link
                      to="/wallet"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <Wallet className="h-5 w-5 text-muted-foreground" /> المحفظة
                    </Link>
                    <Link
                      to="/notifications"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      الإشعارات
                      {unreadCount > 0 && (
                        <span className="mr-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                    <button
                      onClick={() => {
                        void authCtx.logout();
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <LogOut className="h-5 w-5" /> تسجيل الخروج
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 border-t border-border pt-4">
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <Button className="w-full" variant="outline">
                        <User className="ml-2 h-4 w-4" />
                        تسجيل الدخول
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setIsOpen(false)}>
                      <Button className="w-full">إنشاء حساب</Button>
                    </Link>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
