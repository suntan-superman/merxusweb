import { useState } from 'react';
import { getIdToken } from 'firebase/auth';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../firebase/config';
import { verifyPhoneVerificationLink } from '../api/teamUsers';
import { useAuth } from '../context/AuthContext';
import { getPortalBasePath } from '../utils/objectRouting';

export default function PhoneVerificationLinkPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userClaims } = useAuth();
  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';
  const linkReady = Boolean(uid && token);
  const [status, setStatus] = useState(linkReady ? 'ready' : 'error');
  const [message, setMessage] = useState(linkReady ? '' : 'This verification link is incomplete.');
  const [verifying, setVerifying] = useState(false);

  const portalTarget = getPortalBasePath(userClaims?.type || userClaims?.tenantType) || '/';
  const canOpenPortal = Boolean(user?.uid && user.uid === uid && userClaims);

  async function handleVerify() {
    if (!uid || !token || verifying) {
      return;
    }

    try {
      setVerifying(true);
      setStatus('verifying');
      setMessage('');
      const result = await verifyPhoneVerificationLink(uid, token);
      if (auth.currentUser) {
        try {
          await getIdToken(auth.currentUser, true);
        } catch (_) {}
      }
      setStatus('success');
      setMessage(result?.phone ? `Phone ${result.phone} verified successfully.` : 'Phone verified successfully.');
    } catch (error) {
      setStatus('error');
      setMessage(error?.response?.data?.error || error?.message || 'This verification link could not be completed.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">Phone Verification</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">Confirm your mobile phone</h1>

        {status === 'ready' ? (
          <>
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
              Tap the button below to complete phone verification. This extra confirmation helps prevent one-time links from being consumed by message previews or security scanners before you actually use them.
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleVerify}
                className="btn-primary"
                disabled={verifying}
              >
                {verifying ? 'Verifying…' : 'Verify phone now'}
              </button>
              <Link
                to="/login"
                className="rounded-full border border-slate-200 dark:border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-200 dark:hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300"
              >
                Sign in instead
              </Link>
            </div>
          </>
        ) : null}

        {status === 'verifying' ? (
          <div className="mt-8 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600" />
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Verifying your phone number…</p>
          </div>
        ) : null}

        {status === 'success' ? (
          <>
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
              {message}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Your alert phone is now confirmed. If you already have your portal account open, refresh the page. Otherwise sign in to continue.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {canOpenPortal ? (
                <button
                  type="button"
                  onClick={() => navigate(portalTarget, { replace: true })}
                  className="btn-primary"
                >
                  Open portal
                </button>
              ) : null}
              <Link
                to="/login"
                className="rounded-full border border-slate-200 dark:border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-200 dark:hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300"
              >
                Sign in
              </Link>
            </div>
          </>
        ) : null}

        {status === 'error' ? (
          <>
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              {message}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Sign in to Merxus and request a new verification text if you still need to activate this phone.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="rounded-full border border-slate-200 dark:border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-200 dark:hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300"
              >
                Sign in
              </Link>
              <Link
                to="/verify-phone"
                className="rounded-full border border-slate-200 dark:border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-200 dark:hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300"
              >
                Enter code manually
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
