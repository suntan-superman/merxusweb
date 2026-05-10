import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';

const SIGN_OUT_CONFIRM_SKIP_KEY = 'merxus.signOut.skipConfirmation';

export default function SignOutButton({
  className = '',
  navigateTo = '/login',
  children = 'Sign Out',
  onSignedOut,
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [skipNextTime, setSkipNextTime] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function performSignOut() {
    try {
      setSigningOut(true);
      if (skipNextTime && typeof window !== 'undefined') {
        window.localStorage.setItem(SIGN_OUT_CONFIRM_SKIP_KEY, 'true');
      }
      await signOut(auth);
      onSignedOut?.();
      navigate(navigateTo);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setSigningOut(false);
      setOpen(false);
    }
  }

  function handleClick() {
    const shouldSkip = typeof window !== 'undefined'
      && window.localStorage.getItem(SIGN_OUT_CONFIRM_SKIP_KEY) === 'true';
    if (shouldSkip) {
      performSignOut();
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <button type="button" onClick={handleClick} className={className}>
        {children}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[10000] overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={signingOut ? undefined : () => setOpen(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900">
              <div className="bg-gradient-to-r from-slate-800 to-slate-950 px-6 py-4">
                <h3 className="text-lg font-semibold text-white">Sign Out</h3>
              </div>
              <div className="space-y-4 px-6 py-5">
                <p className="text-sm leading-relaxed text-gray-700 dark:text-slate-200">
                  Are you sure you want to sign out of Merxus?
                </p>
                <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={skipNextTime}
                    onChange={(event) => setSkipNextTime(event.target.checked)}
                    className="mt-1"
                  />
                  <span>Do not show this confirmation again on this device.</span>
                </label>
              </div>
              <div className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end dark:border-slate-800 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={signingOut}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Stay Signed In
                </button>
                <button
                  type="button"
                  onClick={performSignOut}
                  disabled={signingOut}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                >
                  {signingOut ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
