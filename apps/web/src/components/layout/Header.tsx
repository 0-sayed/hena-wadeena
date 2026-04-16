import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Briefcase,
  CalendarCheck,
  ChevronDown,
  FileCheck,
  LayoutDashboard,
  Languages,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Search,
  Shield,
  Sun,
  User,
  Wallet,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LtrText } from '@/components/ui/ltr-text';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { hasRequiredRole } from '@/components/auth/access-control';
import { useAuth } from '@/hooks/use-auth';
import { useUnreadNotificationCount } from '@/hooks/use-notifications';
import { getRoleDashboardPath } from '@/lib/role-utils';
import { UserRole } from '@hena-wadeena/types';

type AppLanguage = 'ar' | 'en';

type NavigationItem = {
  href: string;
  key: string;
  labelKey: string;
  matcher: (pathname: string) => boolean;
};

const CONTROL_BUTTON_CLASS =
  'flex h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50 md:h-9 md:min-w-9';

function buildNavigation(): NavigationItem[] {
  const isAccommodationPath = (pathname: string) => pathname.startsWith('/tourism/accommodation');

  return [
    {
      key: 'home',
      href: '/',
      labelKey: 'nav.home',
      matcher: (pathname) => pathname === '/',
    },
    {
      key: 'tourism',
      href: '/tourism',
      labelKey: 'nav.tourism',
      matcher: (pathname) =>
        pathname === '/tourism' ||
        (pathname.startsWith('/tourism/') && !isAccommodationPath(pathname)),
    },
    {
      key: 'guides',
      href: '/guides',
      labelKey: 'nav.guides',
      matcher: (pathname) => pathname.startsWith('/guides'),
    },
    {
      key: 'accommodation',
      href: '/tourism/accommodation',
      labelKey: 'nav.accommodation',
      matcher: (pathname) => isAccommodationPath(pathname),
    },
    {
      key: 'logistics',
      href: '/logistics',
      labelKey: 'nav.logistics',
      matcher: (pathname) => pathname.startsWith('/logistics'),
    },
    {
      key: 'marketplace',
      href: '/marketplace',
      labelKey: 'nav.marketplace',
      matcher: (pathname) => pathname.startsWith('/marketplace'),
    },
    {
      key: 'investment',
      href: '/investment',
      labelKey: 'nav.investment',
      matcher: (pathname) => pathname.startsWith('/investment'),
    },
    {
      key: 'jobs',
      href: '/jobs',
      labelKey: 'nav.jobs',
      matcher: (pathname) => pathname.startsWith('/jobs'),
    },
    {
      key: 'news',
      href: '/news',
      labelKey: 'nav.news',
      matcher: (pathname) => pathname.startsWith('/news'),
    },
  ];
}

function ThemeToggle() {
  const { t } = useTranslation('layout');
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground md:h-9 md:w-9">
        <div className="h-5 w-5" />
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';
  const label = t('header.themeToggle');

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`${CONTROL_BUTTON_CLASS} w-11 shrink-0 hover:text-amber-500 dark:hover:text-amber-400 md:w-9 [&>svg]:h-5 [&>svg]:w-5`}
      aria-label={label}
      title={label}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

function LanguageToggle({
  language,
  disabled = false,
  onToggle,
}: {
  language: AppLanguage;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation('layout');
  const nextLanguage = language === 'ar' ? 'en' : 'ar';
  const title = language === 'ar' ? t('header.switchToEnglish') : t('header.switchToArabic');

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`${CONTROL_BUTTON_CLASS} w-[3.125rem] gap-1 px-1.5 text-[10px] font-bold uppercase tracking-[0.16em] sm:w-12 sm:px-2 sm:text-[11px] sm:tracking-[0.18em]`}
      aria-label={title}
      title={title}
      dir="ltr"
    >
      <Languages className="h-3.5 w-3.5" />
      <span>{nextLanguage.toUpperCase()}</span>
    </button>
  );
}

function HeaderActionCluster({
  language,
  disabled,
  onToggleLanguage,
}: {
  language: AppLanguage;
  disabled?: boolean;
  onToggleLanguage: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-background/80 p-0.5 shadow-sm sm:gap-1 sm:p-1">
      <LanguageToggle language={language} disabled={disabled} onToggle={onToggleLanguage} />
      <ThemeToggle />
    </div>
  );
}

