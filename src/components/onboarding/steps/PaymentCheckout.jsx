import { useEffect, useState } from 'react';
import { AlertCircle, CreditCard, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import { reserveNumber, createCheckoutSession, getBillingPricing } from '../../../api/billing';
import TurnstileWidget from '../../common/TurnstileWidget';
import { formatPhoneDisplay } from '../../../utils/phoneFormatter';

export default function PaymentCheckout({ data, onChange, tenantType, tenantId }) {
  const [captchaToken, setCaptchaToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [pricingData, setPricingData] = useState(null);
  const [promoCode, setPromoCode] = useState(data.promoCode || '');

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const pricing = await getBillingPricing();
        setPricingData(pricing);
      } catch (error) {
        console.error('Failed to load pricing:', error);
      }
    };

    loadPricing();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success') === 'true';
    if (success) {
      onChange({ ...data, paymentCompleted: true, paymentSessionId: params.get('session_id') || null });
      toast.success('✅ Payment completed! You can continue setup.');

      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

  const pricingKey = tenantType === 'voice' ? 'office' : tenantType;
  const pricing = pricingData?.tenants?.[pricingKey];
  const subscriptionPrice = pricing?.subscription?.unitAmount;
  const subscriptionCurrency = pricing?.subscription?.currency || 'usd';
  const onboardingPrice = pricing?.onboarding?.unitAmount;
  const onboardingCurrency = pricing?.onboarding?.currency || 'usd';

  const formatMoney = (amount, currency = 'usd') => {
    if (amount === null || amount === undefined) return null;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amount / 100);
    } catch {
      return `$${(amount / 100).toFixed(2)}`;
    }
  };

  const reservationExpired = data.reservationExpiresAt
    ? new Date(data.reservationExpiresAt).getTime() < Date.now()
    : false;

  const handleCheckout = async () => {
    if (!data.twilioPhoneNumber) {
      toast.error('Please select a phone number first.');
      return;
    }

    if (!tenantType || !tenantId) {
      toast.error('Tenant setup not complete yet. Please continue setup.');
      return;
    }

    if (!captchaToken) {
      toast.error('Please complete the CAPTCHA.');
      return;
    }

    setLoading(true);
    try {
      let reservationId = data.reservationId;
      let reservationExpiresAt = data.reservationExpiresAt;

      if (!reservationId || reservationExpired) {
        const reserveResult = await reserveNumber({
          tenantType,
          tenantId,
          selectedNumber: data.twilioPhoneNumber,
          captchaToken,
        });

        reservationId = reserveResult.reservationId;
        reservationExpiresAt = reserveResult.expiresAt;

        onChange({
          ...data,
          reservationId,
          reservationExpiresAt,
        });
      }

      const successUrl = `${window.location.origin}${window.location.pathname}`;
      const cancelUrl = `${window.location.origin}${window.location.pathname}`;

      const checkoutResult = await createCheckoutSession({
        tenantType,
        tenantId,
        reservationId,
        promoCode: promoCode || undefined,
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
        <p className="text-gray-600">Your onboarding fee is charged now. Subscription starts after your 30-day trial.</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="text-green-600" size={24} />
            <h4 className="text-lg font-semibold text-gray-900">Payment Summary</h4>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-semibold">Selected Number:</span>{' '}
              <span className="font-mono">{data.twilioPhoneNumber ? formatPhoneDisplay(data.twilioPhoneNumber) : 'Not selected'}</span>
            </p>
            <p>
              <span className="font-semibold">Onboarding Fee:</span>{' '}
              {formatMoney(onboardingPrice, onboardingCurrency) || '—'}
            </p>
            <p>
              <span className="font-semibold">Monthly Subscription:</span>{' '}
              {formatMoney(subscriptionPrice, subscriptionCurrency) || '—'} / month
            </p>
            <p className="text-xs text-gray-500">30-day free trial starts after onboarding payment.</p>
          </div>
        </div>

        {pricingData?.promo?.enabled ? (
          <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Promo Code (Onboarding only)</label>
            <input
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value);
                onChange({ ...data, promoCode: e.target.value });
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

        {data.reservationExpiresAt && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 flex items-center gap-2">
            <Clock size={18} />
            Reservation expires at {new Date(data.reservationExpiresAt).toLocaleTimeString()}.
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading || !data.twilioPhoneNumber}
          className="w-full py-3 px-4 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Redirecting to Checkout...' : 'Proceed to Secure Checkout'}
        </button>
      </div>
    </div>
  );
}
