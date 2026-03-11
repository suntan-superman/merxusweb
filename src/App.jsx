import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { registerLicense } from '@syncfusion/ej2-base';
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
import PhoneVerificationPage from './pages/PhoneVerificationPage';
import InviteAcceptPage from './pages/InviteAcceptPage';
import DashboardPage from './pages/restaurant/DashboardPage';
import RestaurantDashboard from './components/restaurant/RestaurantDashboard';
import OrdersPage from './pages/restaurant/OrdersPage';
import ReservationsPage from './pages/restaurant/ReservationsPage';
import CallsPage from './pages/restaurant/CallsPage';
import CustomersPage from './pages/restaurant/CustomersPage';
import MenuPage from './pages/restaurant/MenuPage';
import SettingsPage from './pages/restaurant/SettingsPage';
import RestaurantSmsPage from './pages/restaurant/RestaurantSmsPage';
import RestaurantCommandCenterPage from './pages/restaurant/RestaurantCommandCenterPage';
import RestaurantNotificationsPage from './pages/restaurant/RestaurantNotificationsPage';
import RestaurantIntelligencePage from './pages/restaurant/RestaurantIntelligencePage';
import RestaurantCustomer360Page from './pages/restaurant/RestaurantCustomer360Page';
import RestaurantMergeActivityPage from './pages/restaurant/RestaurantMergeActivityPage';
import UsersPage from './pages/restaurant/UsersPage';
import VoiceLayout from './components/layout/VoiceLayout';
import VoiceDashboardPage from './pages/voice/VoiceDashboardPage';
import VoiceCallsPage from './pages/voice/VoiceCallsPage';
import CallRoutingPage from './pages/voice/CallRoutingPage';
import VoicemailPage from './pages/voice/VoicemailPage';
import VoiceSettingsPage from './pages/voice/VoiceSettingsPage';
import VoiceSmsPage from './pages/voice/VoiceSmsPage';
import VoiceCommandCenterPage from './pages/voice/VoiceCommandCenterPage';
import VoiceNotificationsPage from './pages/voice/VoiceNotificationsPage';
import VoiceIntelligencePage from './pages/voice/VoiceIntelligencePage';
import VoiceWorkItemsPage from './pages/voice/VoiceWorkItemsPage';
import VoiceCustomer360Page from './pages/voice/VoiceCustomer360Page';
import VoiceMergeActivityPage from './pages/voice/VoiceMergeActivityPage';
import VoiceUsersPage from './pages/voice/VoiceUsersPage';
import MerxusLayout from './components/layout/MerxusLayout';
import MerxusDashboardPage from './pages/merxus/MerxusDashboardPage';
import RestaurantsPage from './pages/merxus/RestaurantsPage';
import CreateRestaurantPage from './pages/merxus/CreateRestaurantPage';
import VoicesPage from './pages/merxus/VoicesPage';
import RealEstateCompaniesPage from './pages/merxus/RealEstateCompaniesPage';
import AnalyticsPage from './pages/merxus/AnalyticsPage';
import SystemSettingsPage from './pages/merxus/SystemSettingsPage';
import TenantSelectorPage from './pages/merxus/TenantSelectorPage';
import VoiceAdminPage from './pages/merxus/VoiceAdminPage';
import SuperAdminUsersPage from './pages/merxus/SuperAdminUsersPage';
import SetupWizardPage from './pages/merxus/SetupWizardPage';
import TenantsManagementPage from './pages/merxus/TenantsManagementPage';
import EstateLayout from './components/layout/EstateLayout';
import EstateDashboardPage from './pages/estate/EstateDashboardPage';
import EstateListingsPage from './pages/estate/EstateListingsPage';
import ListingDetailPage from './pages/estate/ListingDetailPage';
import EstateLeadsPage from './pages/estate/EstateLeadsPage';
import EstateShowingsPage from './pages/estate/EstateShowingsPage';
import EstateCallsPage from './pages/estate/EstateCallsPage';
import EstateSettingsPage from './pages/estate/EstateSettingsPage';
import EstateSmsPage from './pages/estate/EstateSmsPage';
import EstateCommandCenterPage from './pages/estate/EstateCommandCenterPage';
import EstateNotificationsPage from './pages/estate/EstateNotificationsPage';
import EstateIntelligencePage from './pages/estate/EstateIntelligencePage';
import EstateCustomer360Page from './pages/estate/EstateCustomer360Page';
import EstateMergeActivityPage from './pages/estate/EstateMergeActivityPage';
import EstateUsersPage from './pages/estate/EstateUsersPage';
import FlyerApprovalsPage from './pages/estate/FlyerApprovalsPage';
import FlyerMetricsPage from './pages/estate/FlyerMetricsPage';
import SupportPage from './pages/SupportPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import BillingPage from './pages/BillingPage';
import CheckoutReturnPage from './pages/CheckoutReturnPage';
import InstagramLandingPage from './pages/InstagramLandingPage';
import SimpleOnboardingWizard from './pages/SimpleOnboardingWizard';
import PaymentSuccessPage from './pages/PaymentSuccessPage';

