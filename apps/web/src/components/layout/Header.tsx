import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  Bell,
  CalendarCheck,
  ChevronDown,
  Languages,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Search,
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
import { useAuth } from '@/hooks/use-auth';
import { useUnreadNotificationCount } from '@/hooks/use-notifications';

type AppLanguage = 'ar' | 'en';

type NavigationItem = {
  href: string;
  key: string;
  label: string;
  matcher: (pathname: string) => boolean;
};

type HeaderCopy = {
  accountMenu: string;
  beta: string;
  bookings: string;
  brand: string;
  inquiries: string;
  languageSwitchArabicError: string;
  languageSwitchEnglishError: string;
  login: string;
  logout: string;
  menu: string;
  mobileSearchPlaceholder: string;
  notifications: string;
  profile: string;
  register: string;
  search: string;
  searchPlaceholder: string;
  switchToArabic: string;
  switchToEnglish: string;
  themeToggle: string;
  wallet: string;
};

const CONTROL_BUTTON_CLASS =
  'flex h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50 md:h-9 md:min-w-9';

const headerCopy: Record<AppLanguage, HeaderCopy> = {
  ar: {
    accountMenu: 'قائمة الحساب',
    beta: 'تجريبي',
    bookings: 'حجوزاتي',
    brand: 'هُنَا وَادِينَا',
    inquiries: 'استفسارات الإعلانات',
    languageSwitchArabicError: 'تعذر التبديل إلى العربية',
    languageSwitchEnglishError: 'تعذر التبديل إلى الإنجليزية',
    login: 'تسجيل الدخول',
    logout: 'تسجيل الخروج',
    menu: 'فتح القائمة',
    mobileSearchPlaceholder: 'بحث في المنصة...',
    notifications: 'الإشعارات',
    profile: 'الملف الشخصي',
    register: 'إنشاء حساب',
    search: 'بحث',
    searchPlaceholder: 'بحث...',
    switchToArabic: 'التبديل إلى العربية',
    switchToEnglish: 'Switch to English',
    themeToggle: 'تبديل الوضع',
    wallet: 'المحفظة',
  },
  en: {
    accountMenu: 'Account menu',
    beta: 'Beta',
    bookings: 'My bookings',
    brand: 'Hena Wadeena',
    inquiries: 'Marketplace inquiries',
    languageSwitchArabicError: 'Could not switch to Arabic',
    languageSwitchEnglishError: 'Could not switch to English',
    login: 'Log in',
    logout: 'Log out',
    menu: 'Open menu',
    mobileSearchPlaceholder: 'Search the platform...',
    notifications: 'Notifications',
    profile: 'Profile',
    register: 'Create account',
    search: 'Search',
    searchPlaceholder: 'Search...',
    switchToArabic: 'Switch to Arabic',
    switchToEnglish: 'Switch to English',
    themeToggle: 'Toggle theme',
    wallet: 'Wallet',
  },
};

function buildNavigation(language: AppLanguage): NavigationItem[] {
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
          jobs: 'Jobs',
        }
      : {
          home: 'الرئيسية',
          tourism: 'السياحة',
          accommodation: 'الإقامة',
          guides: 'المرشدين',
          marketplace: 'البورصة',
          logistics: 'اللوجستيات',
          investment: 'الاستثمار',
          jobs: 'وظائف',
        };

  const isAccommodationPath = (pathname: string) => pathname.startsWith('/tourism/accommodation');

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
        pathname === '/tourism' ||
        (pathname.startsWith('/tourism/') && !isAccommodationPath(pathname)),
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
    {
      key: 'jobs',
      href: '/jobs',
      label: labels.jobs,
      matcher: (pathname) => pathname.startsWith('/jobs'),
    },
  ];
}

