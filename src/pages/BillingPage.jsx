import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSubscription, cancelSubscription, getBillingPricing, createPortalSession } from '../api/billing';
import { refreshClaims } from '../api/auth';
import { Check, CreditCard, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { getTierLabel } from '../hooks/useSubscriptionPlan';
import { formatBillingAmount, getPricingTenantKey } from '../utils/billingPricing';

const BillingPage = () => {
  const { user, tenantType: userTenantType } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [showClaimsError, setShowClaimsError] = useState(false);
  const [refreshingClaims, setRefreshingClaims] = useState(false);
  const [pricingData, setPricingData] = useState(null);
  const [pricingError, setPricingError] = useState('');
  const [deeplinkUrl, setDeeplinkUrl] = useState('');

  // Get tenant type from user claims
  const tenantType = userTenantType || 'restaurant';

  const upgradeContext = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const requiredTier = params.get('requiredTier');
    const from = params.get('from');

    if (!requiredTier) {
      return null;
    }

    const normalizedFrom = from ? decodeURIComponent(from) : '';
    const prettyFrom = normalizedFrom
      ? normalizedFrom
          .split('/')
          .filter(Boolean)
          .slice(1)
          .join(' / ')
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase())
      : '';

    return {
      requiredTier,
      requiredTierLabel: getTierLabel(requiredTier),
      from: normalizedFrom,
      prettyFrom,
    };
  }, []);

  const pricingKey = getPricingTenantKey(tenantType);
  const catalogPlans = pricingData?.displayPlans?.[pricingKey] || [];
  const trialDays = pricingData?.trialDays;
  const trialHeading = Number.isFinite(trialDays) ? `${trialDays}-Day Free Trial Active` : 'Free Trial Active';
  const trialLabel = Number.isFinite(trialDays) ? `${trialDays}-day free trial` : 'configured free trial';

  useEffect(() => {
    fetchSubscription();
    fetchPricing();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success') === 'true';
    const canceled = params.get('canceled') === 'true';
    const deeplink = params.get('deeplink');

    if (success) {
      if (deeplink) {
        setDeeplinkUrl(deeplink);
        window.location.href = deeplink;
        setTimeout(() => {
          toast.success('Payment successful! You can return to the app.');
        }, 1000);
      } else {
        toast.success('Payment successful!');
      }
    } else if (canceled) {
      toast('Checkout canceled.');
    }

    if (success || canceled) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchPricing = async () => {
    try {
      setPricingError('');
      const data = await getBillingPricing();
      setPricingData(data);
    } catch (error) {
      console.error('Error fetching pricing:', error);
      setPricingError('Current Stripe pricing could not be verified. Reload to try again.');
    }
  };

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setShowClaimsError(false);
      const data = await getSubscription();
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      
      // Check if it's a 400 error (missing tenant information)
      if (error?.response?.status === 400) {
        setShowClaimsError(true);
        toast.error('Account configuration issue detected. Please refresh your claims.');
      } else {
        toast.error('Failed to load subscription details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshClaims = async () => {
    try {
      setRefreshingClaims(true);
      const result = await refreshClaims();
      
      if (result.needsUpdate) {
        toast.success('Claims updated! Please log out and log back in.');
        // Optionally redirect to login after a delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      } else {
        toast.success('Claims are already up to date. Try refreshing the page.');
        setShowClaimsError(false);
        // Retry fetching subscription
        setTimeout(() => {
          fetchSubscription();
        }, 1000);
      }
    } catch (error) {
      console.error('Error refreshing claims:', error);
      toast.error('Failed to refresh claims. Please contact support.');
    } finally {
      setRefreshingClaims(false);
    }
  };

  const handleUpgrade = async (planKey) => {
    try {
      setProcessingCheckout(true);
      if (!subscription?.status) {
        toast.error('Please complete onboarding to start billing.');
        setProcessingCheckout(false);
        return;
      }

      const { url } = await createPortalSession({ returnUrl: window.location.href });
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      
      // Check if it's a Stripe configuration issue
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to start checkout process';
      
      if (errorMessage.includes('Stripe') || errorMessage.includes('secret') || error?.response?.status === 500) {
        toast.error('Billing system is still being configured. Please contact support to set up your subscription.');
      } else {
        toast.error(errorMessage);
      }
      
      setProcessingCheckout(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCanceling(true);
      await cancelSubscription();
      toast.success('Subscription will cancel at the end of your billing period');
      setShowCancelDialog(false);
      fetchSubscription(); // Refresh subscription data
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error('Failed to cancel subscription');
    } finally {
      setCanceling(false);
    }
  };

  if (loading && !showClaimsError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-300">Loading billing information...</p>
        </div>
      </div>
    );
  }

  const isTrialing = subscription?.status === 'trial';
  const isActive = subscription?.status === 'active';
  const currentPlanLabel = subscription?.tierLabel || 'Basic';
  const currentBillingPrice = formatMoney(
    subscription?.billing?.unitAmount,
    subscription?.billing?.currency || 'usd',
  );
  const currentBillingInterval = subscription?.billing?.interval || 'month';
  const catalogMonthlyPrice = formatMoney(
    catalogPlans[0]?.subscriptionUnitAmount,
    catalogPlans[0]?.currency || 'usd',
  );
  const hasRequiredAccess = upgradeContext
    ? upgradeContext.requiredTier === 'elite'
      ? !!subscription?.entitlements?.elite
      : upgradeContext.requiredTier === 'professional'
        ? !!subscription?.entitlements?.professional
        : true
    : false;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Billing & Subscription</h1>
          <p className="mt-2 text-gray-600 dark:text-slate-300">Manage your subscription and billing information</p>
        </div>

        {upgradeContext ? (
          <div className={`mb-6 rounded-xl border p-4 ${
            hasRequiredAccess
              ? 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-950/30'
              : 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30'
          }`}>
            <div className="flex flex-col gap-2">
              <p className={`text-sm font-semibold ${
                hasRequiredAccess
                  ? 'text-green-900 dark:text-green-200'
                  : 'text-blue-900 dark:text-blue-200'
              }`}>
                {hasRequiredAccess
                  ? `${upgradeContext.requiredTierLabel} access is enabled`
                  : `${upgradeContext.requiredTierLabel} access required`}
              </p>
              <p className={`text-sm ${
                hasRequiredAccess
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-blue-800 dark:text-blue-300'
              }`}>
                {hasRequiredAccess
                  ? `${upgradeContext.prettyFrom || 'This feature'} is available for this account.`
                  : upgradeContext.prettyFrom
                    ? `${upgradeContext.prettyFrom} is available on the ${upgradeContext.requiredTierLabel} tier or higher.`
                    : `This feature is available on the ${upgradeContext.requiredTierLabel} tier or higher.`}
              </p>
              {upgradeContext.from ? (
                <p className={`text-xs ${
                  hasRequiredAccess
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-blue-700 dark:text-blue-300'
                }`}>
                  Requested route: <span className="font-medium">{upgradeContext.from}</span>
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {deeplinkUrl && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-semibold text-green-900 dark:text-green-200">Return to the Merxus app</h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  If the app didn’t reopen automatically, tap the button below.
                </p>
              </div>
              <button
                onClick={() => {
                  window.location.href = deeplinkUrl;
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md"
              >
                Open App
              </button>
            </div>
          </div>
        )}

        {/* Current Status */}
        {subscription && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 p-6 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">Current Status</h2>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 text-gray-400 dark:text-slate-500 mr-2" />
                    <span className="text-gray-700 dark:text-slate-300">
                      {isTrialing ? (
                        <>
                          <span className="font-medium text-green-600">Free Trial</span>
                          {subscription.trialEndsAt && (
                            <span className="text-sm text-gray-500 dark:text-slate-400 ml-2">
                              Ends {new Date(subscription.trialEndsAt).toLocaleDateString()}
                            </span>
                          )}
                        </>
                      ) : isActive ? (
                        <>
                          <span className="font-medium text-green-600 capitalize">{currentPlanLabel} feature access</span>
                          {currentBillingPrice ? (
                            <span className="text-sm text-gray-500 dark:text-slate-400 ml-2">
                              {currentBillingPrice}/{currentBillingInterval}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="font-medium text-gray-600 dark:text-slate-300 capitalize">{subscription.status}</span>
                      )}
                    </span>
                  </div>
                  {subscription.renewalDate && (
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400 dark:text-slate-500 mr-2" />
                      <span className="text-sm text-gray-600 dark:text-slate-300">
                        {subscription.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on{' '}
                        {new Date(subscription.renewalDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {isActive && !subscription.cancelAtPeriodEnd && (
                <button
                  onClick={() => setShowCancelDialog(true)}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-300 dark:border-red-700 hover:border-red-400 dark:hover:border-red-600 rounded-md transition-colors"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
            {subscription.billing?.deprecatedPrice ? (
              <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
                <p className="font-semibold">Legacy test price detected</p>
                <p className="mt-1">
                  Stripe is currently billing {currentBillingPrice || 'a legacy amount'} through{' '}
                  {subscription.billing.productName || 'a deprecated test product'}. The current {catalogPlans[0]?.name || 'Merxus'} catalog price is{' '}
                  {catalogMonthlyPrice || 'shown below'}/month. Changing the recurring Stripe price requires a separate billing migration.
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* Claims Error Warning */}
        {showClaimsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-900">Account Configuration Issue</h3>
                <p className="mt-1 text-sm text-red-700">
                  Your account needs to be updated to access billing features. 
                  This is a one-time fix that takes just a second.
                </p>
                <button
                  onClick={handleRefreshClaims}
                  disabled={refreshingClaims}
                  className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {refreshingClaims ? (
                    <>
                      <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                      Fixing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Fix Account Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Trial Warning */}
        {isTrialing && subscription?.trialEndsAt && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-green-900">{trialHeading}</h3>
                <p className="mt-1 text-sm text-green-700">
                  Your trial ends on {new Date(subscription.trialEndsAt).toLocaleDateString()}. 
                  Your monthly subscription will start automatically after the trial. Cancel anytime before then.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current tenant catalog pricing */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">Current Pricing</h2>
          <p className="mb-6 text-sm text-gray-600 dark:text-slate-300">
            Pricing below is loaded from the current Stripe catalog for this tenant type.
          </p>
          {pricingError && <p className="mb-4 font-semibold text-red-600">{pricingError}</p>}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {catalogPlans.map((plan) => {
              const monthlyPrice = formatBillingAmount(plan.subscriptionUnitAmount, plan.currency);
              const setupPrice = formatBillingAmount(plan.onboardingUnitAmount, plan.currency);
              
              return (
                <div
                  key={`${pricingKey}-${plan.tier}`}
                  className="bg-white dark:bg-slate-900 rounded-lg shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 border-2 border-green-500 p-6 flex flex-col"
                >
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900 dark:text-slate-100">
                      {monthlyPrice}
                    </span>
                    <span className="text-gray-600 dark:text-slate-300">/month</span>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                      {setupPrice} one-time setup fee
                    </p>
                  </div>
                  
                  <ul className="space-y-3 mb-6 flex-grow">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <button
                    onClick={() => handleUpgrade(plan.tier)}
                    disabled={processingCheckout}
                    className="w-full py-3 px-4 rounded-md font-medium transition-colors bg-gray-900 dark:bg-slate-800 text-white hover:bg-gray-800 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    {processingCheckout ? 'Opening...' : isActive ? 'Manage Billing' : 'Get Started'}
                  </button>
                  
                  <p className="text-xs text-gray-500 dark:text-slate-400 text-center mt-3">
                    One-time setup fee applies to new accounts • {trialLabel}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-slate-100">When will I be charged?</h3>
              <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                The one-time setup fee is charged immediately when you sign up. Your monthly subscription starts with a {trialLabel}. After the trial ends, you'll be charged the monthly subscription fee.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-slate-100">Can I cancel anytime?</h3>
              <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your current billing period.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-slate-100">How do feature-access upgrades work?</h3>
              <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                Contact Merxus support for Professional or Elite feature access. Any recurring-price change is confirmed separately before Stripe billing is updated.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancelSubscription}
        title="Cancel Subscription?"
        message="Are you sure you want to cancel your subscription? You'll continue to have access until the end of your current billing period."
        confirmText="Cancel Subscription"
        confirmVariant="danger"
        isLoading={canceling}
      />
    </div>
  );
};

export default BillingPage;
