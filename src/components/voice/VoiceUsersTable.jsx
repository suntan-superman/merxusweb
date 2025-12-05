// Voice Users Table Component

export default function VoiceUsersTable({ users, onChangeRole, onDisable }) {
  if (!users || users.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        No team members yet. Invite someone to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Invited</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.uid || u.id} className="border-b last:border-b-0 hover:bg-gray-50">
              <td className="px-4 py-3 align-top">
                <div className="font-medium text-gray-900">
                  {u.displayName || u.email}
                </div>
                <div className="text-xs text-gray-500">{u.email}</div>
              </td>
              <td className="px-4 py-3 align-top">
                <select
                  className="border border-gray-300 rounded-md px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={u.role}
                  onChange={(e) => onChangeRole(u.uid || u.id, e.target.value)}
                >
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                  <option value="viewer">Viewer</option>
                </select>
              </td>
              <td className="px-4 py-3 align-top">
                {u.disabled ? (
                  <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                    Disabled
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                    Active
                  </span>
                )}
              </td>
              <td className="px-4 py-3 align-top text-xs text-gray-700">
                {u.invitedAt ? formatDate(u.invitedAt) : '—'}
              </td>
              <td className="px-4 py-3 align-top text-right">
                {!u.disabled && (
                  <button
                    onClick={() => onDisable(u.uid || u.id)}
                    className="text-xs text-red-600 hover:text-red-700 hover:underline"
                  >
                    Disable
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString([], {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
