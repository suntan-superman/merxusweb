import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import AutoRedirect from './components/AutoRedirect';
import DashboardLayout from './components/layout/DashboardLayout';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import Features from './pages/Features';
import Pricing from './pages/Pricing';
import Onboarding from './pages/Onboarding';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/restaurant/DashboardPage';
import OrdersPage from './pages/restaurant/OrdersPage';
import CallsPage from './pages/restaurant/CallsPage';
import CustomersPage from './pages/restaurant/CustomersPage';
import MenuPage from './pages/restaurant/MenuPage';
import SettingsPage from './pages/restaurant/SettingsPage';
import UsersPage from './pages/restaurant/UsersPage';
import MerxusLayout from './components/layout/MerxusLayout';
import MerxusDashboardPage from './pages/merxus/MerxusDashboardPage';
import RestaurantsPage from './pages/merxus/RestaurantsPage';
import CreateRestaurantPage from './pages/merxus/CreateRestaurantPage';
import AnalyticsPage from './pages/merxus/AnalyticsPage';
import SystemSettingsPage from './pages/merxus/SystemSettingsPage';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
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
                    <Route path="orders" element={<OrdersPage />} />
                    <Route path="calls" element={<CallsPage />} />
                    <Route path="customers" element={<CustomersPage />} />
                    <Route path="menu" element={<MenuPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="*" element={<Navigate to="/restaurant" replace />} />
                  </Route>

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
                    <Route path="restaurants" element={<RestaurantsPage />} />
                    <Route path="restaurants/new" element={<CreateRestaurantPage />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="settings" element={<SystemSettingsPage />} />
                    <Route path="*" element={<Navigate to="/merxus" replace />} />
                  </Route>
                  
                  {/* Redirect authenticated users */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <footer className="bg-gray-900 text-white mt-20">
                  <div className="container mx-auto px-4 py-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div>
                        <h3 className="text-xl font-bold mb-4 text-primary-400">Merxus</h3>
                        <p className="text-gray-400">
                          24/7 AI Virtual Host for Restaurants
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-4">Quick Links</h4>
                        <ul className="space-y-2 text-gray-400">
                          <li><a href="/features" className="hover:text-primary-400 transition-colors">Features</a></li>
                          <li><a href="/pricing" className="hover:text-primary-400 transition-colors">Pricing</a></li>
                          <li><a href="/onboarding" className="hover:text-primary-400 transition-colors">Get Started</a></li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-4">Contact</h4>
                        <p className="text-gray-400">
                          Schedule a 15-minute demo to get started.
                        </p>
                      </div>
                    </div>
                    <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                      <p>&copy; 2024 Merxus. All rights reserved.</p>
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

