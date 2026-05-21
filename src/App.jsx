import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { APP_INFO } from './constants/appInfo';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import AutoRedirect from './components/AutoRedirect';
import DashboardLayout from './components/layout/DashboardLayout';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import Features from './pages/Features';
import Pricing from './pages/Pricing';
import Onboarding from './pages/Onboarding';
import OnboardingWizardDemo from './pages/OnboardingWizardDemo';
import OnboardingWizardPage from './pages/OnboardingWizardPage';
import OnboardingOTPPage from './pages/OnboardingOTPPage';
import LoginPage from './pages/LoginPage';
import UnsupportedAccountPage from './pages/UnsupportedAccountPage';
import PhoneVerificationPage from './pages/PhoneVerificationPage';
import PhoneVerificationLinkPage from './pages/PhoneVerificationLinkPage';
import InviteAcceptPage from './pages/InviteAcceptPage';
import UsersPage from './pages/restaurant/UsersPage';
import VoiceLayout from './components/layout/VoiceLayout';
import VoiceUsersPage from './pages/voice/VoiceUsersPage';
import MerxusLayout from './components/layout/MerxusLayout';
import EstateLayout from './components/layout/EstateLayout';
import EstateUsersPage from './pages/estate/EstateUsersPage';
import SupportPage from './pages/SupportPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import CheckoutReturnPage from './pages/CheckoutReturnPage';
import CheckoutHandoffPage from './pages/CheckoutHandoffPage';
import InstagramLandingPage from './pages/InstagramLandingPage';
import SimpleOnboardingWizard from './pages/SimpleOnboardingWizard';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import TenantActivationPage from './pages/TenantActivationPage';
import OfficeLandingPage from './pages/OfficeLandingPage';
import RealEstateLandingPage from './pages/RealEstateLandingPage';
import RestaurantLandingPage from './pages/RestaurantLandingPage';
import EliteFeatureWorkspace from './components/premium/EliteFeatureWorkspace';
import WebsiteChatWidget from './components/chat/WebsiteChatWidget';
import lazyWithRetry from './utils/lazyWithRetry';
import {
  initMetaPixel,
  persistCampaignAttribution,
  trackMetaEvent,
} from './utils/metaPixel';
import { markDiagnostic } from './utils/productionDiagnostics';

const lazy = lazyWithRetry;

const OrdersPage = lazy(() => import('./pages/restaurant/OrdersPage'));
const RestaurantBookingsPage = lazy(() => import('./pages/restaurant/RestaurantBookingsPage'));
const RestaurantBookingAreasPage = lazy(() => import('./pages/restaurant/RestaurantBookingAreasPage'));
const RestaurantBookingSettingsPage = lazy(() => import('./pages/restaurant/RestaurantBookingSettingsPage'));
const ReservationsPage = lazy(() => import('./pages/restaurant/ReservationsPage'));
const DashboardPage = lazy(() => import('./pages/restaurant/DashboardPage'));
const RestaurantDashboard = lazy(() => import('./components/restaurant/RestaurantDashboard'));
const CallsPage = lazy(() => import('./pages/restaurant/CallsPage'));
const CustomersPage = lazy(() => import('./pages/restaurant/CustomersPage'));
const MenuPage = lazy(() => import('./pages/restaurant/MenuPage'));
const SettingsPage = lazy(() => import('./pages/restaurant/SettingsPage'));
const RestaurantSmsPage = lazy(() => import('./pages/restaurant/RestaurantSmsPage'));
const RestaurantCommandCenterPage = lazy(() => import('./pages/restaurant/RestaurantCommandCenterPage'));
const RestaurantNotificationsPage = lazy(() => import('./pages/restaurant/RestaurantNotificationsPage'));
const RestaurantIntelligencePage = lazy(() => import('./pages/restaurant/RestaurantIntelligencePage'));
const RestaurantCustomer360Page = lazy(() => import('./pages/restaurant/RestaurantCustomer360Page'));
const RestaurantMergeActivityPage = lazy(() => import('./pages/restaurant/RestaurantMergeActivityPage'));
const RestaurantReviewsPage = lazy(() => import('./pages/restaurant/RestaurantReviewsPage'));
const RestaurantFeedbackPage = lazy(() => import('./pages/restaurant/RestaurantFeedbackPage'));
const RestaurantFeedbackIntegrationsPage = lazy(() => import('./pages/restaurant/RestaurantFeedbackIntegrationsPage'));

