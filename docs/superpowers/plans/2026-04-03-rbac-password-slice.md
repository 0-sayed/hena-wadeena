# RBAC and Password Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved first slice for ISSUE-007, ISSUE-008, and ISSUE-012 by tightening ride and investment contact access while exposing change-password and OTP reset flows in the web app.

**Architecture:** Add a shared frontend role-access helper so CTA visibility, route guards, and page-level fail-closed behavior all reuse the same role lists. Keep backend authorization changes narrow by updating only the investment submit endpoints whose role decorators do not match the approved scope, and expose the existing identity-service password endpoints through focused auth/profile UI that reuses the current token lifecycle in `auth-manager`.

**Tech Stack:** React 19, React Router, TanStack Query, Sonner, Vitest, NestJS, `@hena-wadeena/nest-common` role decorators, TypeScript strict mode.

---

## File Structure

- Create: `apps/web/src/lib/role-access.ts`
  Purpose: Shared allowed-role constants and tiny helper functions for ride creation and investment contact flows.
- Modify: `apps/web/src/components/auth/RequireRole.tsx`
  Purpose: Accept readonly role arrays so route guards can consume the shared constants directly.
- Modify: `apps/web/src/App.tsx`
  Purpose: Reuse the shared ride-role constant for the create-ride route and register the new forgot/reset password routes.
- Modify: `apps/web/src/pages/LogisticsPage.tsx`
  Purpose: Replace the page-local ride role list with the shared helper.
- Modify: `apps/web/src/pages/logistics/CreateRidePage.tsx`
  Purpose: Add a fail-closed page-level authorization check so unauthorized direct visits never expose the form.
- Create: `apps/web/src/pages/logistics/__tests__/CreateRidePage.spec.tsx`
  Purpose: Lock in ride-page guard behavior for allowed and disallowed roles.
- Modify: `apps/web/src/pages/InvestmentPage.tsx`
  Purpose: Hide opportunity and startup contact CTAs for roles outside `admin` and `investor`.
- Modify: `apps/web/src/pages/investment/OpportunityDetailsPage.tsx`
  Purpose: Hide the inquiry CTA and align sensitive-contact visibility with the shared investment-contact role helper.
- Modify: `apps/web/src/pages/investment/ContactPage.tsx`
  Purpose: Redirect unauthenticated users to login, redirect authenticated-but-unauthorized users away with a toast, and use a neutral post-submit destination that works for admins.
- Create: `apps/web/src/pages/investment/__tests__/InvestmentRoleAccess.spec.tsx`
  Purpose: Verify listing/detail pages hide contact actions for disallowed roles.
- Modify: `apps/web/src/pages/investment/__tests__/ContactPage.spec.tsx`
  Purpose: Verify unauthorized roles are bounced before the form can submit.
- Modify: `services/market/src/business-inquiries/business-inquiries.controller.ts`
  Purpose: Restrict startup inquiry submission to `admin` and `investor`.
- Create: `services/market/src/business-inquiries/business-inquiries.controller.spec.ts`
  Purpose: Verify the submit endpoint metadata enforces the intended roles.
- Modify: `services/market/src/investment-applications/investment-applications.controller.ts`
  Purpose: Restrict opportunity-interest submission to `admin` and `investor`.
- Create: `services/market/src/investment-applications/investment-applications.controller.spec.ts`
  Purpose: Verify the submit-interest endpoint metadata enforces the intended roles.
- Modify: `apps/web/src/services/api.ts`
  Purpose: Add typed API helpers for change-password, reset-request, and reset-confirm.
- Modify: `apps/web/src/pages/auth/LoginPage.tsx`
  Purpose: Add the forgot-password entry point.
- Create: `apps/web/src/pages/auth/ForgotPasswordPage.tsx`
  Purpose: Collect email and call the password-reset request endpoint that already exists in the identity service.
- Create: `apps/web/src/pages/auth/ResetPasswordPage.tsx`
  Purpose: Collect email, OTP, and a new password, then call the confirm-reset endpoint that already exists in the identity service.
- Create: `apps/web/src/pages/auth/__tests__/ForgotPasswordPage.spec.tsx`
  Purpose: Verify reset-request happy/error paths and the generic-success UX.
- Create: `apps/web/src/pages/auth/__tests__/ResetPasswordPage.spec.tsx`
  Purpose: Verify validation, confirm-reset API wiring, and post-success redirect.
- Modify: `apps/web/src/pages/auth/__tests__/LoginPage.spec.tsx`
  Purpose: Verify the login page exposes the new forgot-password link.
- Modify: `apps/web/src/pages/profile/ProfilePage.tsx`
  Purpose: Add an authenticated change-password dialog that updates tokens and user state on success.
- Create: `apps/web/src/pages/profile/__tests__/ProfilePassword.spec.tsx`
  Purpose: Verify change-password validation and token-refresh behavior.
- Modify: `apps/web/src/pages/__tests__/account-pages-localization.spec.tsx`
  Purpose: Extend the auth API mock so `ProfilePage` tests remain stable after adding password UI.

### Task 1: Ride Creation Access Hardening

**Files:**
- Create: `apps/web/src/lib/role-access.ts`
- Create: `apps/web/src/pages/logistics/__tests__/CreateRidePage.spec.tsx`
- Modify: `apps/web/src/components/auth/RequireRole.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/pages/LogisticsPage.tsx`
- Modify: `apps/web/src/pages/logistics/CreateRidePage.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/pages/logistics/__tests__/CreateRidePage.spec.tsx`:

