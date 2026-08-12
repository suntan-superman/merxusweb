import { useEffect, useState } from 'react';
import { AlertCircle, CreditCard } from 'lucide-react';
import { toast } from 'react-toastify';
import { createCheckoutSession, getBillingPricing } from '../../../api/billing';
import TurnstileWidget from '../../common/TurnstileWidget';
import {
  formatBillingAmount,
  getPlanPricing,
  isCompletePlanPricing,
  normalizePlanTier,
} from '../../../utils/billingPricing';

export default function PaymentCheckout({ data, onChange, tenantType, tenantId }) {
  const [captchaToken, setCaptchaToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [pricingData, setPricingData] = useState(null);
  const [pricingError, setPricingError] = useState(false);
  const [promoCode, setPromoCode] = useState(data.promoCode || '');

  useEffect(() => {
    const loadPricing = async () => {
      try {
        setPricingError(false);
        const pricing = await getBillingPricing();
        console.debug('💵 Loaded pricing data', pricing);
        setPricingData(pricing);
      } catch (error) {
        console.error('Failed to load pricing:', error);
        setPricingError(true);
        toast.error('Payment service unavailable right now. Reload to verify pricing before checkout.');
      }
    };

    loadPricing();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success') === 'true';
    const canceled = params.get('canceled') === 'true';
    if (success) {
      onChange({ paymentCompleted: true, paymentSessionId: params.get('session_id') || null });
      toast.success('✅ Payment completed! You can continue setup.');

      const cleanedParams = new URLSearchParams(window.location.search);
      cleanedParams.delete('success');
      cleanedParams.delete('session_id');
      cleanedParams.delete('canceled');
      cleanedParams.delete('resumeStep');
      cleanedParams.delete('tenantId');
      const cleanQuery = cleanedParams.toString();
      const cleanUrl = cleanQuery ? `${window.location.pathname}?${cleanQuery}` : window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      return;
    }

    if (canceled) {
      toast.info('Checkout was canceled. You can continue when ready.');

      const cleanedParams = new URLSearchParams(window.location.search);
      cleanedParams.delete('canceled');
      cleanedParams.delete('resumeStep');
      cleanedParams.delete('tenantId');
      const cleanQuery = cleanedParams.toString();
      const cleanUrl = cleanQuery ? `${window.location.pathname}?${cleanQuery}` : window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

  const planTier = normalizePlanTier(data.planTier);
  const pricing = getPlanPricing(pricingData, tenantType, planTier);
  const pricingReady = isCompletePlanPricing(pricing);
  const trialDays = pricingData?.trialDays;
  const trialLabel = Number.isFinite(trialDays) ? `${trialDays}-day trial` : 'configured trial';

  const handleCheckout = async () => {
    console.debug('🧭 Proceeding to checkout', {
      tenantType,
      tenantId,
      reservationId: data.reservationId,
      promoCode,
      planTier,
    });

    if (!tenantType || !tenantId) {
      toast.error('Tenant setup not complete yet. Please continue setup.');
      return;
    }

    if (!pricingReady) {
      toast.error('Current plan pricing could not be verified. Reload and try again.');
      return;
    }

    if (!captchaToken) {
      toast.error('Please complete the CAPTCHA.');
      return;
    }

    setLoading(true);
    try {
      const successReturnUrl = new URL(window.location.href);
      successReturnUrl.searchParams.delete('session_id');
      successReturnUrl.searchParams.delete('canceled');
      successReturnUrl.searchParams.set('success', 'true');
      successReturnUrl.searchParams.set('type', tenantType);
      successReturnUrl.searchParams.set('tenantId', tenantId);
      successReturnUrl.searchParams.set('resumeStep', '6');

      const cancelReturnUrl = new URL(window.location.href);
      cancelReturnUrl.searchParams.delete('success');
      cancelReturnUrl.searchParams.delete('session_id');
      cancelReturnUrl.searchParams.set('canceled', 'true');
      cancelReturnUrl.searchParams.set('type', tenantType);
      cancelReturnUrl.searchParams.set('tenantId', tenantId);

      const successUrl = successReturnUrl.toString();
      const cancelUrl = cancelReturnUrl.toString();

      const checkoutResult = await createCheckoutSession({
        tenantType,
        tenantId,
        reservationId: data.reservationId || undefined,
        promoCode: promoCode || undefined,
        planTier,
        successUrl,
        cancelUrl,
      });

      window.location.href = checkoutResult.url;
    } catch (error) {
      console.error('Checkout error:', error);
      const message = error.response?.data?.error || error.message || 'Failed to start checkout';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-4">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Setup Payment</h3>
        <p className="text-gray-600">Your onboarding fee is charged now. Subscription starts after your {trialLabel}.</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="text-green-600" size={24} />
            <h4 className="text-lg font-semibold text-gray-900">Payment Summary</h4>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-semibold">Phone Number:</span>{' '}
              <span className="font-mono">Selected after payment</span>
            </p>
            <p>
              <span className="font-semibold">Plan:</span>{' '}
              {pricing?.label || pricing?.name}
            </p>
            <p>
              <span className="font-semibold">Onboarding Fee:</span>{' '}
              {formatBillingAmount(pricing?.onboardingUnitAmount, pricing?.currency) || '—'}
            </p>
            <p>
              <span className="font-semibold">Monthly Subscription:</span>{' '}
              {formatBillingAmount(pricing?.subscriptionUnitAmount, pricing?.currency) || '—'} / month
            </p>
            <p className="text-xs text-gray-500">Your {trialLabel} starts after onboarding payment.</p>
            {pricingError && (
              <p className="text-xs text-amber-600 font-semibold">
                Pricing unavailable right now. Reload to verify the current catalog before checkout.
              </p>
            )}
          </div>
        </div>

        {pricingData?.promo?.enabled ? (
          <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Promo Code (Onboarding only)</label>
            <input
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value);
                onChange({ promoCode: e.target.value });
              }}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all outline-none"
              placeholder="Enter promo code"
            />
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600 flex items-start gap-2">
            <AlertCircle size={18} className="text-gray-500 mt-0.5" />
            Promo codes are not available right now.
          </div>
        )}

        <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
          <TurnstileWidget
            onVerify={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken('')}
          />
        </div>

        {!pricingError && (
          <button
            onClick={handleCheckout}
            disabled={loading || !pricingReady}
            className="w-full py-3 px-4 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Redirecting to Checkout...' : 'Proceed to Secure Checkout'}
          </button>
        )}

        {pricingError && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 rounded-lg font-semibold bg-amber-500 text-white text-center"
          >
            Reload pricing
          </button>
        )}
      </div>
    </div>
  );
}
