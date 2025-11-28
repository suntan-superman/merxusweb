import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';

export default function Topbar({ onMenuClick }) {
  const { userClaims } = useAuth();
  const location = useLocation();

  // Determine title based on current route
  const getTitle = () => {
    if (location.pathname.startsWith('/merxus')) {
      return 'Merxus Admin Dashboard';
    } else if (userClaims?.restaurantId) {
      return 'Restaurant Portal';
    }
    return 'Merxus Dashboard';
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Mobile menu button */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">
              {getTitle()}
            </h1>
          </div>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Notifications placeholder */}
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

