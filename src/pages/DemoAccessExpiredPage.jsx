import { useNavigate } from 'react-router-dom';
import { Clock3, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DemoAccessExpiredPage() {
  const navigate = useNavigate();
  const { signOut, userClaims } = useAuth();
  const expiresAt = userClaims?.demoExpiresAt ? new Date(userClaims.demoExpiresAt) : null;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <section className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-8 text-center shadow-2xl">
        <Clock3 className="mx-auto mb-4 text-amber-400" size={52} />
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Merxus demo access</p>
        <h1 className="mt-3 text-3xl font-bold">This demo access window has ended</h1>
        <p className="mt-4 text-slate-300">
          {expiresAt && Number.isFinite(expiresAt.getTime())
            ? `Access ended ${expiresAt.toLocaleString()}. `
            : ''}
          A Merxus administrator can review this demonstration account and determine the next step.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-7 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-5 py-2.5 font-semibold hover:bg-slate-800"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </section>
    </main>
  );
}
