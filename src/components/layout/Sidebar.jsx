import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { fetchSettings } from '../../api/settings';

export default function Sidebar() {
  const { user, userClaims } = useAuth();
  const navigate = useNavigate();
  const [restaurantName, setRestaurantName] = useState(null);

  const restaurantId = userClaims?.restaurantId;

  // Fetch restaurant name when restaurantId is available
  useEffect(() => {
    async function fetchRestaurantName() {
      if (!restaurantId) {
        return;
      }
      
      try {
        // Use the API to fetch settings (goes through authenticated backend)
        const settings = await fetchSettings();
        setRestaurantName(settings?.name || null);
      } catch (error) {
        console.error('[Sidebar] Error fetching restaurant name:', error);
      }
    }

    fetchRestaurantName();
  }, [restaurantId]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isOwner = userClaims?.role === 'owner';
  const isManager = userClaims?.role === 'manager';

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
      {/* Restaurant Name */}
      <div className="px-5 py-5 border-b border-gray-200">
        <NavLink to="/restaurant" className="block">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍽️</span>
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {restaurantName || 'Restaurant'}
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-9">Powered by Merxus</p>
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <NavItem to="/restaurant" label="Dashboard" icon="📊" />
        <NavItem to="/restaurant/orders" label="Orders" icon="📦" />
        <NavItem to="/restaurant/reservations" label="Reservations" icon="📅" />
        <NavItem to="/restaurant/calls" label="Calls & Messages" icon="📞" />
        <NavItem to="/restaurant/customers" label="Customers" icon="👥" />
        <NavItem to="/restaurant/menu" label="Menu" icon="🍽️" />
        <NavItem to="/restaurant/settings" label="Settings" icon="⚙️" />
        <NavItem to="/restaurant/billing" label="Billing" icon="💳" />
        {isOwner && (
          <NavItem to="/restaurant/users" label="Team & Access" icon="👤" />
        )}
      </nav>

      {/* User Info */}
      <div className="px-3 py-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-600 font-semibold text-sm">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.displayName || user?.email || 'User'}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {userClaims?.role || 'User'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}

function NavItem({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
            : 'text-gray-700 hover:bg-gray-100'
        }`
      }
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