```tsx
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@hena-wadeena/types';

import CreateRidePage from '../CreateRidePage';

const mockNavigate = vi.fn();
const mockUseAuth = vi.fn();
const mockUseCreateRide = vi.fn();
const mockToastError = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type = 'button',
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit';
  }) => (
    <button type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/use-map', () => ({
  useCreateRide: () => mockUseCreateRide(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: vi.fn(),
  },
}));

describe('CreateRidePage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseAuth.mockReset();
    mockUseCreateRide.mockReset();
    mockToastError.mockReset();

    mockUseCreateRide.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    });
  });

  it('redirects authenticated non-creators back to logistics before showing the form', async () => {
    mockUseAuth.mockReturnValue({
      language: 'en',
      user: { role: UserRole.TOURIST },
      isAuthenticated: true,
      isLoading: false,
    });

    render(<CreateRidePage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/logistics', { replace: true });
    });

    expect(screen.queryByRole('button', { name: /publish ride/i })).not.toBeInTheDocument();
  });

  it('keeps the form available for drivers', () => {
    mockUseAuth.mockReturnValue({
      language: 'en',
      user: { role: UserRole.DRIVER },
      isAuthenticated: true,
      isLoading: false,
    });

    render(<CreateRidePage />);

    expect(screen.getByRole('button', { name: /publish ride/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @hena-wadeena/web test -- src/pages/logistics/__tests__/CreateRidePage.spec.tsx
```

Expected: FAIL because `CreateRidePage` currently renders the form for any authenticated user and never redirects `tourist` users away.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/src/lib/role-access.ts`:

```ts
import { UserRole } from '@hena-wadeena/types';
import { hasRequiredRole } from '@/components/auth/access-control';

export const RIDE_CREATOR_ROLES = [UserRole.DRIVER, UserRole.ADMIN] as const;
export const INVESTMENT_CONTACT_ROLES = [UserRole.ADMIN, UserRole.INVESTOR] as const;

export function canCreateRide(role: UserRole | undefined): boolean {
  return hasRequiredRole(role, RIDE_CREATOR_ROLES);
}

export function canContactInvestment(role: UserRole | undefined): boolean {
  return hasRequiredRole(role, INVESTMENT_CONTACT_ROLES);
}
```

Update `apps/web/src/components/auth/RequireRole.tsx`:

```tsx
interface RequireRoleProps {
  roles: readonly UserRole[];
}
```

Update `apps/web/src/App.tsx` imports and route:

```tsx
import { RIDE_CREATOR_ROLES } from '@/lib/role-access';

<Route element={<RequireAuth />}>
  <Route element={<RequireRole roles={RIDE_CREATOR_ROLES} />}>
    <Route path="/logistics/create-ride" element={<CreateRidePage />} />
  </Route>
</Route>
```

Update `apps/web/src/pages/LogisticsPage.tsx` imports and remove the page-local constant:

```tsx
import { formatRidePrice } from '@/lib/format';
import { formatDateTimeShort } from '@/lib/dates';
import { RIDE_CREATOR_ROLES } from '@/lib/role-access';
import type { AppLanguage } from '@/lib/localization';

// delete:
// const RIDE_CREATOR_ROLES = [UserRole.DRIVER, UserRole.ADMIN] as const;
```

Update `apps/web/src/pages/logistics/CreateRidePage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '@/components/layout/Layout';
import { Car, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useCreateRide } from '@/hooks/use-map';
import { AREA_PRESETS, findArea, getAreaDisplayName } from '@/lib/area-presets';
import { pickLocalizedCopy } from '@/lib/localization';
import { canCreateRide } from '@/lib/role-access';

const CreateRidePage = () => {
  const navigate = useNavigate();
  const {
    language: appLanguage,
    user,
    isAuthenticated,
    isLoading: isAuthLoading,
  } = useAuth();
  const createRide = useCreateRide();
  const [originId, setOriginId] = useState('');
  const [destId, setDestId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seats, setSeats] = useState('1');
  const [price, setPrice] = useState('0');
  const [notes, setNotes] = useState('');

  const isAllowed = canCreateRide(user?.role);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'يجب تسجيل الدخول أولا',
          en: 'You need to sign in first',
        }),
      );
      void navigate('/login', { replace: true });
      return;
    }

    if (!isAllowed) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'إنشاء الرحلات متاح للسائقين والمشرفين فقط',
          en: 'Only drivers and admins can create rides',
        }),
      );
      void navigate('/logistics', { replace: true });
    }
  }, [appLanguage, isAllowed, isAuthLoading, isAuthenticated, navigate]);

  if (isAuthLoading || !isAuthenticated || !isAllowed) {
    return null;
  }
};
```

- [ ] **Step 4: Run verification**

Run:

```bash
pnpm --filter @hena-wadeena/web test -- src/pages/logistics/__tests__/CreateRidePage.spec.tsx
pnpm --filter @hena-wadeena/web typecheck
```

Expected: PASS. The new spec should confirm the fail-closed guard and TypeScript should accept the shared readonly role constants.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/role-access.ts apps/web/src/components/auth/RequireRole.tsx apps/web/src/App.tsx apps/web/src/pages/LogisticsPage.tsx apps/web/src/pages/logistics/CreateRidePage.tsx apps/web/src/pages/logistics/__tests__/CreateRidePage.spec.tsx
git commit -m "fix(web): harden ride creation access"
```

### Task 2: Investment Contact Frontend Restrictions

**Files:**
- Modify: `apps/web/src/pages/InvestmentPage.tsx`
- Modify: `apps/web/src/pages/investment/OpportunityDetailsPage.tsx`
- Modify: `apps/web/src/pages/investment/ContactPage.tsx`
- Create: `apps/web/src/pages/investment/__tests__/InvestmentRoleAccess.spec.tsx`
- Modify: `apps/web/src/pages/investment/__tests__/ContactPage.spec.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/pages/investment/__tests__/InvestmentRoleAccess.spec.tsx`:

