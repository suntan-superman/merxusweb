import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function TenantSelectorPage() {
  const navigate = useNavigate();
  const { userClaims } = useAuth();

  // Only super-admins should access this page
  if (userClaims?.role !== 'super_admin') {
    navigate('/merxus', { replace: true });
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-white px-4 py-12 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900 dark:text-slate-100">Welcome, Super Admin</h1>
          <p className="text-lg text-gray-600 dark:text-slate-300">Select which portal you'd like to access</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Merxus Admin Dashboard */}
          <div
            onClick={() => navigate('/merxus')}
            className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg shadow-lg p-8 cursor-pointer hover:shadow-xl transition-all transform hover:scale-105 border-2 border-primary-600"
          >
            <div className="text-center text-white">
              <div className="text-6xl mb-4">⚙️</div>
              <h2 className="text-2xl font-bold mb-2">Merxus Admin</h2>
              <p className="text-primary-100 mb-6">
                User Management, System Analytics, and Global Settings
              </p>
              <button className="bg-white text-primary-600 px-6 py-2 rounded-lg font-semibold hover:bg-primary-50 transition-colors w-full">
                Go to Admin Dashboard
              </button>
            </div>
          </div>

          {/* Restaurant Management */}
          <div
            onClick={() => navigate('/merxus/restaurants')}
            className="cursor-pointer rounded-lg border-2 border-transparent bg-white p-8 shadow-lg transition-shadow hover:border-blue-500 hover:shadow-xl dark:bg-slate-900 dark:shadow-none dark:hover:border-blue-400"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🍽️</div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-slate-100">Restaurant Management</h2>
              <p className="mb-6 text-gray-600 dark:text-slate-300">
                Manage restaurants and oversee the restaurant service platform
              </p>
              <button className="btn-primary w-full">
                Manage Restaurants
              </button>
            </div>
          </div>

          {/* Voice Management */}
          <div
            onClick={() => navigate('/merxus/voice-admin')}
            className="cursor-pointer rounded-lg border-2 border-transparent bg-white p-8 shadow-lg transition-shadow hover:border-purple-500 hover:shadow-xl dark:bg-slate-900 dark:shadow-none dark:hover:border-purple-400"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">📞</div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-slate-100">Voice Management</h2>
              <p className="mb-6 text-gray-600 dark:text-slate-300">
                Manage voice service companies and analytics
              </p>
              <button className="btn-primary w-full">
                Manage Voice Services
              </button>
            </div>
          </div>

          {/* Real Estate Management */}
          <div
            onClick={() => navigate('/merxus/real-estate')}
            className="cursor-pointer rounded-lg border-2 border-transparent bg-white p-8 shadow-lg transition-shadow hover:border-green-500 hover:shadow-xl dark:bg-slate-900 dark:shadow-none dark:hover:border-green-400"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🏡</div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-slate-100">Real Estate Management</h2>
              <p className="mb-6 text-gray-600 dark:text-slate-300">
                Manage real estate agents and property listings
              </p>
              <button className="btn-primary w-full">
                Manage Real Estate
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            You can switch between portals at any time from the navigation menu
          </p>
        </div>
      </div>
    </div>
  );
}

