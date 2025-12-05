import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getVoiceUsers, inviteVoiceUser, updateVoiceUser, deleteVoiceUser } from '../../api/voiceUsers';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import VoiceUsersTable from '../../components/voice/VoiceUsersTable';
import InviteUserModal from '../../components/voice/InviteUserModal';
import ConfirmationModal from '../../components/common/ConfirmationModal';

export default function VoiceUsersPage() {
  const { officeId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await getVoiceUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(userData) {
    await inviteVoiceUser(userData);
    await loadUsers();
  }

  async function handleChangeRole(uid, newRole) {
    try {
      await updateVoiceUser(uid, { role: newRole });
      toast.success('Role updated successfully');
      await loadUsers();
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update role');
    }
  }

  async function handleDisable(uid) {
    setSelectedUser(users.find((u) => u.uid === uid || u.id === uid));
    setShowDisableModal(true);
  }

  async function confirmDisable() {
    try {
      await deleteVoiceUser(selectedUser.uid || selectedUser.id);
      toast.success('User disabled successfully');
      await loadUsers();
    } catch (error) {
      console.error('Failed to disable user:', error);
      toast.error('Failed to disable user');
    } finally {
      setShowDisableModal(false);
      setSelectedUser(null);
    }
  }

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
        <button onClick={() => setShowInviteModal(true)} className="btn-primary">
          + Invite User
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">👤</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Team Members Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Invite team members to help manage your office calls and settings
            </p>
            <button onClick={() => setShowInviteModal(true)} className="btn-primary">
              Invite Your First Team Member
            </button>
          </div>
        ) : (
          <VoiceUsersTable
            users={users}
            onChangeRole={handleChangeRole}
            onDisable={handleDisable}
          />
        )}
      </div>

      {/* Invite Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
      />

      {/* Disable Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDisableModal}
        onClose={() => {
          setShowDisableModal(false);
          setSelectedUser(null);
        }}
        onConfirm={confirmDisable}
        title="Disable User?"
        message={`Are you sure you want to disable ${selectedUser?.displayName || selectedUser?.email}? They will no longer be able to access the office portal.`}
        confirmText="Disable User"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
}