```tsx
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@hena-wadeena/types';

import InvestmentPage from '../InvestmentPage';
import OpportunityDetailsPage from '../OpportunityDetailsPage';

const mockNavigate = vi.fn();
const mockUseAuth = vi.fn();
const mockGetOpportunities = vi.fn();
const mockGetStartups = vi.fn();
const mockGetOpportunity = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'opp-1' }),
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/PageHero', () => ({
  PageHero: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/PageTransition', () => ({
  PageTransition: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/ScrollReveal', () => ({
  SR: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/components/maps/InteractiveMap', () => ({
  InteractiveMap: () => <div>map</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    type = 'button',
  }: {
    children: ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit';
  }) => (
    <button type={type} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/components/ui/ltr-text', () => ({
  LtrText: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/services/api', () => ({
  investmentAPI: {
    getOpportunities: () => mockGetOpportunities(),
    getStartups: () => mockGetStartups(),
    getOpportunity: (...args: unknown[]) => mockGetOpportunity(...args),
  },
}));

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('investment contact access', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseAuth.mockReset();
    mockGetOpportunities.mockReset();
    mockGetStartups.mockReset();
    mockGetOpportunity.mockReset();

    mockUseAuth.mockReturnValue({
      language: 'en',
      isAuthenticated: true,
      user: { role: UserRole.MERCHANT },
    });

    mockGetOpportunities.mockResolvedValue({
      data: [
        {
          id: 'opp-1',
          status: 'active',
          sector: 'technology',
          titleAr: 'Opportunity One',
          titleEn: 'Opportunity One',
          incentives: ['Tax holiday'],
          area: 'kharga',
          minInvestment: 100000000,
          maxInvestment: 200000000,
          expectedReturnPct: 12,
        },
      ],
    });

    mockGetStartups.mockResolvedValue({
      data: [
        {
          id: 'startup-1',
          nameAr: 'Startup One',
          nameEn: 'Startup One',
          category: 'technology',
          descriptionAr: 'Startup description',
          description: 'Startup description',
          district: 'kharga',
          status: 'active',
          logoUrl: null,
        },
      ],
    });

    mockGetOpportunity.mockResolvedValue({
      id: 'opp-1',
      status: 'active',
      sector: 'technology',
      titleAr: 'Opportunity One',
      area: 'kharga',
      minInvestment: 100000000,
      maxInvestment: 200000000,
      expectedReturnPct: 12,
      description: 'Opportunity description',
      incentives: [],
      location: null,
      documents: [],
      contact: null,
    });
  });

  it('hides inquiry and contact buttons on the investment listing for merchants', async () => {
    renderWithQuery(<InvestmentPage />);

    await waitFor(() => {
      expect(mockGetOpportunities).toHaveBeenCalled();
    });

    expect(screen.queryByRole('button', { name: /Inquiry/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Contact/i })).not.toBeInTheDocument();
  });

  it('hides the detail-page inquiry button for merchants', async () => {
    renderWithQuery(<OpportunityDetailsPage />);

    await waitFor(() => {
      expect(mockGetOpportunity).toHaveBeenCalledWith('opp-1');
    });

    expect(screen.queryByText(/إرسال استفسار استثماري/)).not.toBeInTheDocument();
  });
});
```

Append this test to `apps/web/src/pages/investment/__tests__/ContactPage.spec.tsx`:

```tsx
it('redirects authenticated merchants away from the contact form', async () => {
  mockUseAuth.mockReturnValue({
    isAuthenticated: true,
    language: 'en',
    user: {
      id: 'merchant-1',
      full_name: 'Merchant User',
      email: 'merchant@example.com',
      phone: '01000000000',
      role: 'merchant',
    },
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ContactPage />
    </QueryClientProvider>,
  );

  await waitFor(() => {
    expect(mockToastError).toHaveBeenCalled();
  });

  expect(mockNavigate).toHaveBeenCalledWith('/investment', { replace: true });
  expect(mockSubmitStartupInquiry).not.toHaveBeenCalled();
  expect(mockSubmitOpportunityInquiry).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @hena-wadeena/web test -- src/pages/investment/__tests__/InvestmentRoleAccess.spec.tsx src/pages/investment/__tests__/ContactPage.spec.tsx
```

Expected: FAIL because the listing/detail pages still render contact CTAs for `merchant`, and `ContactPage` still allows merchants through its guard.

- [ ] **Step 3: Write minimal implementation**

Update `apps/web/src/pages/InvestmentPage.tsx`:

```tsx
import { useAuth } from '@/hooks/use-auth';
import { pickLocalizedCopy, pickLocalizedField } from '@/lib/localization';
import { districtLabel } from '@/lib/format';
import { canContactInvestment } from '@/lib/role-access';

const InvestmentPage = () => {
  const navigate = useNavigate();
  const { language, user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const canContact = canContactInvestment(user?.role);

  // inside opportunities card actions:
  <div className="flex gap-3">
    <Button
      variant="outline"
      className="flex-1 transition-transform hover:scale-[1.02]"
      onClick={() => void navigate(`/investment/opportunity/${opportunity.id}`)}
    >
      {pickLocalizedCopy(language, {
        ar: 'التفاصيل',
        en: 'Details',
      })}{' '}
      <ArrowLeft className="mr-2 h-4 w-4" />
    </Button>
    {canContact && (
      <Button
        className="flex-1 transition-transform hover:scale-[1.02]"
        onClick={() => void navigate(`/investment/contact/${opportunity.id}`)}
      >
        <Send className="ml-2 h-4 w-4" />
        {pickLocalizedCopy(language, {
          ar: 'استفسار',
          en: 'Inquiry',
        })}
      </Button>
    )}
  </div>

  // inside startups card actions:
  <div className="flex gap-3">
    <Button
      variant="outline"
      className="flex-1 transition-transform hover:scale-[1.02]"
      onClick={() => void navigate(`/investment/startups/${startup.id}`)}
    >
      {pickLocalizedCopy(language, {
        ar: 'التفاصيل',
        en: 'Details',
      })}{' '}
      <ArrowLeft className="mr-2 h-4 w-4" />
    </Button>
    {canContact && (
      <Button
        className="flex-1 transition-transform hover:scale-[1.02]"
        onClick={() => void navigate(`/investment/contact/${startup.id}?entity=startup`)}
      >
        <Send className="ml-2 h-4 w-4" />
        {pickLocalizedCopy(language, {
          ar: 'تواصل',
          en: 'Contact',
        })}
      </Button>
    )}
  </div>
```

