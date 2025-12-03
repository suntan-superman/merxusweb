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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome, Super Admin</h1>
          <p className="text-lg text-gray-600">Select which portal you'd like to access</p>
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
            className="bg-white rounded-lg shadow-lg p-8 cursor-pointer hover:shadow-xl transition-shadow border-2 border-transparent hover:border-blue-500"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🍽️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Restaurant Management</h2>
              <p className="text-gray-600 mb-6">
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
            className="bg-white rounded-lg shadow-lg p-8 cursor-pointer hover:shadow-xl transition-shadow border-2 border-transparent hover:border-purple-500"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">📞</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Voice Management</h2>
              <p className="text-gray-600 mb-6">
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
            className="bg-white rounded-lg shadow-lg p-8 cursor-pointer hover:shadow-xl transition-shadow border-2 border-transparent hover:border-green-500"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🏡</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Real Estate Management</h2>
              <p className="text-gray-600 mb-6">
                Manage real estate agents and property listings
              </p>
              <button className="btn-primary w-full">
                Manage Real Estate
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            You can switch between portals at any time from the navigation menu
          </p>
        </div>
      </div>
    </div>
  );
}

