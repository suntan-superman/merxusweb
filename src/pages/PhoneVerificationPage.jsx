import { useEffect, useState } from 'react';
import { getIdToken } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import {
  fetchPhoneVerificationStatus,
  sendPhoneVerificationCode,
  verifyPhoneVerificationCode,
} from '../api/teamUsers';
import { getPortalBasePath } from '../utils/objectRouting';

export default function PhoneVerificationPage() {
  const navigate = useNavigate();
  const { user, userClaims, signOut } = useAuth();
  const [status, setStatus] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadStatus() {
    try {
      setLoading(true);
      setError('');
      const response = await fetchPhoneVerificationStatus();
      setStatus(response);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err?.message || 'Failed to load verification status.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (!status || !userClaims) return;
    if (status.phoneVerified) {
      const target = getPortalBasePath(userClaims.type || userClaims.tenantType) || '/';
      navigate(target, { replace: true });
    }
  }, [navigate, status, userClaims]);

  useEffect(() => {
    if (!status || loading || sending) return;
    if (status.phoneVerified || status.verificationPending) return;
    void handleSendCode();
  }, [loading, sending, status]);

  async function handleSendCode() {
    try {
      setSending(true);
      setError('');
      setSuccess('');
      const response = await sendPhoneVerificationCode();
      setSuccess(`Verification text sent to ${response.maskedPhone || status?.maskedPhone || 'your phone'}. You can tap the link in the message or enter the code below.`);
      await loadStatus();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err?.message || 'Failed to send verification code.');
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(event) {
    event.preventDefault();
    try {
      setVerifying(true);
      setError('');
      setSuccess('');
      await verifyPhoneVerificationCode(code);
      if (auth.currentUser) {
        await getIdToken(auth.currentUser, true);
      }
      const target = getPortalBasePath(userClaims?.type || userClaims?.tenantType) || '/';
      setSuccess('Phone number verified. Redirecting…');
      window.location.assign(target);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err?.message || 'Failed to verify code.');
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600" />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading verification status…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">Team Invite Verification</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">Verify your mobile phone</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Your account is almost ready. Use the link or code sent to <span className="font-semibold text-slate-900 dark:text-slate-100">{status?.maskedPhone || 'your phone'}</span> to activate alerts and complete your team invitation.
        </p>

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

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatusCard label="Email" value={status?.emailVerified ? 'Verified' : 'Pending'} />
          <StatusCard label="Phone" value={status?.phoneVerified ? 'Verified' : 'Pending'} />
          <StatusCard label="Account" value={status?.inviteStatus ? String(status.inviteStatus).replace(/_/g, ' ') : 'Invited'} />
        </div>

        <form onSubmit={handleVerify} className="mt-8 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Verification code</label>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-center text-2xl tracking-[0.35em] text-slate-900 dark:text-slate-100"
              placeholder="123456"
              inputMode="numeric"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Codes expire after 5 minutes and you have up to 5 attempts.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={verifying || code.length !== 6} className="btn-primary">
              {verifying ? 'Verifying…' : 'Verify Phone'}
            </button>
            <button
              type="button"
              onClick={handleSendCode}
              disabled={sending}
              className="rounded-full border border-slate-200 dark:border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-200 dark:hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              {sending ? 'Sending…' : 'Resend Code'}
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-full border border-slate-200 dark:border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            >
              Sign Out
            </button>
          </div>
        </form>

        <div className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 text-sm text-slate-600 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-slate-100">Why this step exists</p>
          <p className="mt-2">
            Merxus requires verified mobile numbers before team members can receive SMS alerts, call notifications, lead notifications, or routing-based staff escalations.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold capitalize text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