function ThemeToggle({ language }: { language: AppLanguage }) {
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
  const label = headerCopy[language].themeToggle;

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
  const nextLanguage = language === 'ar' ? 'en' : 'ar';
  const title = language === 'ar' ? headerCopy.ar.switchToEnglish : headerCopy.en.switchToArabic;

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
      <ThemeToggle language={language} />
    </div>
  );
}

export function Header() {
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

  const navigation = useMemo(() => buildNavigation(language), [language]);
  const copy = headerCopy[language];

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
          nextLanguage === 'en' ? copy.languageSwitchEnglishError : copy.languageSwitchArabicError,
        );
      })
      .finally(() => {
        setIsSwitchingLanguage(false);
      });
  };

  const isActive = (item: NavigationItem) => item.matcher(location.pathname);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between gap-2 px-3 sm:px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 overflow-hidden">
          <img
            src="/icon-source.png"
            alt={copy.brand}
            className="h-8 w-8 rounded-lg sm:h-9 sm:w-9"
          />
          <span className="truncate text-base font-bold text-foreground sm:text-xl">
            {copy.brand}
          </span>
          <span className="mt-1 hidden self-start rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 sm:inline-flex">
            {copy.beta}
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
              {item.label}
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
                placeholder={copy.searchPlaceholder}
                aria-label={copy.search}
                className="h-9 w-48 text-sm"
              />
            </form>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setSearchOpen(true)}
              aria-label={copy.search}
              title={copy.search}
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
              <Link to="/notifications" className="relative" aria-label={copy.notifications}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={copy.notifications}
                  title={copy.notifications}
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
                  <span className="text-xs font-semibold">{copy.wallet}</span>
                </Button>
              </Link>

              <div className="relative me-1">
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-full p-1.5 transition-colors hover:bg-muted"
                  aria-label={copy.accountMenu}
                  title={copy.accountMenu}
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
                          {copy.profile}
                        </Link>
                        <Link
                          to="/bookings"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                        >
                          <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                          {copy.bookings}
                        </Link>
                        <Link
                          to="/marketplace/inquiries"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                        >
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          {copy.inquiries}
                        </Link>
                        <Link
                          to="/wallet"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                        >
                          <Wallet className="h-4 w-4 text-muted-foreground" />
                          {copy.wallet}
                        </Link>
                        <Link
                          to="/notifications"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                        >
                          <Bell className="h-4 w-4 text-muted-foreground" />
                          {copy.notifications}
                          {unreadCount > 0 && (
                            <span className="me-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                              {unreadCount}
                            </span>
                          )}
                        </Link>
                      </div>
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
                          {copy.logout}
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
                  {copy.login}
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">{copy.register}</Button>
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 lg:hidden">
          <Link to="/search" aria-label={copy.search}>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              aria-label={copy.search}
              title={copy.search}
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
            <Link to="/notifications" className="relative" aria-label={copy.notifications}>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                aria-label={copy.notifications}
                title={copy.notifications}
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
              <Button variant="ghost" size="icon" aria-label={copy.menu} title={copy.menu}>
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
                    placeholder={copy.mobileSearchPlaceholder}
                    aria-label={copy.search}
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
                      <User className="h-5 w-5 text-muted-foreground" />
                      {copy.profile}
                    </Link>
                    <Link
                      to="/bookings"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <CalendarCheck className="h-5 w-5 text-muted-foreground" />
                      {copy.bookings}
                    </Link>
                    <Link
                      to="/marketplace/inquiries"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      {copy.inquiries}
                    </Link>
                    <Link
                      to="/wallet"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                      {copy.wallet}
                    </Link>
                    <Link
                      to="/notifications"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      {copy.notifications}
                      {unreadCount > 0 && (
                        <span className="me-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        authCtx.logout();
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <LogOut className="h-5 w-5" />
                      {copy.logout}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 border-t border-border pt-4">
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <Button className="w-full" variant="outline">
                        <User className="ms-2 h-4 w-4" />
                        {copy.login}
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setIsOpen(false)}>
                      <Button className="w-full">{copy.register}</Button>
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
