import { useEffect, useState } from 'react';
import { fetchUsers, inviteUser, updateUser, disableUser } from '../../api/adminUsers';
import UsersTable from '../../components/admin/UsersTable';
import InviteUserForm from '../../components/admin/InviteUserForm';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import ConfirmationModal from '../../components/common/ConfirmationModal';

function UsersPageContent() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [userToDisable, setUserToDisable] = useState(null);

  async function load() {
    try {
      setError(null);
      setLoading(true);
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleInvite(form) {
    try {
      setInviting(true);
      setError(null);
      await inviteUser(form);
      await load();
    } catch (err) {
      console.error(err);
      setError('Failed to invite user.');
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(uid, role) {
    try {
      await updateUser(uid, { role });
      await load();
    } catch (err) {
      console.error(err);
      setError('Failed to update user role.');
    }
  }

  function handleDisable(uid) {
    const user = users.find(u => u.uid === uid);
    setUserToDisable({ uid, name: user?.displayName || user?.email || 'this user' });
    setShowDisableModal(true);
  }

  async function confirmDisable() {
    if (!userToDisable) return;
    try {
      await disableUser(userToDisable.uid);
      await load();
      setShowDisableModal(false);
      setUserToDisable(null);
    } catch (err) {
      console.error(err);
      setError('Failed to disable user.');
      setShowDisableModal(false);
      setUserToDisable(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team & Access</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage team members and their access levels
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <InviteUserForm onInvite={handleInvite} submitting={inviting} />

      {loading ? (
        <div className="text-sm text-gray-500">Loading users…</div>
      ) : (
        <UsersTable
          users={users}
          onChangeRole={handleRoleChange}
          onDisable={handleDisable}
        />
      )}

      <ConfirmationModal
        isOpen={showDisableModal}
        onClose={() => {
          setShowDisableModal(false);
          setUserToDisable(null);
        }}
        onConfirm={confirmDisable}
        title="Disable User"
        message={userToDisable ? `Are you sure you want to disable ${userToDisable.name}? They will no longer be able to access the system.` : ''}
        confirmText="Disable"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute requireAuth requireOwner>
      <UsersPageContent />
    </ProtectedRoute>
  );
}

