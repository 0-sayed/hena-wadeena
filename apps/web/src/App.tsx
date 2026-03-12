import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router';
import { ChatWidget } from '@/components/ai/ChatWidget';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireRole } from '@/components/auth/RequireRole';
import Index from './pages/Index';
import LogisticsPage from './pages/LogisticsPage';
import MarketplacePage from './pages/MarketplacePage';
import InvestmentPage from './pages/InvestmentPage';
import TourismPage from './pages/TourismPage';
import NotFound from './pages/NotFound';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Profile pages
import ProfilePage from './pages/profile/ProfilePage';
import WalletPage from './pages/profile/WalletPage';
import BookingsPage from './pages/profile/BookingsPage';
import NotificationsPage from './pages/profile/NotificationsPage';

// Guides pages
import GuidesPage from './pages/guides/GuidesPage';
import GuideProfilePage from './pages/guides/GuideProfilePage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ModeratorDashboard from './pages/admin/ModeratorDashboard';
import ReviewerDashboard from './pages/admin/ReviewerDashboard';

// Role dashboards
import MerchantDashboard from './pages/roles/MerchantDashboard';
import DriverDashboard from './pages/roles/DriverDashboard';
import InvestorDashboard from './pages/roles/InvestorDashboard';
import TouristDashboard from './pages/roles/TouristDashboard';
import StudentDashboard from './pages/roles/StudentDashboard';
import ResidentDashboard from './pages/roles/ResidentDashboard';

// Search pages
import SearchResultsPage from './pages/search/SearchResultsPage';

// Logistics pages
import CreateTripPage from './pages/logistics/CreateTripPage';
import BookTripPage from './pages/logistics/BookTripPage';
import RouteDetailsPage from './pages/logistics/RouteDetailsPage';
import StationDetailsPage from './pages/logistics/StationDetailsPage';

// Marketplace pages
import PricesPage from './pages/marketplace/PricesPage';
import SupplierDetailsPage from './pages/marketplace/SupplierDetailsPage';

// Investment pages
import OpportunityDetailsPage from './pages/investment/OpportunityDetailsPage';
import ContactPage from './pages/investment/ContactPage';

// Tourism pages
import GuideBookingPage from './pages/tourism/GuideBookingPage';
import AccommodationDetailsPage from './pages/tourism/AccommodationDetailsPage';
import AttractionsPage from './pages/tourism/AttractionsPage';
import AttractionDetailsPage from './pages/tourism/AttractionDetailsPage';
import AccommodationInquiryPage from './pages/tourism/AccommodationInquiryPage';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* Profile / User Dashboard */}
          <Route element={<RequireAuth />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
          {/* Guides */}
          <Route path="/guides" element={<GuidesPage />} />
          <Route path="/guides/:id" element={<GuideProfilePage />} />
          {/* Admin Dashboards */}
          <Route element={<RequireAuth />}>
            <Route element={<RequireRole roles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'moderator']} />}>
              <Route path="/moderator" element={<ModeratorDashboard />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'moderator', 'reviewer']} />}>
              <Route path="/reviewer" element={<ReviewerDashboard />} />
            </Route>
          </Route>
          {/* Role Dashboards */}
          <Route element={<RequireAuth />}>
            <Route element={<RequireRole roles={['merchant']} />}>
              <Route path="/dashboard/merchant" element={<MerchantDashboard />} />
            </Route>
            <Route element={<RequireRole roles={['driver']} />}>
              <Route path="/dashboard/driver" element={<DriverDashboard />} />
            </Route>
            <Route element={<RequireRole roles={['investor']} />}>
              <Route path="/dashboard/investor" element={<InvestorDashboard />} />
            </Route>
            <Route element={<RequireRole roles={['tourist']} />}>
              <Route path="/dashboard/tourist" element={<TouristDashboard />} />
            </Route>
            <Route element={<RequireRole roles={['student']} />}>
              <Route path="/dashboard/student" element={<StudentDashboard />} />
            </Route>
            <Route element={<RequireRole roles={['resident']} />}>
              <Route path="/dashboard/resident" element={<ResidentDashboard />} />
            </Route>
          </Route>
          {/* Search */}
          <Route path="/search" element={<SearchResultsPage />} />
          {/* Tourism */}
          <Route path="/tourism" element={<TourismPage />} />
          <Route path="/tourism/attractions" element={<AttractionsPage />} />
          <Route path="/tourism/attraction/:id" element={<AttractionDetailsPage />} />
          <Route path="/tourism/guide-booking/:id" element={<GuideBookingPage />} />
          <Route path="/tourism/accommodation/:id" element={<AccommodationDetailsPage />} />
          <Route path="/tourism/accommodation-inquiry/:id" element={<AccommodationInquiryPage />} />
          {/* Logistics */}
          <Route path="/logistics" element={<LogisticsPage />} />
          <Route path="/logistics/create-trip" element={<CreateTripPage />} />
          <Route path="/logistics/book/:id" element={<BookTripPage />} />
          <Route path="/logistics/route/:id" element={<RouteDetailsPage />} />
          <Route path="/logistics/station/:id" element={<StationDetailsPage />} />
          {/* Marketplace */}
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/marketplace/prices" element={<PricesPage />} />
          <Route path="/marketplace/supplier/:id" element={<SupplierDetailsPage />} />
          {/* Investment */}
          <Route path="/investment" element={<InvestmentPage />} />
          <Route path="/investment/opportunity/:id" element={<OpportunityDetailsPage />} />
          <Route path="/investment/contact/:id" element={<ContactPage />} />
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        {/* AI Chatbot Widget — visible on all pages */}
        <ChatWidget />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