export function Header() {
  const { t } = useTranslation('layout');
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSwitchingLanguage, setIsSwitchingLanguage] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const authCtx = useAuth();
  const { user, direction, language, setLanguage } = authCtx;
  const { data: unreadData } = useUnreadNotificationCount();
  const unreadCount = unreadData?.count ?? 0;

  const navigation = useMemo(() => buildNavigation(), []);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();

    if (!query) {
      return;
    }

    void navigate(`/search?q=${encodeURIComponent(query)}`);
    setSearchQuery('');
    setSearchOpen(false);
    setIsOpen(false);
  };

  const handleLanguageToggle = () => {
    const nextLanguage: AppLanguage = language === 'ar' ? 'en' : 'ar';

    setIsSwitchingLanguage(true);
    void setLanguage(nextLanguage)
      .catch(() => {
        toast.error(
          nextLanguage === 'en'
            ? t('header.languageSwitchEnglishError')
            : t('header.languageSwitchArabicError'),
        );
      })
      .finally(() => {
        setIsSwitchingLanguage(false);
      });
  };

  const roleDashboardPath = user ? getRoleDashboardPath(user.role) : null;

  const isActive = (item: NavigationItem) => item.matcher(location.pathname);

  return (
    <header className="w-full border-b border-border/40 bg-card/50 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-2 px-3 sm:px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 overflow-hidden">
          <img
            src="/icon-source.png"
            alt={t('header.brand')}
            className="h-8 w-8 rounded-lg sm:h-9 sm:w-9"
          />
          <span className="truncate text-base font-bold text-foreground sm:text-xl">
            {t('header.brand')}
          </span>
          <span className="mt-1 hidden self-start rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 sm:inline-flex">
            {t('header.beta')}
          </span>
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
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center gap-1">
              <Input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onBlur={() => {
                  if (!searchQuery) {
                    setSearchOpen(false);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setSearchQuery('');
                    setSearchOpen(false);
                  }
                }}
                placeholder={t('header.searchPlaceholder')}
                aria-label={t('header.search')}
                className="h-9 w-48 text-sm"
              />
            </form>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setSearchOpen(true)}
              aria-label={t('header.search')}
              title={t('header.search')}
            >
              <Search className="h-5 w-5" />
            </Button>
          )}

          <HeaderActionCluster
            language={language}
            disabled={isSwitchingLanguage}
            onToggleLanguage={handleLanguageToggle}
          />

          {user ? (
            <>
              <Link to="/notifications" className="relative" aria-label={t('header.notifications')}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={t('header.notifications')}
                  title={t('header.notifications')}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -end-0.5 -top-0.5 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-card">
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
                  <span className="text-xs font-semibold">{t('header.wallet')}</span>
                </Button>
              </Link>

              <div className="relative me-1">
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-full p-1.5 transition-colors hover:bg-muted"
                  aria-label={t('header.accountMenu')}
                  title={t('header.accountMenu')}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute start-0 top-full z-50 mt-2 w-56 animate-in fade-in slide-in-from-top-2 rounded-xl border border-border bg-card py-2 shadow-xl duration-200">
                      <div className="border-b border-border px-4 py-3">
                        <p className="truncate text-sm font-semibold">{user.full_name}</p>
                        <LtrText as="p" className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </LtrText>
                      </div>
                      <div className="py-1">
                        <Link
                          to="/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                        >
                          <User className="h-4 w-4 text-muted-foreground" />
                          {t('header.profile')}
                        </Link>
                        {roleDashboardPath && (
                          <Link
                            to={roleDashboardPath}
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                          >
                            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                            {t('header.myDashboard')}
                          </Link>
                        )}
                        <Link
                          to="/bookings"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                        >
                          <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                          {t('header.bookings')}
                        </Link>
                        <Link
                          to="/marketplace/inquiries"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                        >
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          {t('header.inquiries')}
                        </Link>
                        <Link
                          to="/jobs/my-applications"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                        >
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          {t('header.myApplications')}
                        </Link>
                        <Link
                          to="/jobs/my-posts"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                        >
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          {t('header.myPosts')}
                        </Link>
                        <Link
                          to="/wallet"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                        >
                          <Wallet className="h-4 w-4 text-muted-foreground" />
                          {t('header.wallet')}
                        </Link>
                        <Link
                          to="/notifications"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                        >
                          <Bell className="h-4 w-4 text-muted-foreground" />
                          {t('header.notifications')}
                          {unreadCount > 0 && (
                            <span className="me-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                              {unreadCount}
                            </span>
                          )}
                        </Link>
                      </div>
                      {(hasRequiredRole(user.role, [UserRole.ADMIN]) ||
                        hasRequiredRole(user.role, [UserRole.ADMIN, UserRole.REVIEWER])) && (
                        <div className="border-t border-border py-1">
                          {hasRequiredRole(user.role, [UserRole.ADMIN]) && (
                            <Link
                              to="/admin"
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                            >
                              <Shield className="h-4 w-4 text-muted-foreground" />
                              {t('header.adminDashboard')}
                            </Link>
                          )}
                          {hasRequiredRole(user.role, [UserRole.ADMIN, UserRole.REVIEWER]) && (
                            <Link
                              to="/reviewer"
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                            >
                              <FileCheck className="h-4 w-4 text-muted-foreground" />
                              {t('header.reviewerDashboard')}
                            </Link>
                          )}
                        </div>
                      )}
                      <div className="border-t border-border pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            authCtx.logout();
                            setProfileOpen(false);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          <LogOut className="h-4 w-4" />
                          {t('header.logout')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="me-2 flex items-center gap-2">
              <Link to="/login">
                <Button variant="outline" size="sm">
                  <User className="ms-2 h-4 w-4" />
                  {t('header.login')}
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">{t('header.register')}</Button>
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 lg:hidden">
          <Link to="/search" aria-label={t('header.search')}>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              aria-label={t('header.search')}
              title={t('header.search')}
            >
              <Search className="h-5 w-5" />
            </Button>
          </Link>

          <HeaderActionCluster
            language={language}
            disabled={isSwitchingLanguage}
            onToggleLanguage={handleLanguageToggle}
          />

          {user && (
            <Link to="/notifications" className="relative" aria-label={t('header.notifications')}>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                aria-label={t('header.notifications')}
                title={t('header.notifications')}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -end-0.5 -top-0.5 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-card">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </Link>
          )}

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('header.menu')}
                title={t('header.menu')}
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side={direction === 'rtl' ? 'right' : 'left'}
              className="w-[85vw] max-w-[22rem]"
            >
              <div className="mt-8 flex flex-col gap-6">
                {user && (
                  <div className="flex items-center gap-3 rounded-xl border border-primary/10 bg-primary/5 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt=""
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{user.full_name}</p>
                      <LtrText as="p" className="text-xs text-muted-foreground">
                        {user.email}
                      </LtrText>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSearch} className="relative">
                  <Search className="search-inline-icon-md absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={t('header.mobileSearchPlaceholder')}
                    aria-label={t('header.search')}
                    className="search-input-with-icon-md h-10"
                  />
                </form>

                <nav className="flex flex-col gap-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.key}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`rounded-lg px-4 py-3.5 text-base font-medium transition-colors ${
                        isActive(item)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {t(item.labelKey)}
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
                      <User className="h-5 w-5 text-muted-foreground" />
                      {t('header.profile')}
                    </Link>
                    {roleDashboardPath && (
                      <Link
                        to={roleDashboardPath}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted"
                      >
                        <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                        {t('header.myDashboard')}
                      </Link>
                    )}
                    <Link
                      to="/bookings"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <CalendarCheck className="h-5 w-5 text-muted-foreground" />
                      {t('header.bookings')}
                    </Link>
                    <Link
                      to="/marketplace/inquiries"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      {t('header.inquiries')}
                    </Link>
                    <Link
                      to="/jobs/my-applications"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <Briefcase className="h-5 w-5 text-muted-foreground" />
                      {t('header.myApplications')}
                    </Link>
                    <Link
                      to="/jobs/my-posts"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <Briefcase className="h-5 w-5 text-muted-foreground" />
                      {t('header.myPosts')}
                    </Link>
                    <Link
                      to="/wallet"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                      {t('header.wallet')}
                    </Link>
                    <Link
                      to="/notifications"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      {t('header.notifications')}
                      {unreadCount > 0 && (
                        <span className="me-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                    {hasRequiredRole(user.role, [UserRole.ADMIN]) && (
                      <Link
                        to="/admin"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted"
                      >
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        {t('header.adminDashboard')}
                      </Link>
                    )}
                    {hasRequiredRole(user.role, [UserRole.ADMIN, UserRole.REVIEWER]) && (
                      <Link
                        to="/reviewer"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted"
                      >
                        <FileCheck className="h-5 w-5 text-muted-foreground" />
                        {t('header.reviewerDashboard')}
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        authCtx.logout();
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <LogOut className="h-5 w-5" />
                      {t('header.logout')}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 border-t border-border pt-4">
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <Button className="w-full" variant="outline">
                        <User className="ms-2 h-4 w-4" />
                        {t('header.login')}
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setIsOpen(false)}>
                      <Button className="w-full">{t('header.register')}</Button>
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
