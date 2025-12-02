import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import UsersTable from '../../components/admin/UsersTable';

export default function VoiceUsersPage() {
  const { officeId } = useAuth();
  const [loading, setLoading] = useState(false);

  // TODO: Implement voice users API
  const [users, setUsers] = useState([]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team & Access</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage team members and their access to your office portal
          </p>
        </div>
        <button className="btn-primary">
          + Invite User
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">👤</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Team Members
            </h3>
            <p className="text-gray-600 mb-6">
              Invite team members to help manage your office calls and settings
            </p>
            <button className="btn-primary">
              Invite Your First Team Member
            </button>
          </div>
        ) : (
          <UsersTable users={users} />
        )}
      </div>
    </div>
  );
}

