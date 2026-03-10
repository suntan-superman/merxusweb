import { useEffect, useMemo, useState } from 'react';
import ConfirmationModal from '../common/ConfirmationModal';
import {
  disableTeamUser,
  fetchTeamUsers,
  inviteTeamUser,
  updateTeamUser,
} from '../../api/teamUsers';
import { TEAM_NOTIFICATION_GROUPS, getTeamUserCopy } from '../../constants/teamUsers';

function formatTimestamp(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

function toneForLifecycle(user) {
  if (user.disabled) return 'bg-red-100 text-red-700';
  if (user.notificationEligible) return 'bg-emerald-100 text-emerald-700';
  if (user.phoneVerified) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

function lifecycleLabel(user) {
  if (user.disabled) return 'Disabled';
  if (user.notificationEligible) return 'Active';
  if (user.phoneVerified) return 'Pending activation';
  return 'Needs phone verification';
}

export default function TeamUsersWorkspace({ tenantType, footer = null }) {
  const copy = getTeamUserCopy(tenantType);
  const groupOptions = TEAM_NOTIFICATION_GROUPS[tenantType] || [];
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [userToDisable, setUserToDisable] = useState(null);
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    phone: '',
    role: 'manager',
    notificationGroupKeys: [],
  });

  async function load() {
    try {
      setLoading(true);
      setError('');
      const data = await fetchTeamUsers(tenantType);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [tenantType]);

  const summary = useMemo(() => ({
    total: users.length,
    verified: users.filter((user) => user.phoneVerified).length,
    active: users.filter((user) => user.notificationEligible).length,
    pending: users.filter((user) => !user.notificationEligible && !user.disabled).length,
  }), [users]);

  async function handleInvite(event) {
    event.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      await inviteTeamUser(tenantType, form);
      setForm({
        displayName: '',
        email: '',
        phone: '',
        role: 'manager',
        notificationGroupKeys: [],
      });
      await load();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err?.message || 'Failed to invite user.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(uid, role) {
    try {
      setError('');
      await updateTeamUser(tenantType, uid, { role });
      await load();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err?.message || 'Failed to update role.');
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

  function handleDisable(uid) {
    const user = users.find((item) => item.uid === uid || item.id === uid);
    setUserToDisable(user || null);
    setShowDisableModal(true);
  }

  async function confirmDisable() {
    if (!userToDisable) return;
    try {
      await disableTeamUser(tenantType, userToDisable.uid || userToDisable.id);
      await load();
      setShowDisableModal(false);
      setUserToDisable(null);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err?.message || 'Failed to disable user.');
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
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <SummaryCard label="Team Members" value={summary.total} />
            <SummaryCard label="Phone Verified" value={summary.verified} />
            <SummaryCard label="Alert Eligible" value={summary.active} />
            <SummaryCard label="Pending" value={summary.pending} />
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
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
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Role *</label>
              <select
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                className="input-field"
              >
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Notification Groups</p>
            <div className="flex flex-wrap gap-2">
              {groupOptions.map((group) => (
                <label
                  key={group.key}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm ${
                    form.notificationGroupKeys.includes(group.key)
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.notificationGroupKeys.includes(group.key)}
                    onChange={() => toggleNotificationGroup(group.key)}
                  />
                  <span>{group.label}</span>
                </label>
              ))}
            </div>
          </div>

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
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Routing Groups</th>
                  <th className="px-4 py-3">Lifecycle</th>
                  <th className="px-4 py-3">Invited</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.uid || user.id} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-gray-900">{user.displayName || user.email}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-700">
                      <div>{user.phone || '—'}</div>
                      {user.phoneVerificationSentAt ? (
                        <div className="mt-1 text-[11px] text-slate-500">Last code {formatTimestamp(user.phoneVerificationSentAt)}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {user.role === 'owner' ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                          Owner
                        </span>
                      ) : (
                        <select
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          value={user.role}
                          onChange={(event) => handleRoleChange(user.uid || user.id, event.target.value)}
                        >
                          <option value="manager">Manager</option>
                          <option value="staff">Staff</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${user.emailVerified ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          Email {user.emailVerified ? 'verified' : 'pending'}
                        </span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${user.phoneVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          Phone {user.phoneVerified ? 'verified' : 'pending'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-700">
                      {user.notificationGroupKeys?.length ? user.notificationGroupKeys.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${toneForLifecycle(user)}`}>
                          {lifecycleLabel(user)}
                        </span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${user.notificationEligible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {user.notificationEligible ? 'Alerts enabled' : 'Alerts blocked'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-700">
                      {formatTimestamp(user.invitedAt)}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      {!user.disabled ? (
                        <button
                          onClick={() => handleDisable(user.uid || user.id)}
                          className="text-xs text-red-600 hover:text-red-700 hover:underline"
                        >
                          Disable
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {footer}

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
