import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  confirmPasswordReset,
  getIdToken,
  signOut,
  signInWithEmailAndPassword,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import {
  confirmInviteProfile,
  resolveInviteAcceptance,
} from '../api/teamUsers';

export default function InviteAcceptPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [invite, setInvite] = useState(null);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inviteToken = searchParams.get('inviteToken') || searchParams.get('token');
  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');

  useEffect(() => {
    let active = true;

    async function loadInvite() {
      if (!inviteToken) {
        setError('Invite token is missing from this link.');
        setLoading(false);
        return;
      }

      if (mode && mode !== 'resetPassword') {
        setError('This invite link is not a valid password setup link.');
        setLoading(false);
        return;
      }

      if (!oobCode) {
        setError('This invite link is missing its password setup code.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        if (auth.currentUser) {
          await signOut(auth).catch(() => {});
        }
        const [inviteResponse, inviteEmail] = await Promise.all([
          resolveInviteAcceptance(inviteToken),
          verifyPasswordResetCode(auth, oobCode),
        ]);

        if (!active) return;
        setInvite(inviteResponse);
        setEmail(inviteEmail);
        setDisplayName(inviteResponse?.displayName || '');
      } catch (err) {
        console.error(err);
        if (!active) return;
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'This invite link is invalid or has expired.'
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadInvite();

    return () => {
      active = false;
    };
  }, [inviteToken, mode, oobCode]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!displayName.trim()) {
      setError('Please confirm your name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      await confirmPasswordReset(auth, oobCode, password);
      await signInWithEmailAndPassword(auth, email, password);

      if (!auth.currentUser || auth.currentUser.email?.toLowerCase() !== email.toLowerCase()) {
        throw new Error('The invite was authenticated under the wrong account. Please retry from a signed-out browser session.');
      }

      await confirmInviteProfile(displayName.trim());

      if (auth.currentUser) {
        await getIdToken(auth.currentUser, true);
      }

      setSuccess('Account setup complete. Redirecting to phone verification…');
      window.location.assign('/verify-phone');
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.error ||
          err?.message ||
          'We could not finish setting up your invite.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600" />
          <p className="mt-4 text-sm text-slate-500">Loading your invitation…</p>
        </div>
      </div>
    );
  }

  if (!invite || !email) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">Team Invitation</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">This invite can&apos;t be used</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {error || 'The invite link is invalid, expired, or has already been completed.'}
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-700"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">Team Invitation</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Accept your Merxus invite</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Set your password, confirm your name, and then we&apos;ll move you into SMS phone verification so alerts can be enabled safely.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <InviteInfoCard label="Email" value={invite?.email || email || 'Pending'} />
          <InviteInfoCard label="Phone" value={invite?.maskedPhone || 'Missing'} />
          <InviteInfoCard label="Role" value={invite?.role ? String(invite.role).replace(/_/g, ' ') : 'Team member'} />
        </div>

        {invite?.phoneValidation?.lineType ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Phone validated as <span className="font-semibold text-slate-900">{invite.phoneValidation.lineType.replace(/_/g, ' ')}</span>
            {invite.phoneValidation.carrierName ? ` via ${invite.phoneValidation.carrierName}` : ''}.
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Confirm your name</label>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <input
              value={email}
              disabled
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Create password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
              placeholder="Repeat your password"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Setting up account…' : 'Accept Invitation'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-700"
            >
              Back to login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InviteInfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold capitalize text-slate-900 break-all">{value}</p>
    </div>
  );
}
