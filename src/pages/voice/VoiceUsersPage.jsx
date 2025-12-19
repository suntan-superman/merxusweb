import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import VoiceUsersTable from '../../components/voice/VoiceUsersTable';
import InviteUserModal from '../../components/voice/InviteUserModal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { 
  useVoiceUsers, 
  useInviteVoiceUser, 
  useUpdateVoiceUser, 
  useDeleteVoiceUser 
} from '../../hooks/useVoiceQueries';

export default function VoiceUsersPage() {
  const { officeId } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // React Query hooks
  const { data: users = [], isLoading, error } = useVoiceUsers();
  const inviteMutation = useInviteVoiceUser();
  const updateMutation = useUpdateVoiceUser();
  const deleteMutation = useDeleteVoiceUser();

  async function handleInvite(userData) {
    await inviteMutation.mutateAsync(userData);
    setShowInviteModal(false);
  }

  async function handleChangeRole(uid, newRole) {
    await updateMutation.mutateAsync({ uid, updates: { role: newRole } });
  }

  function handleDisable(uid) {
    setSelectedUser(users.find((u) => u.uid === uid || u.id === uid));
    setShowDisableModal(true);
  }

  async function confirmDisable() {
    await deleteMutation.mutateAsync(selectedUser.uid || selectedUser.id);
    setShowDisableModal(false);
    setSelectedUser(null);
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Team Members</h3>
        <p className="text-gray-600 mb-4">Please try refreshing the page.</p>
      </div>
    );
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
        <button 
          onClick={() => setShowInviteModal(true)} 
          className="btn-primary"
          disabled={inviteMutation.isPending}
        >
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
            isUpdating={updateMutation.isPending}
          />
        )}
      </div>

      {/* Invite Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
        isLoading={inviteMutation.isPending}
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
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