Update `apps/web/src/pages/investment/OpportunityDetailsPage.tsx`:

```tsx
import { investmentAPI } from '@/services/api';
import { formatPrice } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import { canContactInvestment } from '@/lib/role-access';

const OpportunityDetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();
  const { data: opportunity, isLoading, isError, refetch } = useQuery({
    queryKey: ['investment', 'opportunities', id],
    queryFn: () => investmentAPI.getOpportunity(id!),
    enabled: !!id,
  });

  const canContact = canContactInvestment(user?.role);
  const canSeeSensitiveFields = isAuthenticated && canContact;

  // replace CTA block:
  {canContact && (
    <Button
      className="w-full"
      size="lg"
      onClick={() => void navigate(`/investment/contact/${opportunity.id}`)}
    >
      <Mail className="h-5 w-5 ml-2" />
      إرسال استفسار استثماري
    </Button>
  )}
```

Update `apps/web/src/pages/investment/ContactPage.tsx`:

```tsx
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowRight, Building2, Mail, MessageSquare, Phone, Send, User } from 'lucide-react';
import { toast } from 'sonner';

import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { pickLocalizedCopy, pickLocalizedField, type AppLanguage } from '@/lib/localization';
import { canContactInvestment } from '@/lib/role-access';
import { parseEgpInputToPiasters } from '@/lib/wallet-store';
import {
  businessesAPI,
  businessInquiriesAPI,
  investmentApplicationsAPI,
} from '@/services/api';

const ContactPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const {
    user,
    isAuthenticated,
    isLoading: isAuthLoading,
    language,
  } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const canSubmitInquiry = canContactInvestment(user?.role);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    investorType: '',
    investmentRange: '',
    amount: '',
    message: '',
  });

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'سجل الدخول أولا لإرسال الاستفسار',
          en: 'Sign in first to send your inquiry',
        }),
      );
      void navigate('/login', { replace: true, state: { from: location } });
      return;
    }

    if (!canSubmitInquiry) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'هذه الميزة متاحة للمشرفين والمستثمرين فقط',
          en: 'This feature is available to admins and investors only',
        }),
      );
      void navigate('/investment', { replace: true });
    }
  }, [
    appLanguage,
    canSubmitInquiry,
    isAuthenticated,
    isAuthLoading,
    location,
    navigate,
  ]);

  if (isAuthLoading || !isAuthenticated || !canSubmitInquiry) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isStartupFlow) {
      await businessInquiriesAPI.submit(id, {
        contactName: formData.name.trim(),
        contactEmail: formData.email.trim(),
        contactPhone: formData.phone.trim() || undefined,
        message: enrichedMessage,
      });

      toast.success(
        pickLocalizedCopy(appLanguage, {
          ar: 'تم إرسال استفسارك إلى صاحب الشركة بنجاح',
          en: 'Your inquiry was sent to the startup owner successfully',
        }),
      );
      void navigate('/investment');
      return;
    }

    await investmentApplicationsAPI.submitInterest(id, {
      contactEmail: formData.email.trim(),
      contactPhone: formData.phone.trim() || undefined,
      amountProposed: amountProposed ?? undefined,
      message: enrichedMessage,
    });

    toast.success(
      pickLocalizedCopy(appLanguage, {
        ar: 'تم إرسال الاستفسار بنجاح، وسيظهر مباشرة في صندوق وارد مالك الفرصة',
        en: 'Your inquiry was sent successfully and will appear in the opportunity owner inbox',
      }),
    );
    void navigate('/investment');
  };
};
```

- [ ] **Step 4: Run verification**

Run:

```bash
pnpm --filter @hena-wadeena/web test -- src/pages/investment/__tests__/InvestmentRoleAccess.spec.tsx src/pages/investment/__tests__/ContactPage.spec.tsx
pnpm --filter @hena-wadeena/web typecheck
```

Expected: PASS. Merchants should no longer see any investment-contact CTAs, and the contact form should redirect unauthorized roles away before submission.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/InvestmentPage.tsx apps/web/src/pages/investment/OpportunityDetailsPage.tsx apps/web/src/pages/investment/ContactPage.tsx apps/web/src/pages/investment/__tests__/InvestmentRoleAccess.spec.tsx apps/web/src/pages/investment/__tests__/ContactPage.spec.tsx
git commit -m "fix(web): restrict investment contact access"
```

### Task 3: Investment Submit Role Guards on the Market Service

**Files:**
- Modify: `services/market/src/business-inquiries/business-inquiries.controller.ts`
- Create: `services/market/src/business-inquiries/business-inquiries.controller.spec.ts`
- Modify: `services/market/src/investment-applications/investment-applications.controller.ts`
- Create: `services/market/src/investment-applications/investment-applications.controller.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `services/market/src/business-inquiries/business-inquiries.controller.spec.ts`:

