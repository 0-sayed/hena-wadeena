import { lazy, Suspense } from 'react';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { UserRole } from '@hena-wadeena/types';
import { AuthProvider } from '@/contexts/auth-context';
import { ChatWidget } from '@/components/ai/ChatWidget';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireRole } from '@/components/auth/RequireRole';
import Index from './pages/Index';
import LogisticsPage from './pages/LogisticsPage';
import MarketplacePage from './pages/MarketplacePage';
import InvestmentPage from './pages/InvestmentPage';
import TourismPage from './pages/TourismPage';
import NotFound from './pages/NotFound';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import KycContinuePage from './pages/auth/KycContinuePage';
import RequestPasswordResetPage from './pages/auth/RequestPasswordResetPage';
import ConfirmPasswordResetPage from './pages/auth/ConfirmPasswordResetPage';

import ProfilePage from './pages/profile/ProfilePage';
import WalletPage from './pages/profile/WalletPage';
import BookingsPage from './pages/profile/BookingsPage';
import NotificationsPage from './pages/profile/NotificationsPage';
import ChangePasswordPage from './pages/profile/ChangePasswordPage';

import GuidesPage from './pages/guides/GuidesPage';
import GuideProfilePage from './pages/guides/GuideProfilePage';
import GuideDashboard from './pages/roles/GuideDashboard';
import MerchantDashboard from './pages/roles/MerchantDashboard';
import DriverDashboard from './pages/roles/DriverDashboard';
import InvestorDashboard from './pages/roles/InvestorDashboard';
import TouristDashboard from './pages/roles/TouristDashboard';
import StudentDashboard from './pages/roles/StudentDashboard';
import ResidentDashboard from './pages/roles/ResidentDashboard';
import ReviewerDashboard from './pages/reviewer/ReviewerDashboard';

import SearchResultsPage from './pages/search/SearchResultsPage';

import CreateRidePage from './pages/logistics/CreateRidePage';
import RideDetailPage from './pages/logistics/RideDetailPage';

import PricesPage from './pages/marketplace/PricesPage';
import ListingDetailsPage from './pages/marketplace/ListingDetailsPage';
import ListingInquiryPage from './pages/marketplace/ListingInquiryPage';
import ListingInquiriesPage from './pages/marketplace/ListingInquiriesPage';
import SupplierDetailsPage from './pages/marketplace/SupplierDetailsPage';

import OpportunityDetailsPage from './pages/investment/OpportunityDetailsPage';
import ContactPage from './pages/investment/ContactPage';
import StartupDetailsPage from './pages/investment/StartupDetailsPage';

import BenefitsPage from './pages/BenefitsPage';
import JobBoardPage from './pages/jobs/JobBoardPage';
import JobDetailPage from './pages/jobs/JobDetailPage';
import PostJobPage from './pages/jobs/PostJobPage';
import EditJobPage from './pages/jobs/EditJobPage';
import MyApplicationsPage from './pages/jobs/MyApplicationsPage';
import MyPostsPage from './pages/jobs/MyPostsPage';
import AttractionsPage from './pages/tourism/AttractionsPage';
import AttractionDetailsPage from './pages/tourism/AttractionDetailsPage';
import PackagesPage from './pages/tourism/PackagesPage';
import GuideBookingPage from './pages/tourism/GuideBookingPage';
import AccommodationListPage from './pages/tourism/AccommodationListPage';
import AccommodationDetailsPage from './pages/tourism/AccommodationDetailsPage';
import AccommodationInquiryPage from './pages/tourism/AccommodationInquiryPage';

