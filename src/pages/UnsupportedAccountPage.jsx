import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SUPPORT_CONSOLE_URL =
  import.meta.env.VITE_SUPPORT_CONSOLE_URL ||
  'https://support.worksidesoftware.com';

export default function UnsupportedAccountPage() {
  const { user, userClaims, signOut } = useAuth();
  const [params] = useSearchParams();
  const reason = params.get('reason');
  const isSupportConsole = reason === 'support-console' || userClaims?.supportRole;
  const isMerxusAdmin =
    userClaims?.type === 'merxus' &&
    ['super_admin', 'merxus_admin'].includes(userClaims?.role);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-16 text-slate-900">
      <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
          Account Access
        </p>
        <h1 className="mt-3 text-2xl font-bold">
          {isSupportConsole
            ? 'Use the Workside Support Console'
            : isMerxusAdmin
              ? 'This page requires a tenant account'
              : 'No Merxus tenant is assigned'}
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-700">
          {isSupportConsole
            ? 'This Firebase account is authorized for the Workside Support Console, but it is not assigned to a Merxus AI restaurant, office, real estate, or admin tenant.'
            : isMerxusAdmin
              ? 'You are still signed in as a Merxus administrator. Return to Tenant Management, or sign out and use the newly created owner account to enter its tenant portal.'
              : 'You signed in successfully, but this account does not have a Merxus AI tenant assignment yet.'}
        </p>

        <div className="mt-5 rounded-md bg-slate-50 p-4 text-sm text-slate-700">
          <p>
            Signed in as <span className="font-semibold">{user?.email || userClaims?.name || 'this account'}</span>
          </p>
          {userClaims?.role || userClaims?.supportRole ? (
            <p className="mt-1">
              Role: <span className="font-semibold">{userClaims.supportRole || userClaims.role}</span>
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {isSupportConsole ? (
            <a
              href={SUPPORT_CONSOLE_URL}
              className="inline-flex justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Open Support Console
            </a>
          ) : isMerxusAdmin ? (
            <Link
              to="/merxus/tenants"
              className="inline-flex justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Return to Tenant Management
            </Link>
          ) : (
            <Link
              to="/onboarding"
              className="inline-flex justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Start Onboarding
            </Link>
          )}
          <button
            type="button"
            onClick={signOut}
            className="inline-flex justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
          <Link
            to="/login"
            className="inline-flex justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