```ts
import { UserRole } from '@hena-wadeena/types';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROLES_KEY } from '@hena-wadeena/nest-common';

import { BusinessInquiriesController } from './business-inquiries.controller';
import { BusinessInquiriesService } from './business-inquiries.service';

describe('BusinessInquiriesController', () => {
  let controller: BusinessInquiriesController;
  let mockService: {
    submit: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockService = {
      submit: vi.fn().mockResolvedValue({ id: 'inquiry-1' }),
    };

    controller = new BusinessInquiriesController(mockService as unknown as BusinessInquiriesService);
  });

  it('requires admin or investor role for inquiry submission', () => {
    const submit = Object.getOwnPropertyDescriptor(
      BusinessInquiriesController.prototype,
      'submit',
    )?.value;

    expect(Reflect.getMetadata(METHOD_METADATA, submit)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(ROLES_KEY, submit)).toEqual([
      UserRole.ADMIN,
      UserRole.INVESTOR,
    ]);
  });

  it('delegates submit to the service', async () => {
    await controller.submit(
      'business-1',
      { sub: 'investor-1' } as never,
      { contactName: 'Investor', message: 'Interested' } as never,
    );

    expect(mockService.submit).toHaveBeenCalledWith(
      'business-1',
      'investor-1',
      expect.objectContaining({
        contactName: 'Investor',
      }),
    );
  });
});
```

Create `services/market/src/investment-applications/investment-applications.controller.spec.ts`:

```ts
import { UserRole } from '@hena-wadeena/types';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROLES_KEY } from '@hena-wadeena/nest-common';

import { InvestmentApplicationsController } from './investment-applications.controller';
import { InvestmentApplicationsService } from './investment-applications.service';
import { InvestmentOpportunitiesService } from '../investment-opportunities/investment-opportunities.service';

describe('InvestmentApplicationsController', () => {
  let controller: InvestmentApplicationsController;
  let applicationsService: {
    submitInterest: ReturnType<typeof vi.fn>;
  };
  let opportunitiesService: {
    assertOwnership: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    applicationsService = {
      submitInterest: vi.fn().mockResolvedValue({ id: 'interest-1' }),
    };
    opportunitiesService = {
      assertOwnership: vi.fn(),
    };

    controller = new InvestmentApplicationsController(
      applicationsService as unknown as InvestmentApplicationsService,
      opportunitiesService as unknown as InvestmentOpportunitiesService,
    );
  });

  it('requires admin or investor role for submitInterest', () => {
    const submitInterest = Object.getOwnPropertyDescriptor(
      InvestmentApplicationsController.prototype,
      'submitInterest',
    )?.value;

    expect(Reflect.getMetadata(METHOD_METADATA, submitInterest)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(ROLES_KEY, submitInterest)).toEqual([
      UserRole.ADMIN,
      UserRole.INVESTOR,
    ]);
  });

  it('delegates submitInterest to the service', async () => {
    await controller.submitInterest(
      'opp-1',
      { contactEmail: 'investor@example.com', message: 'Interested' } as never,
      { sub: 'investor-1' } as never,
    );

    expect(applicationsService.submitInterest).toHaveBeenCalledWith(
      'opp-1',
      'investor-1',
      expect.objectContaining({
        contactEmail: 'investor@example.com',
      }),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @hena-wadeena/market test -- src/business-inquiries/business-inquiries.controller.spec.ts src/investment-applications/investment-applications.controller.spec.ts
```

Expected: FAIL because `BusinessInquiriesController.submit` currently has no `@Roles` decorator and `InvestmentApplicationsController.submitInterest` currently allows `merchant` instead of `admin`.

- [ ] **Step 3: Write minimal implementation**

Update `services/market/src/business-inquiries/business-inquiries.controller.ts`:

```ts
  @Post('businesses/:id/inquiries')
  @Roles(UserRole.ADMIN, UserRole.INVESTOR)
  submit(
    @Param('id', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBusinessInquiryDto,
  ) {
    return this.businessInquiriesService.submit(businessId, user.sub, dto);
  }
```

Update `services/market/src/investment-applications/investment-applications.controller.ts`:

```ts
  @Post('investments/:id/interest')
  @Roles(UserRole.ADMIN, UserRole.INVESTOR)
  @UseGuards(KycVerifiedGuard)
  submitInterest(
    @Param('id') opportunityId: string,
    @Body() dto: CreateApplicationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.applicationsService.submitInterest(opportunityId, user.sub, dto);
  }
```

- [ ] **Step 4: Run verification**

Run:

```bash
pnpm --filter @hena-wadeena/market test -- src/business-inquiries/business-inquiries.controller.spec.ts src/investment-applications/investment-applications.controller.spec.ts
```

Expected: PASS. Both submit endpoints should now advertise the approved `admin`/`investor` role requirements through metadata.

- [ ] **Step 5: Commit**

```bash
git add services/market/src/business-inquiries/business-inquiries.controller.ts services/market/src/business-inquiries/business-inquiries.controller.spec.ts services/market/src/investment-applications/investment-applications.controller.ts services/market/src/investment-applications/investment-applications.controller.spec.ts
git commit -m "fix(market): align investment submit roles"
```

### Task 4: Password Reset Routes, Pages, and API Client

**Files:**
- Modify: `apps/web/src/services/api.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/pages/auth/LoginPage.tsx`
- Modify: `apps/web/src/pages/auth/__tests__/LoginPage.spec.tsx`
- Create: `apps/web/src/pages/auth/ForgotPasswordPage.tsx`
- Create: `apps/web/src/pages/auth/ResetPasswordPage.tsx`
- Create: `apps/web/src/pages/auth/__tests__/ForgotPasswordPage.spec.tsx`
- Create: `apps/web/src/pages/auth/__tests__/ResetPasswordPage.spec.tsx`

- [ ] **Step 1: Write the failing tests**

Append this test to `apps/web/src/pages/auth/__tests__/LoginPage.spec.tsx`:

```tsx
it('renders a forgot-password link', () => {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );

  expect(screen.getByRole('link', { name: /نسيت كلمة المرور/i })).toHaveAttribute(
    'href',
    '/forgot-password',
  );
});
```

Create `apps/web/src/pages/auth/__tests__/ForgotPasswordPage.spec.tsx`:

