import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmationModal from '../common/ConfirmationModal';
import InvitationLinkModal from '../common/InvitationLinkModal';
import SelectField from '../common/SelectField';
import {
  disableTeamUser,
  enableTeamUser,
  inviteTeamUser,
  resendTeamUserInvite,
  resendTeamUserPhoneVerification,
  updateTeamUser,
} from '../../api/teamUsers';
import { TEAM_NOTIFICATION_GROUPS, getTeamUserCopy } from '../../constants/teamUsers';
import { useAuth } from '../../context/AuthContext';
import useTeamUsersQuery from '../../hooks/useTeamUsersQuery';

function formatTimestamp(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

function normalizePhoneInput(value) {
  return String(value || '').replace(/\D/g, '');
}

function toneForLifecycle(user) {
  if (user.disabled) return 'bg-red-100 text-red-700';
  if (user.notificationEligible) return 'bg-emerald-100 text-emerald-700';
  if (user.needsInviteAcceptance) return 'bg-blue-100 text-blue-700';
  if (!user.phone) return 'bg-amber-100 text-amber-700';
  if (user.phoneVerified) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

function lifecycleLabel(user) {
  if (user.disabled) return 'Disabled';
  if (user.notificationEligible) return 'Active';
  if (user.needsInviteAcceptance) return 'Invite not accepted';
  if (!user.phone) return 'Needs phone number';
  if (user.phoneVerified) return 'Pending activation';
  return 'Needs phone verification';
}

function lifecycleDetail(user) {
  if (user.disabled) return 'Portal access and alerts are turned off.';
  if (user.notificationEligible) return 'Ready for portal access and live alerts.';
  if (user.needsInviteAcceptance) return 'Waiting for the user to open the invite and finish account setup.';
  if (!user.phone) return 'Add an SMS number before alerts can be enabled.';
  if (user.phoneVerified) return 'Finish the remaining setup steps to enable alerts.';
  return 'Send or resend a verification code to continue activation.';
}

function formatRoutingGroupLabels(groupKeys, groupOptions) {
  if (!Array.isArray(groupKeys) || groupKeys.length === 0) return '—';
  const labelMap = new Map(groupOptions.map((group) => [group.key, group.label]));
  return groupKeys.map((groupKey) => labelMap.get(groupKey) || groupKey).join(', ');
}

function buildEditForm(user) {
  return {
    displayName: user?.displayName || '',
    phone: user?.phone || '',
    notificationGroupKeys: Array.isArray(user?.notificationGroupKeys) ? user.notificationGroupKeys : [],
  };
}

function formatInviteConflict(err) {
  const response = err?.response?.data || {};
  const code = response?.code;
  const details = response?.details || {};
  const companyName = details?.companyName;

  if (code === 'user_belongs_to_other_tenant') {
    return companyName
      ? `This email is already associated with ${companyName}. The invite was not sent.`
      : 'This email is already associated with another company. The invite was not sent.';
  }

  if (code === 'pending_invite_exists') {
    return 'This email already has a pending invite for this company. Use Resend invite instead.';
  }

  if (code === 'user_already_in_tenant') {
    return 'This email already belongs to a team member in this company.';
  }

  return response?.error || err?.message || 'Failed to invite user.';
}

function formatRoleLabel(role) {
  const normalized = String(role || '').trim().toLowerCase();
  if (!normalized) return 'Unknown role';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).replace(/_/g, ' ');
}

export default function TeamUsersWorkspace({ tenantType, footer = null }) {
  const navigate = useNavigate();
  const { user: authUser, userClaims } = useAuth();
  const copy = getTeamUserCopy(tenantType);
  const groupOptions = TEAM_NOTIFICATION_GROUPS[tenantType] || [];
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyAction, setBusyAction] = useState({ type: '', uid: null });
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [userToDisable, setUserToDisable] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(buildEditForm(null));
  const [showEditModal, setShowEditModal] = useState(false);
  const [inviteLinkState, setInviteLinkState] = useState({
    isOpen: false,
    invitationLink: '',
    email: '',
  });
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    phone: '',
    role: 'manager',
    notificationGroupKeys: [],
  });
  const {
    data: users = [],
    isLoading: loading,
    error: loadError,
    refetch: refetchUsers,
  } = useTeamUsersQuery({ tenantType, enabled: true });

  const summary = useMemo(() => ({
    total: users.length,
    verified: users.filter((currentUser) => currentUser.phoneVerified).length,
    active: users.filter((currentUser) => currentUser.notificationEligible).length,
    pending: users.filter((currentUser) => !currentUser.notificationEligible && !currentUser.disabled).length,
  }), [users]);
  const displayError = error || loadError?.response?.data?.error || loadError?.message || '';

  function isRowBusy(uid) {
    return busyAction.uid === uid;
  }

  function resetBannerState() {
    setError('');
    setSuccess('');
  }

  function showInvitationLink(result, email) {
    if (!result?.invitationLink) return;
    setInviteLinkState({
      isOpen: true,
      invitationLink: result.invitationLink,
      email,
    });
  }

  async function handleInvite(event) {
    event.preventDefault();
    try {
      setSubmitting(true);
      resetBannerState();
      const result = await inviteTeamUser(tenantType, form);
      const invitedEmail = form.email;
      setForm({
        displayName: '',
        email: '',
        phone: '',
        role: 'manager',
        notificationGroupKeys: [],
      });
      setSuccess(
        result?.emailSent === false
          ? `Invite created for ${invitedEmail}, but the email was not delivered. Use the setup link below.`
          : `Invitation sent to ${invitedEmail}.`
      );
      showInvitationLink(result, invitedEmail);
      await refetchUsers();
    } catch (err) {
      console.error(err);
      setError(formatInviteConflict(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(uid, role) {
    try {
      resetBannerState();
      setBusyAction({ type: 'role', uid });
      await updateTeamUser(tenantType, uid, { role });
      setSuccess('Access role updated.');
      await refetchUsers();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err?.message || 'Failed to update role.');
    } finally {
      setBusyAction({ type: '', uid: null });
    }
  }

  function toggleNotificationGroup(groupKey) {
    setForm((current) => ({
      ...current,
      notificationGroupKeys: current.notificationGroupKeys.includes(groupKey)
        ? current.notificationGroupKeys.filter((value) => value !== groupKey)
        : [...current.notificationGroupKeys, groupKey],
    }));
  }

  function toggleEditNotificationGroup(groupKey) {
    setEditForm((current) => ({
      ...current,
      notificationGroupKeys: current.notificationGroupKeys.includes(groupKey)
        ? current.notificationGroupKeys.filter((value) => value !== groupKey)
        : [...current.notificationGroupKeys, groupKey],
    }));
  }

  function beginEdit(user) {
    resetBannerState();
    setEditingUser(user);
    setEditForm(buildEditForm(user));
    setShowEditModal(true);
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditingUser(null);
    setEditForm(buildEditForm(null));
  }

  async function handleSaveEdit() {
    if (!editingUser) return;
    const uid = editingUser.uid || editingUser.id;
    const payload = {
      displayName: editForm.displayName,
      notificationGroupKeys: editForm.notificationGroupKeys,
    };
    if (editForm.phone.trim()) {
      payload.phone = editForm.phone.trim();
    } else if (editingUser.phone) {
      payload.phone = editingUser.phone;
    }

    try {
      resetBannerState();
      setBusyAction({ type: 'edit', uid });
      await updateTeamUser(tenantType, uid, payload);
      const phoneChanged = normalizePhoneInput(editForm.phone) !== normalizePhoneInput(editingUser.phone);
      setSuccess(
        phoneChanged
          ? 'User details updated. Phone verification was reset for the new number.'
          : 'User details updated.'
      );
      closeEditModal();
      await refetchUsers();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err?.message || 'Failed to update user.');
    } finally {
      setBusyAction({ type: '', uid: null });
    }
  }

  async function handleResendInvite(user) {
    const uid = user.uid || user.id;
    try {
      resetBannerState();
      setBusyAction({ type: 'invite', uid });
      const result = await resendTeamUserInvite(tenantType, uid);
      setSuccess(
        result?.emailSent
          ? `Invitation re-sent to ${user.email}.`
          : `Invite email could not be delivered to ${user.email}. Use the regenerated setup link instead.`
      );
      showInvitationLink(result, user.email);
      await refetchUsers();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err?.message || 'Failed to resend invitation.');
    } finally {
      setBusyAction({ type: '', uid: null });
    }
  }

  async function handleSendCode(user) {
    const uid = user.uid || user.id;
    try {
      resetBannerState();
      setBusyAction({ type: 'code', uid });
      const result = await resendTeamUserPhoneVerification(tenantType, uid);
      setSuccess(`Verification code sent to ${result?.maskedPhone || user.phone || 'the saved phone number'}.`);
      await refetchUsers();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err?.message || 'Failed to send verification code.');
    } finally {
      setBusyAction({ type: '', uid: null });
    }
  }

  async function handleEnable(user) {
    const uid = user.uid || user.id;
    try {
      resetBannerState();
      setBusyAction({ type: 'enable', uid });
      await enableTeamUser(tenantType, uid);
      setSuccess(`${user.displayName || user.email} has been re-enabled.`);
      await refetchUsers();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err?.message || 'Failed to enable user.');
    } finally {
      setBusyAction({ type: '', uid: null });
    }
  }

  function handleDisable(uid) {
    const currentUser = users.find((item) => item.uid === uid || item.id === uid);
    setUserToDisable(currentUser || null);
    setShowDisableModal(true);
  }

  async function confirmDisable() {
    if (!userToDisable) return;
    const uid = userToDisable.uid || userToDisable.id;
    try {
      resetBannerState();
      setBusyAction({ type: 'disable', uid });
      await disableTeamUser(tenantType, uid);
      setSuccess(`${userToDisable.displayName || userToDisable.email} has been disabled.`);
      await refetchUsers();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err?.message || 'Failed to disable user.');
    } finally {
      setBusyAction({ type: '', uid: null });
      setShowDisableModal(false);
      setUserToDisable(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{copy.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{copy.subtitle}</p>
            <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-900">
              <span className="font-semibold">Signed in as</span>
              <span className="font-medium break-all">{authUser?.email || 'Unknown user'}</span>
              <span className="text-emerald-700/70">•</span>
              <span>{formatRoleLabel(userClaims?.role)}</span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <SummaryCard label="Team Members" value={summary.total} />
            <SummaryCard label="Phone Verified" value={summary.verified} />
            <SummaryCard label="Alert Eligible" value={summary.active} />
            <SummaryCard label="Pending" value={summary.pending} />
          </div>
        </div>
      </section>

      {displayError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {displayError}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Invite Team Member</h3>
        <p className="mt-1 text-sm text-gray-500">Phone number is required for SMS alerts and must be verified before the user becomes alert-eligible.</p>

        <form onSubmit={handleInvite} className="mt-5 space-y-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <InputField
              label="Name"
              value={form.displayName}
              onChange={(value) => setForm((current) => ({ ...current, displayName: value }))}
              placeholder="Jane Doe"
            />
            <InputField
              label="Email *"
              type="email"
              required
              value={form.email}
              onChange={(value) => setForm((current) => ({ ...current, email: value }))}
              placeholder="user@example.com"
            />
            <InputField
              label="Phone (SMS alerts) *"
              required
              value={form.phone}
              onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
              placeholder="+16615551234"
            />
            <SelectField
              label="Access Role"
              value={form.role}
              onChange={(nextValue) => setForm((current) => ({ ...current, role: nextValue }))}
              options={[
                { value: 'manager', label: 'Manager' },
                { value: 'staff', label: 'Staff' },
              ]}
              required
            />
          </div>

          <NotificationGroupSelector
            label="Notification Groups"
            groupOptions={groupOptions}
            selectedKeys={form.notificationGroupKeys}
            onToggle={toggleNotificationGroup}
          />

          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Sending Invitation…' : 'Send Invitation'}
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="text-sm text-gray-500">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
            No team members yet. Invite someone to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Access Role</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Routing Groups</th>
                  <th className="px-4 py-3">Lifecycle</th>
                  <th className="px-4 py-3">Invited</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((currentUser) => {
                  const uid = currentUser.uid || currentUser.id;
                  const isCurrentUser = Boolean(authUser?.uid && uid === authUser.uid);

                  return (
                    <tr key={uid} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-gray-900">{currentUser.displayName || currentUser.email}</div>
                        <div className="text-xs text-gray-500">{currentUser.email}</div>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-slate-700">
                        <div>{currentUser.phone || '—'}</div>
                        {currentUser.phoneVerificationSentAt ? (
                          <div className="mt-1 text-[11px] text-slate-500">Last code {formatTimestamp(currentUser.phoneVerificationSentAt)}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {currentUser.role === 'owner' ? (
                          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                            Owner
                          </span>
                        ) : (
                          <SelectField
                            value={currentUser.role}
                            disabled={isRowBusy(uid)}
                            onChange={(nextValue) => handleRoleChange(uid, nextValue)}
                            options={[
                              { value: 'manager', label: 'Manager' },
                              { value: 'staff', label: 'Staff' },
                            ]}
                            buttonClassName="rounded-md px-2 py-1 text-xs"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-1">
                          <StatusPill tone={currentUser.needsInviteAcceptance ? 'blue' : 'emerald'}>
                            {currentUser.needsInviteAcceptance ? 'Invite pending' : 'Portal access ready'}
                          </StatusPill>
                          <StatusPill tone={currentUser.phoneVerified ? 'emerald' : (currentUser.phone ? 'amber' : 'slate')}>
                            {currentUser.phoneVerified ? 'Phone verified' : (currentUser.phone ? 'Phone pending' : 'Phone missing')}
                          </StatusPill>
                          {currentUser.inviteSentAt ? (
                            <div className="mt-1 text-[11px] text-slate-500">Last invite {formatTimestamp(currentUser.inviteSentAt)}</div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-slate-700">
                        {formatRoutingGroupLabels(currentUser.notificationGroupKeys, groupOptions)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          <StatusPill className={toneForLifecycle(currentUser)}>
                            {lifecycleLabel(currentUser)}
                          </StatusPill>
                          <StatusPill tone={currentUser.notificationEligible ? 'emerald' : 'slate'}>
                            {currentUser.notificationEligible ? 'Alerts enabled' : 'Alerts blocked'}
                          </StatusPill>
                          <div className="text-[11px] leading-5 text-slate-500">{lifecycleDetail(currentUser)}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-700">
                        {formatTimestamp(currentUser.invitedAt)}
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <div className="flex min-w-[11rem] flex-col items-end gap-2">
                          <button
                            type="button"
                            onClick={() => beginEdit(currentUser)}
                            disabled={isRowBusy(uid)}
                            className="text-xs text-slate-700 hover:text-slate-900 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Edit details
                          </button>
                          {isCurrentUser && !currentUser.disabled && !currentUser.needsInviteAcceptance && !currentUser.phoneVerified && currentUser.phone ? (
                            <button
                              type="button"
                              onClick={() => navigate('/verify-phone')}
                              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                            >
                              Enter code
                            </button>
                          ) : null}
                          {!currentUser.disabled && currentUser.needsInviteAcceptance ? (
                            <button
                              type="button"
                              onClick={() => handleResendInvite(currentUser)}
                              disabled={isRowBusy(uid)}
                              className="text-xs text-blue-600 hover:text-blue-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {busyAction.type === 'invite' && busyAction.uid === uid ? 'Sending…' : 'Resend invite'}
                            </button>
                          ) : null}
                          {!currentUser.disabled && !currentUser.needsInviteAcceptance && !currentUser.phoneVerified && currentUser.phone ? (
                            <button
                              type="button"
                              onClick={() => handleSendCode(currentUser)}
                              disabled={isRowBusy(uid)}
                              className="text-xs text-blue-600 hover:text-blue-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {busyAction.type === 'code' && busyAction.uid === uid
                                ? 'Sending…'
                                : (currentUser.phoneVerificationSentAt ? 'Resend code' : 'Send code')}
                            </button>
                          ) : null}
                          {currentUser.disabled ? (
                            <button
                              type="button"
                              onClick={() => handleEnable(currentUser)}
                              disabled={isRowBusy(uid)}
                              className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {busyAction.type === 'enable' && busyAction.uid === uid ? 'Enabling…' : 'Enable'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDisable(uid)}
                              disabled={isRowBusy(uid)}
                              className="text-xs text-red-600 hover:text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Disable
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {footer}

      <EditTeamUserModal
        isOpen={showEditModal}
        user={editingUser}
        form={editForm}
        onChange={setEditForm}
        onClose={closeEditModal}
        onSubmit={handleSaveEdit}
        groupOptions={groupOptions}
        onToggleGroup={toggleEditNotificationGroup}
        isLoading={busyAction.type === 'edit' && busyAction.uid === (editingUser?.uid || editingUser?.id)}
      />

      <InvitationLinkModal
        isOpen={inviteLinkState.isOpen}
        onClose={() => setInviteLinkState({ isOpen: false, invitationLink: '', email: '' })}
        invitationLink={inviteLinkState.invitationLink}
        email={inviteLinkState.email}
        tenantType={tenantType}
      />

      <ConfirmationModal
        isOpen={showDisableModal}
        onClose={() => {
          setShowDisableModal(false);
          setUserToDisable(null);
        }}
        onConfirm={confirmDisable}
        title="Disable User"
        message={userToDisable ? `Are you sure you want to disable ${userToDisable.displayName || userToDisable.email}? They will no longer be able to access the portal or receive alerts.` : ''}
        confirmText="Disable"
        cancelText="Cancel"
        variant="warning"
        isLoading={busyAction.type === 'disable' && busyAction.uid === (userToDisable?.uid || userToDisable?.id)}
      />
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InputField({ label, value, onChange, ...props }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      <input
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input-field"
      />
    </div>
  );
}

function NotificationGroupSelector({ label, groupOptions, selectedKeys, onToggle }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700">{label}</p>
      <div className="flex flex-wrap gap-2">
        {groupOptions.map((group) => (
          <label
            key={group.key}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm ${
              selectedKeys.includes(group.key)
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={selectedKeys.includes(group.key)}
              onChange={() => onToggle(group.key)}
            />
            <span>{group.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ tone = 'slate', className = '', children }) {
  const toneMap = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
  };
  const classes = className || toneMap[tone] || toneMap.slate;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${classes}`}>
      {children}
    </span>
  );
}

function EditTeamUserModal({
  isOpen,
  user,
  form,
  onChange,
  onClose,
  onSubmit,
  groupOptions,
  onToggleGroup,
  isLoading = false,
}) {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={isLoading ? undefined : onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
          <div className="rounded-t-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">Edit Team Member</h3>
            <p className="mt-1 text-sm text-blue-100">{user.email}</p>
          </div>

          <div className="space-y-5 px-6 py-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InputField
                label="Name"
                value={form.displayName}
                onChange={(value) => onChange((current) => ({ ...current, displayName: value }))}
                placeholder="Jane Doe"
              />
              <InputField
                label="Phone (SMS alerts)"
                value={form.phone}
                onChange={(value) => onChange((current) => ({ ...current, phone: value }))}
                placeholder="+16615551234"
              />
            </div>

            <p className="text-xs text-slate-500">
              Updating the phone number resets verification for that user until a new code is sent and confirmed.
            </p>

            <NotificationGroupSelector
              label="Notification Groups"
              groupOptions={groupOptions}
              selectedKeys={form.notificationGroupKeys}
              onToggle={onToggleGroup}
            />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={isLoading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {isLoading ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
