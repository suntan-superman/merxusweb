import { useState } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function EstateUsersPage() {
  const [loading] = useState(false);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Team & Access</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage team members and access permissions
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-500 text-center py-12">
          Team management coming soon...
        </p>
      </div>
    </div>
  );
}