const VoiceDashboardPage = lazy(() => import('./pages/voice/VoiceDashboardPage'));
const VoiceCallsPage = lazy(() => import('./pages/voice/VoiceCallsPage'));
const CallRoutingPage = lazy(() => import('./pages/voice/CallRoutingPage'));
const VoicemailPage = lazy(() => import('./pages/voice/VoicemailPage'));
const VoiceSettingsPage = lazy(() => import('./pages/voice/VoiceSettingsPage'));
const VoiceSmsPage = lazy(() => import('./pages/voice/VoiceSmsPage'));
const VoiceCommandCenterPage = lazy(() => import('./pages/voice/VoiceCommandCenterPage'));
const VoiceNotificationsPage = lazy(() => import('./pages/voice/VoiceNotificationsPage'));
const VoiceIntelligencePage = lazy(() => import('./pages/voice/VoiceIntelligencePage'));
const VoiceWorkItemsPage = lazy(() => import('./pages/voice/VoiceWorkItemsPage'));
const VoiceCustomer360Page = lazy(() => import('./pages/voice/VoiceCustomer360Page'));
const VoiceMergeActivityPage = lazy(() => import('./pages/voice/VoiceMergeActivityPage'));
const VoiceReviewsPage = lazy(() => import('./pages/voice/VoiceReviewsPage'));
const VoiceFeedbackPage = lazy(() => import('./pages/voice/VoiceFeedbackPage'));
const VoiceFeedbackIntegrationsPage = lazy(() => import('./pages/voice/VoiceFeedbackIntegrationsPage'));

const MerxusDashboardPage = lazy(() => import('./pages/merxus/MerxusDashboardPage'));
const RestaurantsPage = lazy(() => import('./pages/merxus/RestaurantsPage'));
const CreateRestaurantPage = lazy(() => import('./pages/merxus/CreateRestaurantPage'));
const VoicesPage = lazy(() => import('./pages/merxus/VoicesPage'));
const RealEstateCompaniesPage = lazy(() => import('./pages/merxus/RealEstateCompaniesPage'));
const AnalyticsPage = lazy(() => import('./pages/merxus/AnalyticsPage'));
const MerxusOpsAuditPage = lazy(() => import('./pages/merxus/MerxusOpsAuditPage'));
const MerxusProductionReadinessPage = lazy(() => import('./pages/merxus/MerxusProductionReadinessPage'));
const SystemSettingsPage = lazy(() => import('./pages/merxus/SystemSettingsPage'));
const TenantSelectorPage = lazy(() => import('./pages/merxus/TenantSelectorPage'));
const VoiceAdminPage = lazy(() => import('./pages/merxus/VoiceAdminPage'));
const SuperAdminUsersPage = lazy(() => import('./pages/merxus/SuperAdminUsersPage'));
const SetupWizardPage = lazy(() => import('./pages/merxus/SetupWizardPage'));
const TenantsManagementPage = lazy(() => import('./pages/merxus/TenantsManagementPage'));

const EstateDashboardPage = lazy(() => import('./pages/estate/EstateDashboardPage'));
const EstateListingsPage = lazy(() => import('./pages/estate/EstateListingsPage'));
const EstateLeadsPage = lazy(() => import('./pages/estate/EstateLeadsPage'));
const EstateShowingsPage = lazy(() => import('./pages/estate/EstateShowingsPage'));
const EstateCallsPage = lazy(() => import('./pages/estate/EstateCallsPage'));
const ListingDetailPage = lazy(() => import('./pages/estate/ListingDetailPage'));
const EstateSettingsPage = lazy(() => import('./pages/estate/EstateSettingsPage'));
const EstateSmsPage = lazy(() => import('./pages/estate/EstateSmsPage'));
const EstateCommandCenterPage = lazy(() => import('./pages/estate/EstateCommandCenterPage'));
const EstateNotificationsPage = lazy(() => import('./pages/estate/EstateNotificationsPage'));
const EstateIntelligencePage = lazy(() => import('./pages/estate/EstateIntelligencePage'));
const EstateCustomer360Page = lazy(() => import('./pages/estate/EstateCustomer360Page'));
const EstateMergeActivityPage = lazy(() => import('./pages/estate/EstateMergeActivityPage'));
const EstateReviewsPage = lazy(() => import('./pages/estate/EstateReviewsPage'));
const EstateFeedbackPage = lazy(() => import('./pages/estate/EstateFeedbackPage'));
const EstateFeedbackIntegrationsPage = lazy(() => import('./pages/estate/EstateFeedbackIntegrationsPage'));
const FlyerApprovalsPage = lazy(() => import('./pages/estate/FlyerApprovalsPage'));
const FlyerMetricsPage = lazy(() => import('./pages/estate/FlyerMetricsPage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));

function RouteLoadingState() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 text-sm font-medium text-slate-500">
      Loading workspace...
    </div>
  );
}