```tsx
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ForgotPasswordPage from '../ForgotPasswordPage';

const mockNavigate = vi.fn();
const mockRequestPasswordReset = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/PageTransition', () => ({
  PageTransition: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  GradientMesh: () => null,
}));

vi.mock('@/components/motion/ScrollReveal', () => ({
  SR: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    type = 'button',
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit';
    disabled?: boolean;
  }) => (
    <button type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock('@/services/api', () => ({
  authAPI: {
    requestPasswordReset: (...args: unknown[]) => mockRequestPasswordReset(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockRequestPasswordReset.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
  });

  it('submits the email and moves the user to the reset form', async () => {
    mockRequestPasswordReset.mockResolvedValue({ message: 'ok' });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'investor@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset code/i }));

    await waitFor(() => {
      expect(mockRequestPasswordReset).toHaveBeenCalledWith({
        email: 'investor@example.com',
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/reset-password', {
      state: { email: 'investor@example.com' },
    });
  });
});
```

Create `apps/web/src/pages/auth/__tests__/ResetPasswordPage.spec.tsx`:

```tsx
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ResetPasswordPage from '../ResetPasswordPage';

const mockNavigate = vi.fn();
const mockConfirmPasswordReset = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: { email: 'investor@example.com' } }),
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/PageTransition', () => ({
  PageTransition: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  GradientMesh: () => null,
}));

vi.mock('@/components/motion/ScrollReveal', () => ({
  SR: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    type = 'button',
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit';
    disabled?: boolean;
  }) => (
    <button type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock('@/services/api', () => ({
  authAPI: {
    confirmPasswordReset: (...args: unknown[]) => mockConfirmPasswordReset(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockConfirmPasswordReset.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
  });

  it('prevents submission when confirmation does not match', () => {
    render(
      <MemoryRouter>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/otp/i), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'password456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    expect(mockConfirmPasswordReset).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalled();
  });

  it('submits email, otp, and the new password, then returns to login', async () => {
    mockConfirmPasswordReset.mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      token_type: 'bearer',
      expires_in: 900,
      user: {
        id: 'user-1',
        email: 'investor@example.com',
        full_name: 'Investor User',
        role: 'investor',
        avatar_url: null,
        phone: null,
        status: 'active',
        language: 'en',
      },
    });

    render(
      <MemoryRouter>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/otp/i), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(mockConfirmPasswordReset).toHaveBeenCalledWith({
        email: 'investor@example.com',
        otp: '123456',
        new_password: 'password123',
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @hena-wadeena/web test -- src/pages/auth/__tests__/LoginPage.spec.tsx src/pages/auth/__tests__/ForgotPasswordPage.spec.tsx src/pages/auth/__tests__/ResetPasswordPage.spec.tsx
```

Expected: FAIL because the forgot/reset pages and API methods do not exist yet, and the login page does not expose the forgot-password link.

- [ ] **Step 3: Write minimal implementation**

Update `apps/web/src/services/api.ts`:

```ts
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface RequestPasswordResetRequest {
  email: string;
}

export interface ConfirmPasswordResetRequest {
  email: string;
  otp: string;
  new_password: string;
}

export const authAPI = {
  changePassword: async (body: ChangePasswordRequest) => {
    const response = await apiFetchWithRefresh<AuthTokensResponse | PendingKycAuthResponse>(
      '/auth/change-password',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );

    return normalizeAuthFlowResponse(response);
  },

  requestPasswordReset: (body: RequestPasswordResetRequest) =>
    apiFetch<{ message: string }>('/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  confirmPasswordReset: async (body: ConfirmPasswordResetRequest) => {
    const response = await apiFetch<AuthTokensResponse | PendingKycAuthResponse>(
      '/auth/password-reset/confirm',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );

    return normalizeAuthFlowResponse(response);
  },
};
```

Create `apps/web/src/pages/auth/ForgotPasswordPage.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Mail } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';
import { SR } from '@/components/motion/ScrollReveal';
import { authAPI } from '@/services/api';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      await authAPI.requestPasswordReset({ email: email.trim() });
      toast.success('If the email exists, a reset code has been sent');
      void navigate('/reset-password', { state: { email: email.trim() } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to request a reset code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <PageTransition>
        <section className="relative overflow-hidden py-14 md:py-24">
          <GradientMesh />
          <div className="container relative max-w-md px-4">
            <SR>
              <Card className="overflow-hidden rounded-2xl border-border/50 shadow-xl">
                <CardHeader className="pb-2 pt-10 text-center">
                  <CardTitle className="text-2xl">Forgot password</CardTitle>
                  <p className="mt-2 text-muted-foreground">
                    Enter your email and we will send you a 6-digit reset code.
                  </p>
                </CardHeader>
                <CardContent className="px-8 pb-10 pt-8">
                  <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          className="h-13 rounded-xl pr-12 text-base"
                          required
                        />
                      </div>
                    </div>

                    <Button type="submit" className="h-14 w-full rounded-xl" disabled={isLoading}>
                      {isLoading ? 'Sending...' : 'Send reset code'}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => void navigate('/login')}
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Back to login
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </SR>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default ForgotPasswordPage;
```

Create `apps/web/src/pages/auth/ResetPasswordPage.tsx`:

