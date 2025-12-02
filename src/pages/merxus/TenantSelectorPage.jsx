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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Restaurant Portal Card */}
          <div
            onClick={() => navigate('/merxus')}
            className="bg-white rounded-lg shadow-lg p-8 cursor-pointer hover:shadow-xl transition-shadow border-2 border-transparent hover:border-primary-500"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🏪</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Restaurant Portal</h2>
              <p className="text-gray-600 mb-6">
                Manage restaurants, view analytics, and oversee the restaurant service platform
              </p>
              <button className="btn-primary w-full">
                Go to Restaurant Portal
              </button>
            </div>
          </div>

          {/* Voice Admin Portal Card */}
          <div
            onClick={() => navigate('/merxus/voice-admin')}
            className="bg-white rounded-lg shadow-lg p-8 cursor-pointer hover:shadow-xl transition-shadow border-2 border-transparent hover:border-primary-500"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">📞</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Voice Admin Portal</h2>
              <p className="text-gray-600 mb-6">
                Manage voice service companies, view voice analytics, and oversee the voice service platform
              </p>
              <button className="btn-primary w-full">
                Go to Voice Admin Portal
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

