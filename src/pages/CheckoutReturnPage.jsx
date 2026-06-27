import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPurchase } from '../utils/metaPixel';

const CheckoutReturnPage = () => {
  const location = useLocation();
  const [attemptedOpen, setAttemptedOpen] = useState(false);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const success = params.get('success') === 'true';
  const canceled = params.get('canceled') === 'true';
  const deeplink = params.get('deeplink') || '';
  const sessionId = params.get('session_id') || params.get('checkout_session_id') || '';

  useEffect(() => {
    if (!success) return;
    trackPurchase({
      content_name: 'Merxus Subscription',
      currency: 'USD',
      page_path: location.pathname,
      session_id: sessionId || undefined,
    }, {
      dedupeKey: sessionId || `checkout-return:${location.search}`,
    });
  }, [location.pathname, location.search, sessionId, success]);

  useEffect(() => {
    if (deeplink && !attemptedOpen) {
      setAttemptedOpen(true);
      window.location.href = deeplink;
    }
  }, [deeplink, attemptedOpen]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full bg-gray-900/80 border border-gray-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-semibold mb-3">Return to Merxus</h1>
        {success && (
          <p className="text-emerald-400 font-medium mb-4">
            Payment successful. Please return to the mobile app to continue onboarding.
          </p>
        )}
        {canceled && (
          <p className="text-amber-400 font-medium mb-4">
            Payment was canceled. You can return to the app to try again.
          </p>
        )}
        {!success && !canceled && (
          <p className="text-gray-300 mb-4">
            You can return to the mobile app to continue onboarding.
          </p>
        )}

        {deeplink ? (
          <button
            onClick={() => {
              window.location.href = deeplink;
            }}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition"
          >
            Open Merxus App
          </button>
        ) : (
          <p className="text-gray-400 text-sm">
            Deep link not provided. Please open the Merxus app manually.
          </p>
        )}
      </div>
    </div>
  );
};

export default CheckoutReturnPage;
