import { Navigate } from 'react-router-dom';

const Dashboard = ({ user }) => {
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="w-full py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back! Manage your AI receptionist settings here.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Total Calls
            </h3>
            <p className="text-3xl font-bold text-primary-600">0</p>
            <p className="text-sm text-gray-600 mt-2">This month</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Reservations
            </h3>
            <p className="text-3xl font-bold text-primary-600">0</p>
            <p className="text-sm text-gray-600 mt-2">This month</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Orders
            </h3>
            <p className="text-3xl font-bold text-primary-600">0</p>
            <p className="text-sm text-gray-600 mt-2">This month</p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="btn-secondary text-left p-4">
              <h3 className="font-semibold text-gray-900 mb-1">
                Update Menu
              </h3>
              <p className="text-sm text-gray-600">
                Upload or modify your restaurant menu
              </p>
            </button>
            <button className="btn-secondary text-left p-4">
              <h3 className="font-semibold text-gray-900 mb-1">
                View Reports
              </h3>
              <p className="text-sm text-gray-600">
                See detailed call and order reports
              </p>
            </button>
            <button className="btn-secondary text-left p-4">
              <h3 className="font-semibold text-gray-900 mb-1">
                Settings
              </h3>
              <p className="text-sm text-gray-600">
                Configure greeting style and call handling
              </p>
            </button>
            <button className="btn-secondary text-left p-4">
              <h3 className="font-semibold text-gray-900 mb-1">
                Test Call
              </h3>
              <p className="text-sm text-gray-600">
                Test your AI receptionist with a sample call
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

