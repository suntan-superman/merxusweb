import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

export default function MerxusSidebar() {
  const { user, userClaims } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 dark:bg-slate-900 dark:border-slate-700 flex flex-col h-screen">
      {/* Logo */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
        <NavLink to="/merxus" className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-primary-600">Merxus AI</span>
          <span className="text-xs text-gray-500 dark:text-slate-300 bg-primary-100 dark:bg-slate-800 px-2 py-1 rounded">Admin</span>
        </NavLink>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavItem to="/merxus" label="Dashboard" icon="📊" />
        <NavItem to="/merxus/tenants" label="All Tenants" icon="👥" />
        <NavItem to="/merxus/restaurants" label="Restaurants" icon="🏪" />
        <NavItem to="/merxus/voices" label="Voice Services" icon="📞" />
        <NavItem to="/merxus/real-estate" label="Real Estate" icon="🏠" />
        <NavItem to="/merxus/analytics" label="Analytics" icon="📈" />
        <NavItem to="/merxus/ops-audit" label="Ops Audit" icon="🛠️" />
        <NavItem to="/merxus/production-readiness" label="Readiness" icon="🧪" />
        {userClaims?.role === 'super_admin' && (
          <NavItem to="/merxus/users" label="Teams & Access" icon="🔐" />
        )}
        {(userClaims?.role === 'super_admin' || userClaims?.role === 'merxus_admin') && (
          <NavItem to="/merxus/setup-wizard" label="Setup Wizard" icon="🚀" />
        )}
        {userClaims?.role === 'merxus_admin' && (
          <NavItem to="/merxus/settings" label="System Settings" icon="⚙️" />
        )}
      </nav>

      {/* User Info - Sticky at Bottom */}
      <div className="px-3 py-4 border-t border-gray-200 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-900">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-600 font-semibold text-sm">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
              {user?.displayName || user?.email || 'Admin'}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">
              {userClaims?.role || 'Admin'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-md transition-colors"
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
            ? 'bg-green-50 text-green-700 border-l-4 border-green-600 dark:bg-emerald-900/30 dark:text-emerald-200'
            : 'text-gray-700 hover:bg-green-50 hover:text-green-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-200'
        }`
      }
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