function LazyRoute({ children }) {
  return <Suspense fallback={<RouteLoadingState />}>{children}</Suspense>;
}

function PublicWebsiteChat() {
  const { pathname } = useLocation();
  const hiddenPrefixes = [
    '/restaurant',
    '/voice',
    '/estate',
    '/merxus',
    '/login',
    '/invite',
    '/verify-phone',
    '/checkout',
    '/tenant-activation',
    '/support',
  ];

  if (hiddenPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null;
  }

  return (
    <WebsiteChatWidget
      product="merxus"
      tenantId="merxus-platform"
      tenantType="platform"
    />
  );
}

function MetaRouteTracker() {
  const location = useLocation();

  useEffect(() => {
    persistCampaignAttribution();
    initMetaPixel();
  }, []);

  useEffect(() => {
    markDiagnostic('route:resolved', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    });
    persistCampaignAttribution();
    trackMetaEvent('PageView', {
      path: location.pathname,
      search: location.search,
    });

    const paidSocialRoutes = {
      '/office-ai-front-desk': 'office',
      '/ai-front-desk': 'office',
      '/solutions/office': 'office',
      '/real-estate-ai': 'real_estate',
      '/solutions/real-estate': 'real_estate',
      '/restaurant-ai': 'restaurant',
      '/solutions/restaurant': 'restaurant',
    };
    const industry = paidSocialRoutes[location.pathname];
    if (industry) {
      trackMetaEvent('ViewContent', {
        industry,
        pageType: 'paid_social_landing',
        path: location.pathname,
      });
    }
  }, [location.pathname, location.search]);

  return null;
}

