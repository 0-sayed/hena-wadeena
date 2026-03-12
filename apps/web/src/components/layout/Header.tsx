import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  Menu,
  MapPin,
  User,
  Bell,
  Wallet,
  LogOut,
  CalendarCheck,
  ChevronDown,
  Moon,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { notificationsAPI, type AuthUser } from '@/services/api';
import { useTheme } from 'next-themes';

const navigation = [
  { name: 'الرئيسية', href: '/' },
  { name: 'السياحة', href: '/tourism' },
  { name: 'المرشدين', href: '/guides' },
  { name: 'البورصة', href: '/marketplace' },
  { name: 'اللوجستيات', href: '/logistics' },
  { name: 'الاستثمار', href: '/investment' },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted)
    return (
      <Button variant="ghost" size="icon" className="text-muted-foreground">
        <Sun className="h-5 w-5" />
      </Button>
    );
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="تبديل الوضع"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  // Check if user is logged in
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const stored = localStorage.getItem('user');
    if (!token || !stored) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      setUser(null);
      setUnreadCount(0);
      return;
    }

    try {
      setUser(JSON.parse(stored) as AuthUser);
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      setUser(null);
      setUnreadCount(0);
    }
  }, [location.pathname]);

  // Fetch unread notification count
  useEffect(() => {
    if (user) {
      notificationsAPI
        .getUnreadCount()
        .then((r) => setUnreadCount(r.data.count))
        .catch(() => {});
      const interval = setInterval(() => {
        notificationsAPI
          .getUnreadCount()
          .then((r) => setUnreadCount(r.data.count))
          .catch(() => {});
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    setProfileOpen(false);
    void navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <MapPin className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">هنا وادينا</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-1">
          {/* Dark mode toggle */}
          <ThemeToggle />
          {user ? (
            <>
              {/* Notifications Bell */}
              <Link to="/notifications" className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-card animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* Wallet */}
              <Link to="/wallet">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <Wallet className="h-4 w-4" />
                  <span className="text-xs font-semibold">المحفظة</span>
                </Button>
              </Link>

              {/* Profile Dropdown */}
              <div className="relative mr-1">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-muted transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
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

                {/* Dropdown Menu */}
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-border">
                        <p className="font-semibold text-sm truncate">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          to="/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                        >
                          <User className="h-4 w-4 text-muted-foreground" /> الملف الشخصي
                        </Link>
                        <Link
                          to="/bookings"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                        >
                          <CalendarCheck className="h-4 w-4 text-muted-foreground" /> حجوزاتي
                        </Link>
                        <Link
                          to="/wallet"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                        >
                          <Wallet className="h-4 w-4 text-muted-foreground" /> المحفظة
                        </Link>
                        <Link
                          to="/notifications"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                        >
                          <Bell className="h-4 w-4 text-muted-foreground" />
                          الإشعارات
                          {unreadCount > 0 && (
                            <span className="mr-auto bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                              {unreadCount}
                            </span>
                          )}
                        </Link>
                      </div>
                      <div className="border-t border-border pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
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
            <div className="flex items-center gap-2 mr-2">
              <Link to="/login">
                <Button variant="outline" size="sm">
                  <User className="h-4 w-4 ml-2" />
                  تسجيل الدخول
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">إنشاء حساب</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile: notification + menu */}
        <div className="flex items-center gap-1 lg:hidden">
          {user && (
            <Link to="/notifications" className="relative">
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-card animate-pulse">
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
            <SheetContent side="right" className="w-80">
              <div className="flex flex-col gap-6 mt-8">
                {/* Mobile user info */}
                {user && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                )}

                {/* Nav links */}
                <nav className="flex flex-col gap-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </nav>

                {/* Mobile user actions */}
                {user ? (
                  <div className="border-t border-border pt-4 flex flex-col gap-1">
                    <Link
                      to="/profile"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <User className="h-5 w-5 text-muted-foreground" /> الملف الشخصي
                    </Link>
                    <Link
                      to="/bookings"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <CalendarCheck className="h-5 w-5 text-muted-foreground" /> حجوزاتي
                    </Link>
                    <Link
                      to="/wallet"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Wallet className="h-5 w-5 text-muted-foreground" /> المحفظة
                    </Link>
                    <Link
                      to="/notifications"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      الإشعارات
                      {unreadCount > 0 && (
                        <span className="mr-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="h-5 w-5" /> تسجيل الخروج
                    </button>
                  </div>
                ) : (
                  <div className="border-t border-border pt-4 flex flex-col gap-2">
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <Button className="w-full" variant="outline">
                        <User className="h-4 w-4 ml-2" />
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