```tsx
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowRight, KeyRound, Lock, Mail } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';
import { SR } from '@/components/motion/ScrollReveal';
import { authAPI } from '@/services/api';

type ResetLocationState = {
  email?: string;
};

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as ResetLocationState | null) ?? null;
  const [email, setEmail] = useState(state?.email ?? '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Password confirmation does not match');
      return;
    }

    setIsLoading(true);

    try {
      await authAPI.confirmPasswordReset({
        email: email.trim(),
        otp: otp.trim(),
        new_password: newPassword,
      });
      toast.success('Password reset successfully. Sign in with your new password.');
      void navigate('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <PageTransition>
        <section className="relative overflow-hidden py-14 md:py-24">
          <GradientMesh />
          <div className="container relative max-w-md px-4">
            <SR>
              <Card className="overflow-hidden rounded-2xl border-border/50 shadow-xl">
                <CardHeader className="pb-2 pt-10 text-center">
                  <CardTitle className="text-2xl">Reset password</CardTitle>
                  <p className="mt-2 text-muted-foreground">
                    Enter the email, the 6-digit code, and your new password.
                  </p>
                </CardHeader>
                <CardContent className="px-8 pb-10 pt-8">
                  <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          className="h-13 rounded-xl pr-12 text-base"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="otp">OTP</Label>
                      <div className="relative">
                        <KeyRound className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="otp"
                          inputMode="numeric"
                          maxLength={6}
                          value={otp}
                          onChange={(event) => setOtp(event.target.value)}
                          className="h-13 rounded-xl pr-12 text-base"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">New password</Label>
                      <div className="relative">
                        <Lock className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          className="h-13 rounded-xl pr-12 text-base"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm new password</Label>
                      <div className="relative">
                        <Lock className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          className="h-13 rounded-xl pr-12 text-base"
                          required
                        />
                      </div>
                    </div>

                    <Button type="submit" className="h-14 w-full rounded-xl" disabled={isLoading}>
                      {isLoading ? 'Resetting...' : 'Reset password'}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => void navigate('/login')}
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Back to login
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </SR>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default ResetPasswordPage;
```

Update `apps/web/src/pages/auth/LoginPage.tsx`:

```tsx
                    <div className="text-sm">
                      <Link
                        to="/forgot-password"
                        className="font-semibold text-primary hover:underline"
                      >
                        نسيت كلمة المرور؟
                      </Link>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-14 rounded-xl text-base hover:scale-[1.02] transition-transform"
                      size="lg"
                      disabled={isLoading}
                    >
```

Update `apps/web/src/App.tsx` imports and routes:

```tsx
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

<Route path="/login" element={<LoginPage />} />
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
<Route path="/reset-password" element={<ResetPasswordPage />} />
<Route path="/register" element={<RegisterPage />} />
```

- [ ] **Step 4: Run verification**

Run:

```bash
pnpm --filter @hena-wadeena/web test -- src/pages/auth/__tests__/LoginPage.spec.tsx src/pages/auth/__tests__/ForgotPasswordPage.spec.tsx src/pages/auth/__tests__/ResetPasswordPage.spec.tsx
pnpm --filter @hena-wadeena/web typecheck
```

Expected: PASS. The login page should expose the recovery entry point, reset-request should use the backend's generic-success flow, and confirm-reset should send `email`, `otp`, and `new_password`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/api.ts apps/web/src/App.tsx apps/web/src/pages/auth/LoginPage.tsx apps/web/src/pages/auth/ForgotPasswordPage.tsx apps/web/src/pages/auth/ResetPasswordPage.tsx apps/web/src/pages/auth/__tests__/LoginPage.spec.tsx apps/web/src/pages/auth/__tests__/ForgotPasswordPage.spec.tsx apps/web/src/pages/auth/__tests__/ResetPasswordPage.spec.tsx
git commit -m "feat(web): add password reset flow"
```

### Task 5: Profile Change-Password Dialog

**Files:**
- Modify: `apps/web/src/pages/profile/ProfilePage.tsx`
- Create: `apps/web/src/pages/profile/__tests__/ProfilePassword.spec.tsx`
- Modify: `apps/web/src/pages/__tests__/account-pages-localization.spec.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/pages/profile/__tests__/ProfilePassword.spec.tsx`:

```tsx
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@hena-wadeena/types';

import ProfilePage from '../ProfilePage';

const mockUseAuth = vi.fn();
const mockChangePassword = vi.fn();
const mockSetTokens = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/ScrollReveal', () => ({
  SR: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/PageTransition', () => ({
  PageTransition: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  GradientMesh: () => null,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type = 'button',
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  SelectValue: () => null,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/ltr-text', () => ({
  LtrText: ({ children, as: Tag = 'span', className }: {
    children: ReactNode;
    as?: 'span' | 'p';
    className?: string;
  }) => <Tag className={className}>{children}</Tag>,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual('@/services/api');

  return {
    ...(actual as object),
    authAPI: {
      updateMe: vi.fn(),
      changePassword: (...args: unknown[]) => mockChangePassword(...args),
    },
  };
});

