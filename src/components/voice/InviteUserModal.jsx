// Invite User Modal for Voice/Office Users

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import FormModal from '../common/FormModal';

export default function InviteUserModal({ isOpen, onClose, onInvite }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    role: 'user',
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!formData.email) {
      toast.error('Email is required');
      return;
    }

    try {
      setLoading(true);
      await onInvite(formData);
      toast.success('Invitation sent successfully!');
      onClose();
      // Reset form
      setFormData({ email: '', displayName: '', role: 'user' });
    } catch (error) {
      console.error('Failed to invite user:', error);
      toast.error(error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setFormData({ email: '', displayName: '', role: 'user' });
    onClose();
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClose}
        className="btn-secondary"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="invite-user-form"
        disabled={loading}
        className="btn-primary"
      >
        {loading ? 'Sending...' : 'Send Invitation'}
      </button>
    </div>
  );

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite Team Member"
      width="500px"
      headerActions={headerActions}
    >
      <form id="invite-user-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="input-field"
            placeholder="user@example.com"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            They'll receive an email invitation to join your office
          </p>
        </div>

        {/* Display Name */}
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
            Display Name (Optional)
          </label>
          <input
            type="text"
            id="displayName"
            name="displayName"
            value={formData.displayName}
            onChange={handleChange}
            className="input-field"
            placeholder="John Doe"
          />
        </div>

        {/* Role */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            Role *
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="input-field"
            required
          >
            <option value="admin">Admin</option>
            <option value="user">User</option>
            <option value="viewer">Viewer</option>
          </select>
          <div className="mt-2 space-y-1 text-xs text-gray-600">
            <p><strong>Admin:</strong> Full access to manage settings, users, and calls</p>
            <p><strong>User:</strong> Can view and respond to calls, manage voicemail</p>
            <p><strong>Viewer:</strong> Read-only access to call logs and analytics</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 text-lg">ℹ️</span>
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">How it works:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>User receives an email with a secure invitation link</li>
                <li>They click the link and set their password</li>
                <li>They can immediately access your office portal</li>
              </ol>
            </div>
          </div>
        </div>
      </form>
    </FormModal>
  );
}