// Register Syncfusion license from environment variable
const syncfusionKey = import.meta.env.VITE_SYNCFUSION_KEY;
if (syncfusionKey) {
  registerLicense(syncfusionKey);
}
else {
  console.error('Syncfusion license key is not set');
  console.error('Please set the VITE_SYNCFUSION_KEY environment variable');
  console.error('You can get a free trial license from https://www.syncfusion.com/account/manage-subscriptions');
  console.error('Once you have a license, set the VITE_SYNCFUSION_KEY environment variable in your .env file');
  console.error('For example: VITE_SYNCFUSION_KEY=YOUR_LICENSE_KEY');
  console.error('You can also get a free trial license from https://www.syncfusion.com/account/manage-subscriptions');
  console.error('Once you have a license, set the VITE_SYNCFUSION_KEY environment variable in your .env file');
  console.error('For example: VITE_SYNCFUSION_KEY=YOUR_LICENSE_KEY');
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
        <Routes>
          {/* Public routes - no NavBar */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/invite/accept" element={<InviteAcceptPage />} />
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
          <Route path="/support" element={<SupportPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
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
                    <Route index element={<DashboardPage />} />
                    <Route path="active-dashboard" element={<RestaurantDashboard />} />
                    <Route path="orders" element={<OrdersPage />} />
                    <Route path="reservations" element={<ReservationsPage />} />
                    <Route path="calls" element={<CallsPage />} />
                    <Route path="customers" element={<CustomersPage />} />
                    <Route path="menu" element={<MenuPage />} />
                    <Route path="sms" element={<RestaurantSmsPage />} />
                    <Route path="command-center" element={<RestaurantCommandCenterPage />} />
                    <Route path="notifications" element={<RestaurantNotificationsPage />} />
                    <Route path="intelligence" element={<RestaurantIntelligencePage />} />
                    <Route path="customer-360" element={<RestaurantCustomer360Page />} />
                    <Route path="customer-360/:customerId" element={<RestaurantCustomer360Page />} />
                    <Route path="merge-activity" element={<RestaurantMergeActivityPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="billing" element={<BillingPage />} />
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
                    <Route index element={<VoiceDashboardPage />} />
                    <Route path="calls" element={<VoiceCallsPage />} />
                    <Route path="routing" element={<CallRoutingPage />} />
                    <Route path="voicemail" element={<VoicemailPage />} />
                    <Route path="sms" element={<VoiceSmsPage />} />
                    <Route path="command-center" element={<VoiceCommandCenterPage />} />
                    <Route path="notifications" element={<VoiceNotificationsPage />} />
                    <Route path="intelligence" element={<VoiceIntelligencePage />} />
                    <Route path="work-items" element={<VoiceWorkItemsPage />} />
                    <Route path="customer-360" element={<VoiceCustomer360Page />} />
                    <Route path="customer-360/:customerId" element={<VoiceCustomer360Page />} />
                    <Route path="merge-activity" element={<VoiceMergeActivityPage />} />
                    <Route path="settings" element={<VoiceSettingsPage />} />
                    <Route path="users" element={<VoiceUsersPage />} />
                    <Route path="billing" element={<BillingPage />} />
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
                    <Route index element={<EstateDashboardPage />} />
                    <Route path="dashboard" element={<EstateDashboardPage />} />
                    <Route path="listings" element={<EstateListingsPage />} />
                    <Route path="listings/:id" element={<ListingDetailPage />} />
                    <Route path="leads" element={<EstateLeadsPage />} />
                    <Route path="showings" element={<EstateShowingsPage />} />
                    <Route path="calls" element={<EstateCallsPage />} />
                    <Route path="flyers/approvals" element={<FlyerApprovalsPage />} />
                    <Route path="flyers/metrics" element={<FlyerMetricsPage />} />
                    <Route path="sms" element={<EstateSmsPage />} />
                    <Route path="command-center" element={<EstateCommandCenterPage />} />
                    <Route path="notifications" element={<EstateNotificationsPage />} />
                    <Route path="intelligence" element={<EstateIntelligencePage />} />
                    <Route path="customer-360" element={<EstateCustomer360Page />} />
                    <Route path="customer-360/:customerId" element={<EstateCustomer360Page />} />
                    <Route path="merge-activity" element={<EstateMergeActivityPage />} />
                    <Route path="settings" element={<EstateSettingsPage />} />
                    <Route path="users" element={<EstateUsersPage />} />
                    <Route path="billing" element={<BillingPage />} />
                    <Route path="*" element={<Navigate to="/estate" replace />} />
                  </Route>

                  {/* Super-admin tenant selector (standalone page) */}
                  <Route
                    path="/merxus/select-tenant"
                    element={
                      <ProtectedRoute requireAuth requireMerxus>
                        <TenantSelectorPage />
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
                    <Route index element={<MerxusDashboardPage />} />
                    <Route path="tenants" element={<TenantsManagementPage />} />
                    <Route path="voice-admin" element={<VoiceAdminPage />} />
                    <Route path="voices" element={<VoicesPage />} />
                    <Route path="restaurants" element={<RestaurantsPage />} />
                    <Route path="restaurants/new" element={<CreateRestaurantPage />} />
                    <Route path="real-estate" element={<RealEstateCompaniesPage />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="settings" element={<SystemSettingsPage />} />
                    <Route path="users" element={<SuperAdminUsersPage />} />
                    <Route path="setup-wizard" element={<SetupWizardPage />} />
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
                          Your AI Phone Assistant
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