vi.mock('@/services/auth-manager', () => ({
  setTokens: (...args: unknown[]) => mockSetTokens(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe('ProfilePage change password', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockChangePassword.mockReset();
    mockSetTokens.mockReset();
    mockToastError.mockReset();
    mockToastSuccess.mockReset();
    mockUpdateUser.mockReset();

    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'investor@example.com',
        phone: '+201000000000',
        full_name: 'John Doe',
        avatar_url: null,
        role: UserRole.INVESTOR,
        status: 'active',
        language: 'en',
      },
      isAuthenticated: true,
      isLoading: false,
      language: 'en',
      direction: 'ltr',
      updateUser: mockUpdateUser,
    });
  });

  it('blocks submission when confirmation does not match', () => {
    render(<ProfilePage />);

    fireEvent.click(screen.getByRole('button', { name: /change password/i }));
    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'old-password' },
    });
    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'password456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    expect(mockChangePassword).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalled();
  });

  it('updates tokens and the auth user after a successful password change', async () => {
    mockChangePassword.mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      token_type: 'bearer',
      expires_in: 900,
      user: {
        id: 'user-1',
        email: 'investor@example.com',
        phone: '+201000000000',
        full_name: 'John Doe',
        avatar_url: null,
        role: UserRole.INVESTOR,
        status: 'active',
        language: 'en',
      },
    });

    render(<ProfilePage />);

    fireEvent.click(screen.getByRole('button', { name: /change password/i }));
    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'old-password' },
    });
    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        current_password: 'old-password',
        new_password: 'password123',
      });
    });

    expect(mockSetTokens).toHaveBeenCalledWith('access-token', 'refresh-token');
    expect(mockUpdateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'investor@example.com',
      }),
    );
  });
});
```

Update the auth API mock in `apps/web/src/pages/__tests__/account-pages-localization.spec.tsx`:

```tsx
vi.mock('@/services/api', async () => {
  const actual = await vi.importActual('@/services/api');

  return {
    ...(actual as object),
    authAPI: {
      updateMe: vi.fn(),
      changePassword: vi.fn(),
    },
  };
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @hena-wadeena/web test -- src/pages/profile/__tests__/ProfilePassword.spec.tsx src/pages/__tests__/account-pages-localization.spec.tsx
```

Expected: FAIL because `ProfilePage` does not yet render a change-password action or call the new password API.

- [ ] **Step 3: Write minimal implementation**

Update `apps/web/src/pages/profile/ProfilePage.tsx` imports:

```tsx
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { KeyRound, User, Mail, Phone, Globe, Edit2, Camera, Shield } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LtrText } from '@/components/ui/ltr-text';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { authAPI } from '@/services/api';
import * as authManager from '@/services/auth-manager';
import type { AuthUser } from '@/services/api';
import { useAuth } from '@/hooks/use-auth';
```

Add password-form state near the other component state:

```tsx
type PasswordFormState = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
  current_password: '',
  new_password: '',
  confirm_password: '',
});
const [changingPassword, setChangingPassword] = useState(false);
```

Add the handler inside `ProfilePage`:

```tsx
  const handleChangePassword = async () => {
    if (passwordForm.new_password.length < 8) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'يجب أن تكون كلمة المرور الجديدة 8 أحرف على الأقل',
          en: 'The new password must be at least 8 characters',
        }),
      );
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'تأكيد كلمة المرور غير مطابق',
          en: 'Password confirmation does not match',
        }),
      );
      return;
    }

    setChangingPassword(true);

    try {
      const response = await authAPI.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });

      if ('status' in response) {
        throw new Error(
          pickLocalizedCopy(appLanguage, {
            ar: 'تعذر تحديث جلسة تسجيل الدخول بعد تغيير كلمة المرور',
            en: 'Unable to refresh the session after changing the password',
          }),
        );
      }

      authManager.setTokens(response.access_token, response.refresh_token);
      updateUser(response.user);
      setPasswordDialogOpen(false);
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      toast.success(
        pickLocalizedCopy(appLanguage, {
          ar: 'تم تغيير كلمة المرور بنجاح',
          en: 'Password changed successfully',
        }),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : pickLocalizedCopy(appLanguage, {
              ar: 'تعذر تغيير كلمة المرور',
              en: 'Unable to change the password',
            }),
      );
    } finally {
      setChangingPassword(false);
    }
  };
```

Add the button in the non-editing view:

```tsx
                      <Button
                        onClick={() => setPasswordDialogOpen(true)}
                        className="h-12 w-full transition-transform hover:scale-[1.01]"
                        variant="outline"
                      >
                        <KeyRound className="ml-2 h-4 w-4" />
                        {pickLocalizedCopy(appLanguage, {
                          ar: 'تغيير كلمة المرور',
                          en: 'Change password',
                        })}
                      </Button>
```

Add the dialog near the end of the returned JSX, inside the main card block:

```tsx
                <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {pickLocalizedCopy(appLanguage, {
                          ar: 'تغيير كلمة المرور',
                          en: 'Change password',
                        })}
                      </DialogTitle>
                      <DialogDescription>
                        {pickLocalizedCopy(appLanguage, {
                          ar: 'أدخل كلمة المرور الحالية ثم اختر كلمة مرور جديدة.',
                          en: 'Enter your current password and choose a new one.',
                        })}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">
                          {pickLocalizedCopy(appLanguage, {
                            ar: 'كلمة المرور الحالية',
                            en: 'Current password',
                          })}
                        </Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={passwordForm.current_password}
                          onChange={(event) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              current_password: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-password">
                          {pickLocalizedCopy(appLanguage, {
                            ar: 'كلمة المرور الجديدة',
                            en: 'New password',
                          })}
                        </Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={passwordForm.new_password}
                          onChange={(event) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              new_password: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-new-password">
                          {pickLocalizedCopy(appLanguage, {
                            ar: 'تأكيد كلمة المرور الجديدة',
                            en: 'Confirm new password',
                          })}
                        </Label>
                        <Input
                          id="confirm-new-password"
                          type="password"
                          value={passwordForm.confirm_password}
                          onChange={(event) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              confirm_password: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setPasswordDialogOpen(false)}
                        disabled={changingPassword}
                      >
                        {pickLocalizedCopy(appLanguage, {
                          ar: 'إلغاء',
                          en: 'Cancel',
                        })}
                      </Button>
                      <Button onClick={() => void handleChangePassword()} disabled={changingPassword}>
                        {changingPassword
                          ? pickLocalizedCopy(appLanguage, {
                              ar: 'جارٍ التحديث...',
                              en: 'Updating...',
                            })
                          : pickLocalizedCopy(appLanguage, {
                              ar: 'تحديث كلمة المرور',
                              en: 'Update password',
                            })}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
```

- [ ] **Step 4: Run verification**

Run:

```bash
pnpm --filter @hena-wadeena/web test -- src/pages/profile/__tests__/ProfilePassword.spec.tsx src/pages/__tests__/account-pages-localization.spec.tsx
pnpm --filter @hena-wadeena/web typecheck
```

Expected: PASS. A successful password change should refresh tokens through `auth-manager`, update the in-memory auth user, and keep the rest of the existing profile tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/profile/ProfilePage.tsx apps/web/src/pages/profile/__tests__/ProfilePassword.spec.tsx apps/web/src/pages/__tests__/account-pages-localization.spec.tsx
git commit -m "feat(web): add profile password change"
```
