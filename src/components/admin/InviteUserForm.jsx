import { useState } from 'react';

export default function InviteUserForm({ onInvite, submitting }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('manager');

  async function handleSubmit(e) {
    e.preventDefault();
    await onInvite({ email, displayName: name, role });
    setEmail('');
    setName('');
    setRole('manager');
  }

  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite Team Member</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Role *
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input-field"
            >
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary"
        >
          {submitting ? 'Inviting…' : 'Send Invitation'}
        </button>
      </form>
    </section>
  );
}