function App() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const hasRetryParam = url.searchParams.has('__lazy_retry') || url.searchParams.has('__module_boundary_retry');
    if (!hasRetryParam) return;
    url.searchParams.delete('__lazy_retry');
    url.searchParams.delete('__module_boundary_retry');
    window.history.replaceState({}, '', url.toString());
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
        <MetaRouteTracker />
        <Routes>
          {/* Public routes - no NavBar */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unsupported-account" element={<UnsupportedAccountPage />} />
          <Route path="/invite/accept" element={<InviteAcceptPage />} />
          <Route path="/verify-phone-link" element={<PhoneVerificationLinkPage />} />
          <Route path="/checkout/start" element={<CheckoutHandoffPage />} />
          <Route
            path="/verify-phone"
            element={
              <ProtectedRoute requireAuth>
                <PhoneVerificationPage />
              </ProtectedRoute>
            }
          />
          <Route path="/onboarding/verify-otp" element={<OnboardingOTPPage />} />
          <Route path="/onboarding-wizard" element={<OnboardingWizardPage />} />
          <Route
            path="/tenant-activation"
            element={
              <ProtectedRoute requireAuth>
                <TenantActivationPage />
              </ProtectedRoute>
            }
          />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="/terms-and-conditions" element={<Navigate to="/terms-of-service" replace />} />
          <Route
            path="/*"
            element={
              <>
                <NavBar />
                <AutoRedirect />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/features" element={<Features />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/never-miss-calls" element={<InstagramLandingPage />} />
                  <Route path="/ai-front-desk" element={<OfficeLandingPage />} />
                  <Route path="/office-ai-front-desk" element={<OfficeLandingPage />} />
                  <Route path="/real-estate-ai" element={<RealEstateLandingPage />} />
                  <Route path="/restaurant-ai" element={<RestaurantLandingPage />} />
                  <Route path="/solutions/office" element={<OfficeLandingPage />} />
                  <Route path="/solutions/real-estate" element={<RealEstateLandingPage />} />
                  <Route path="/solutions/restaurant" element={<RestaurantLandingPage />} />
                  <Route path="/setup" element={<SimpleOnboardingWizard />} />
                  <Route path="/payment-success" element={<PaymentSuccessPage />} />
                  <Route path="/checkout/return" element={<CheckoutReturnPage />} />
                  <Route path="/onboarding-wizard-demo" element={<OnboardingWizardDemo />} />
                  
                  {/* Restaurant portal routes */}
                  <Route
                    path="/restaurant/*"
                    element={
                      <ProtectedRoute requireAuth requireRestaurant>
                        <DashboardLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<LazyRoute><DashboardPage /></LazyRoute>} />
                    <Route path="active-dashboard" element={<LazyRoute><RestaurantDashboard /></LazyRoute>} />
                    <Route path="orders" element={<LazyRoute><OrdersPage /></LazyRoute>} />
                    <Route path="bookings" element={<LazyRoute><RestaurantBookingsPage /></LazyRoute>} />
                    <Route path="booking-areas" element={<LazyRoute><RestaurantBookingAreasPage /></LazyRoute>} />
                    <Route path="booking-settings" element={<LazyRoute><RestaurantBookingSettingsPage /></LazyRoute>} />
                    <Route path="reservations" element={<LazyRoute><ReservationsPage /></LazyRoute>} />
                    <Route path="calls" element={<LazyRoute><CallsPage /></LazyRoute>} />
                    <Route path="customers" element={<LazyRoute><CustomersPage /></LazyRoute>} />
                    <Route path="menu" element={<LazyRoute><MenuPage /></LazyRoute>} />
                    <Route path="sms" element={<LazyRoute><RestaurantSmsPage /></LazyRoute>} />
                    <Route path="command-center" element={<LazyRoute><RestaurantCommandCenterPage /></LazyRoute>} />
                    <Route path="notifications" element={<LazyRoute><RestaurantNotificationsPage /></LazyRoute>} />
                    <Route
                      path="intelligence"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="professional">
                          <LazyRoute><RestaurantIntelligencePage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="customer-360"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="professional">
                          <LazyRoute><RestaurantCustomer360Page /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="customer-360/:customerId"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="professional">
                          <LazyRoute><RestaurantCustomer360Page /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="merge-activity"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="professional">
                          <LazyRoute><RestaurantMergeActivityPage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="reviews"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="elite">
                          <LazyRoute><RestaurantReviewsPage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="feedback"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="elite">
                          <LazyRoute><RestaurantFeedbackPage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="feedback/integrations"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="elite">
                          <LazyRoute><RestaurantFeedbackIntegrationsPage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="automations"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="elite">
                          <EliteFeatureWorkspace tenantType="restaurant" featureKey="automations" />
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="cx-analytics"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="elite">
                          <EliteFeatureWorkspace tenantType="restaurant" featureKey="cx-analytics" />
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="settings"
                      element={(
                        <ProtectedRoute requireAuth requireManager>
                          <LazyRoute><SettingsPage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route path="users" element={<UsersPage />} />
                    <Route
                      path="billing"
                      element={(
                        <ProtectedRoute requireAuth requireManager>
                          <LazyRoute><BillingPage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route path="*" element={<Navigate to="/restaurant" replace />} />
                  </Route>

                  {/* Voice portal routes */}
                  <Route
                    path="/voice/*"
                    element={
                      <ProtectedRoute requireAuth requireVoice>
                        <VoiceLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<LazyRoute><VoiceDashboardPage /></LazyRoute>} />
                    <Route path="calls" element={<LazyRoute><VoiceCallsPage /></LazyRoute>} />
                    <Route
                      path="routing"
                      element={(
                        <ProtectedRoute requireAuth requireManager>
                          <LazyRoute><CallRoutingPage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route path="voicemail" element={<LazyRoute><VoicemailPage /></LazyRoute>} />
                    <Route path="sms" element={<LazyRoute><VoiceSmsPage /></LazyRoute>} />
                    <Route path="command-center" element={<LazyRoute><VoiceCommandCenterPage /></LazyRoute>} />
                    <Route path="notifications" element={<LazyRoute><VoiceNotificationsPage /></LazyRoute>} />
                    <Route
                      path="intelligence"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="professional">
                          <LazyRoute><VoiceIntelligencePage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="work-items"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="professional">
                          <LazyRoute><VoiceWorkItemsPage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="customer-360"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="professional">
                          <LazyRoute><VoiceCustomer360Page /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="customer-360/:customerId"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="professional">
                          <LazyRoute><VoiceCustomer360Page /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="merge-activity"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="professional">
                          <LazyRoute><VoiceMergeActivityPage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="reviews"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="elite">
                          <LazyRoute><VoiceReviewsPage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="feedback"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="elite">
                          <LazyRoute><VoiceFeedbackPage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="feedback/integrations"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="elite">
                          <LazyRoute><VoiceFeedbackIntegrationsPage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="automations"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="elite">
                          <EliteFeatureWorkspace tenantType="voice" featureKey="automations" />
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="cx-analytics"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="elite">
                          <EliteFeatureWorkspace tenantType="voice" featureKey="cx-analytics" />
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="settings"
                      element={(
                        <ProtectedRoute requireAuth requireManager>
                          <LazyRoute><VoiceSettingsPage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route path="users" element={<VoiceUsersPage />} />
                    <Route
                      path="billing"
                      element={(
                        <ProtectedRoute requireAuth requireManager>
                          <LazyRoute><BillingPage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route path="*" element={<Navigate to="/voice" replace />} />
                  </Route>

                  {/* Real Estate portal routes */}
                  <Route
                    path="/estate/*"
                    element={
                      <ProtectedRoute requireAuth requireRealEstate>
                        <EstateLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<LazyRoute><EstateDashboardPage /></LazyRoute>} />
                    <Route path="dashboard" element={<LazyRoute><EstateDashboardPage /></LazyRoute>} />
                    <Route path="listings" element={<LazyRoute><EstateListingsPage /></LazyRoute>} />
                    <Route path="listings/:id" element={<LazyRoute><ListingDetailPage /></LazyRoute>} />
                    <Route path="leads" element={<LazyRoute><EstateLeadsPage /></LazyRoute>} />
                    <Route path="showings" element={<LazyRoute><EstateShowingsPage /></LazyRoute>} />
                    <Route path="calls" element={<LazyRoute><EstateCallsPage /></LazyRoute>} />
                    <Route path="flyers/approvals" element={<LazyRoute><FlyerApprovalsPage /></LazyRoute>} />
                    <Route path="flyers/metrics" element={<LazyRoute><FlyerMetricsPage /></LazyRoute>} />
                    <Route path="sms" element={<LazyRoute><EstateSmsPage /></LazyRoute>} />
                    <Route path="command-center" element={<LazyRoute><EstateCommandCenterPage /></LazyRoute>} />
                    <Route path="notifications" element={<LazyRoute><EstateNotificationsPage /></LazyRoute>} />
                    <Route
                      path="intelligence"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="professional">
                          <LazyRoute><EstateIntelligencePage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="customer-360"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="professional">
                          <LazyRoute><EstateCustomer360Page /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="customer-360/:customerId"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="professional">
                          <LazyRoute><EstateCustomer360Page /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="merge-activity"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="professional">
                          <LazyRoute><EstateMergeActivityPage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="reviews"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="elite">
                          <LazyRoute><EstateReviewsPage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="feedback"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="elite">
                          <LazyRoute><EstateFeedbackPage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="feedback/integrations"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="elite">
                          <LazyRoute><EstateFeedbackIntegrationsPage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="automations"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="elite">
                          <EliteFeatureWorkspace tenantType="real_estate" featureKey="automations" />
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="cx-analytics"
                      element={(
                        <ProtectedRoute requireAuth requiredPlanTier="elite">
                          <EliteFeatureWorkspace tenantType="real_estate" featureKey="cx-analytics" />
                        </ProtectedRoute>
                      )}
                    />
                    <Route
                      path="settings"
                      element={(
                        <ProtectedRoute requireAuth requireManager>
                          <LazyRoute><EstateSettingsPage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route path="users" element={<EstateUsersPage />} />
                    <Route
                      path="billing"
                      element={(
                        <ProtectedRoute requireAuth requireManager>
                          <LazyRoute><BillingPage /></LazyRoute>
                        </ProtectedRoute>
                      )}
                    />
                    <Route path="*" element={<Navigate to="/estate" replace />} />
                  </Route>

                  {/* Super-admin tenant selector (standalone page) */}
                  <Route
                    path="/merxus/select-tenant"
                    element={
                      <ProtectedRoute requireAuth requireMerxus>
                        <LazyRoute><TenantSelectorPage /></LazyRoute>
                      </ProtectedRoute>
                    }
                  />

                  {/* Merxus admin portal routes */}
                  <Route
                    path="/merxus/*"
                    element={
                      <ProtectedRoute requireAuth requireMerxus>
                        <MerxusLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<LazyRoute><MerxusDashboardPage /></LazyRoute>} />
                    <Route path="tenants" element={<LazyRoute><TenantsManagementPage /></LazyRoute>} />
                    <Route path="voice-admin" element={<LazyRoute><VoiceAdminPage /></LazyRoute>} />
                    <Route path="voices" element={<LazyRoute><VoicesPage /></LazyRoute>} />
                    <Route path="restaurants" element={<LazyRoute><RestaurantsPage /></LazyRoute>} />
                    <Route path="restaurants/new" element={<LazyRoute><CreateRestaurantPage /></LazyRoute>} />
                    <Route path="real-estate" element={<LazyRoute><RealEstateCompaniesPage /></LazyRoute>} />
                    <Route path="analytics" element={<LazyRoute><AnalyticsPage /></LazyRoute>} />
                    <Route path="ops-audit" element={<LazyRoute><MerxusOpsAuditPage /></LazyRoute>} />
                    <Route path="production-readiness" element={<LazyRoute><MerxusProductionReadinessPage /></LazyRoute>} />
                    <Route path="settings" element={<LazyRoute><SystemSettingsPage /></LazyRoute>} />
                    <Route path="users" element={<LazyRoute><SuperAdminUsersPage /></LazyRoute>} />
                    <Route path="setup-wizard" element={<LazyRoute><SetupWizardPage /></LazyRoute>} />
                    <Route path="*" element={<Navigate to="/merxus" replace />} />
                  </Route>
                  
                  {/* Redirect authenticated users */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <footer className="mt-20 text-white bg-gray-900">
                  <div className="container px-4 py-8 mx-auto">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                      <div>
                        <h3 className="mb-4 text-xl font-bold text-primary-400">Merxus</h3>
                        <p className="text-gray-400">
                          AI communication command center for calls, SMS, chat, reviews, and team routing.
                        </p>
                      </div>
                      <div>
                        <h4 className="mb-4 font-semibold">Quick Links</h4>
                        <ul className="space-y-2 text-gray-400">
                          <li><Link to="/features" className="transition-colors hover:text-primary-400">Features</Link></li>
                          <li><Link to="/pricing" className="transition-colors hover:text-primary-400">Pricing</Link></li>
                          <li><Link to="/onboarding" className="transition-colors hover:text-primary-400">Get Started</Link></li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="mb-4 font-semibold">Support</h4>
                        <ul className="space-y-2 text-gray-400">
                          <li><a href="/support" className="transition-colors hover:text-primary-400">Help Center</a></li>
                          <li><a href="/privacy-policy" className="transition-colors hover:text-primary-400">Privacy Policy</a></li>
                          <li><a href="/terms-of-service" className="transition-colors hover:text-primary-400">Terms of Service</a></li>
                          <li><a href="mailto:support@merxusllc.com" className="transition-colors hover:text-primary-400">Contact Us</a></li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="mb-4 font-semibold">Contact</h4>
                        <p className="text-gray-400">
                          Schedule a 15-minute demo to get started.
                        </p>
                        <a href="mailto:support@merxusllc.com" className="text-primary-400 hover:text-primary-300">
                          support@merxusllc.com
                        </a>
                      </div>
                    </div>
                    <div className="pt-8 mt-8 text-center text-gray-400 border-t border-gray-800">
                      <p>{APP_INFO.fullCopyright}</p>
                    </div>
                  </div>
                </footer>
                <PublicWebsiteChat />
              </>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

