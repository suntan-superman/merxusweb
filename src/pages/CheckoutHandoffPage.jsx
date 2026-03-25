import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function CheckoutHandoffPage() {
  const [params] = useSearchParams();
  const checkoutUrl = params.get('checkout_url') || params.get('checkoutUrl') || '';

  const hasCheckoutUrl = useMemo(() => {
    try {
      if (!checkoutUrl) return false;
      const parsed = new URL(checkoutUrl);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, [checkoutUrl]);

  return (
    <div className="min-h-screen bg-gray-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-emerald-400/20 bg-gray-900/80 p-8 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Merxus Setup</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Finish secure setup</h1>
        <p className="mt-4 text-base leading-7 text-gray-300">
          To activate your Merxus account, continue secure setup in your browser. Once complete, we&apos;ll guide you
          back so you can resume onboarding.
        </p>

        <div className="mt-8 rounded-2xl border border-gray-800 bg-gray-950/60 p-5">
          <ul className="space-y-3 text-sm text-gray-300">
            <li>Secure checkout</li>
            <li>Business activation</li>
            <li>Guided return to the app</li>
          </ul>
        </div>

        {hasCheckoutUrl ? (
          <div className="mt-8 space-y-4">
            <button
              type="button"
              onClick={() => {
                window.location.href = checkoutUrl;
              }}
              className="w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Continue to Secure Checkout
            </button>
            <p className="text-xs text-gray-400">Secure checkout is completed on our website.</p>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Secure checkout could not be started from this link. Please return to the Merxus app and try again.
          </div>
        )}
      </div>
    </div>
  );
}