const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminOverview = lazy(() => import('@/pages/admin/AdminOverview'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminUserDetail = lazy(() => import('@/pages/admin/AdminUserDetail'));
const AdminModeration = lazy(() => import('@/pages/admin/AdminModeration'));
const AdminGuides = lazy(() => import('@/pages/admin/AdminGuides'));
const AdminMap = lazy(() => import('@/pages/admin/AdminMap'));
const AdminCrops = lazy(() => import('@/pages/admin/AdminCrops'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/kyc/continue" element={<KycContinuePage />} />
            <Route path="/password-reset/request" element={<RequestPasswordResetPage />} />
            <Route path="/password-reset/confirm" element={<ConfirmPasswordResetPage />} />

            <Route element={<RequireAuth />}>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/change-password" element={<ChangePasswordPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/bookings" element={<BookingsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/marketplace/inquiry/:id" element={<ListingInquiryPage />} />
              <Route path="/marketplace/inquiries" element={<ListingInquiriesPage />} />
              <Route
                element={
                  <RequireRole
                    roles={[
                      UserRole.TOURIST,
                      UserRole.STUDENT,
                      UserRole.INVESTOR,
                      UserRole.RESIDENT,
                    ]}
                  />
                }
              >
                <Route path="/tourism/book-package/:packageId" element={<GuideBookingPage />} />
              </Route>
            </Route>

            <Route path="/guides" element={<GuidesPage />} />
            <Route path="/guides/:id" element={<GuideProfilePage />} />

            <Route element={<RequireAuth />}>
              <Route
                path="admin"
                element={
                  <Suspense fallback={null}>
                    <AdminLayout />
                  </Suspense>
                }
              >
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<AdminOverview />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="users/:id" element={<AdminUserDetail />} />
                <Route path="moderation" element={<AdminModeration />} />
                <Route path="guides" element={<AdminGuides />} />
                <Route path="map" element={<AdminMap />} />
                <Route path="crops" element={<AdminCrops />} />
              </Route>
            </Route>

            <Route element={<RequireAuth />}>
              <Route element={<RequireRole roles={[UserRole.GUIDE]} />}>
                <Route path="/dashboard/guide" element={<GuideDashboard />} />
              </Route>
              <Route element={<RequireRole roles={[UserRole.MERCHANT]} />}>
                <Route path="/dashboard/merchant" element={<MerchantDashboard />} />
              </Route>
              <Route element={<RequireRole roles={[UserRole.DRIVER]} />}>
                <Route path="/dashboard/driver" element={<DriverDashboard />} />
              </Route>
              <Route element={<RequireRole roles={[UserRole.INVESTOR]} />}>
                <Route path="/dashboard/investor" element={<InvestorDashboard />} />
              </Route>
              <Route element={<RequireRole roles={[UserRole.TOURIST]} />}>
                <Route path="/dashboard/tourist" element={<TouristDashboard />} />
              </Route>
              <Route element={<RequireRole roles={[UserRole.STUDENT]} />}>
                <Route path="/dashboard/student" element={<StudentDashboard />} />
              </Route>
              <Route element={<RequireRole roles={[UserRole.RESIDENT]} />}>
                <Route path="/dashboard/resident" element={<ResidentDashboard />} />
              </Route>
              <Route element={<RequireRole roles={[UserRole.ADMIN, UserRole.REVIEWER]} />}>
                <Route path="/reviewer" element={<ReviewerDashboard />} />
              </Route>
            </Route>

            <Route path="/benefits" element={<BenefitsPage />} />

            {/* Employment board — public browsing */}
            <Route path="/jobs" element={<JobBoardPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />

            {/* Employment board — authenticated actions */}
            <Route element={<RequireAuth />}>
              <Route path="/jobs/post" element={<PostJobPage />} />
              <Route path="/jobs/:id/edit" element={<EditJobPage />} />
              <Route path="/jobs/my-applications" element={<MyApplicationsPage />} />
              <Route path="/jobs/my-posts" element={<MyPostsPage />} />
            </Route>
            <Route path="/search" element={<SearchResultsPage />} />

            <Route path="/tourism" element={<TourismPage />} />
            <Route path="/tourism/attractions" element={<AttractionsPage />} />
            <Route path="/tourism/attraction/:slug" element={<AttractionDetailsPage />} />
            <Route path="/tourism/packages" element={<PackagesPage />} />
            <Route path="/tourism/accommodation" element={<AccommodationListPage />} />
            <Route path="/tourism/accommodation/:id" element={<AccommodationDetailsPage />} />
            <Route
              path="/tourism/accommodation-inquiry/:id"
              element={<AccommodationInquiryPage />}
            />

            <Route path="/logistics" element={<LogisticsPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<RequireRole roles={[UserRole.DRIVER, UserRole.ADMIN]} />}>
                <Route path="/logistics/create-ride" element={<CreateRidePage />} />
              </Route>
            </Route>
            <Route path="/logistics/ride/:id" element={<RideDetailPage />} />

            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/marketplace/ads/:id" element={<ListingDetailsPage />} />
            <Route path="/marketplace/prices" element={<PricesPage />} />
            <Route path="/marketplace/supplier/:id" element={<SupplierDetailsPage />} />

            <Route path="/investment" element={<InvestmentPage />} />
            <Route path="/investment/opportunity/:id" element={<OpportunityDetailsPage />} />
            <Route path="/investment/startups/:id" element={<StartupDetailsPage />} />
            <Route path="/investment/contact/:id" element={<ContactPage />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          <ChatWidget />
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
