import { useAuth } from '../../context/AuthContext';

export default function DashboardPage() {
  const { user, userClaims } = useAuth();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back{user?.displayName ? `, ${user.displayName}` : ''}!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Orders</h3>
          <p className="text-3xl font-bold text-primary-600">0</p>
          <p className="text-sm text-gray-600 mt-2">This month</p>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Calls</h3>
          <p className="text-3xl font-bold text-primary-600">0</p>
          <p className="text-sm text-gray-600 mt-2">Today</p>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Revenue</h3>
          <p className="text-3xl font-bold text-primary-600">$0.00</p>
          <p className="text-sm text-gray-600 mt-2">This month</p>
        </div>
      </div>

      <div className="mt-6 card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <a href="/restaurant/orders" className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors">
            <h3 className="font-semibold text-gray-900 mb-1">📦 View Orders</h3>
            <p className="text-sm text-gray-600">Manage incoming orders</p>
          </a>
          <a href="/restaurant/menu" className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors">
            <h3 className="font-semibold text-gray-900 mb-1">🍽️ Menu Management</h3>
            <p className="text-sm text-gray-600">Add, edit, and manage menu items</p>
          </a>
          <a href="/restaurant/settings" className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors">
            <h3 className="font-semibold text-gray-900 mb-1">⚙️ Settings</h3>
            <p className="text-sm text-gray-600">Configure restaurant, hours, AI settings</p>
          </a>
          <a href="/restaurant/customers" className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors">
            <h3 className="font-semibold text-gray-900 mb-1">👥 View Customers</h3>
            <p className="text-sm text-gray-600">Manage customer relationships</p>
          </a>
          <a href="/restaurant/calls" className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors">
            <h3 className="font-semibold text-gray-900 mb-1">📞 Calls & Messages</h3>
            <p className="text-sm text-gray-600">View call history and transcripts</p>
          </a>
          {userClaims?.role === 'owner' && (
            <a href="/restaurant/users" className="btn-secondary text-left p-4 hover:bg-primary-50 transition-colors">
              <h3 className="font-semibold text-gray-900 mb-1">👤 Team & Access</h3>
              <p className="text-sm text-gray-600">Manage team members and permissions</p>
            </a>
          )}
        </div>
      </div>

      {userClaims && (
        <div className="mt-6 card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Info</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Role: <span className="font-medium text-gray-900">{userClaims.role}</span></p>
            <p>Restaurant ID: <span className="font-medium text-gray-900">{userClaims.restaurantId || 'N/A'}</span></p>
            <p>Email: <span className="font-medium text-gray-900">{user?.email}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}

