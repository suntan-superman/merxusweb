import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSubscription, createCheckoutSession, cancelSubscription } from '../api/billing';
import { refreshClaims } from '../api/auth';
import { Check, X, CreditCard, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/common/ConfirmDialog';

const BillingPage = () => {
  const { user, tenantType: userTenantType } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [showClaimsError, setShowClaimsError] = useState(false);
  const [refreshingClaims, setRefreshingClaims] = useState(false);

  // Get tenant type from user claims
  const tenantType = userTenantType || 'restaurant';

  // Plan configurations for each tenant type
  const PLANS = {
    restaurant: {
      basic: {
        name: 'Basic',
        price: 199,
        setup: 299,
        features: [
          'AI Phone Assistant',
          'Order & Reservation Taking',
          'Up to 3 phone numbers',
          'Priority Support',
          'Analytics Dashboard',
          'Call Transcripts',
        ],
      },
      enterprise: {
        name: 'Enterprise',
        price: 499,
        setup: 999,
        features: [
          'Everything in Basic',
          'POS Integration (Toast/Square)',
          'Up to 5 phone numbers',
          'Advanced Analytics',
          'Custom AI Training',
          'Dedicated Account Manager',
          'API Access',
        ],
        popular: true,
      },
    },
    voice: {
      basic: {
        name: 'Basic',
        price: 49,
        setup: 49,
        features: [
          'AI Phone Assistant',
          '1 phone number',
          'Standard Support',
          'Call Transcripts',
        ],
      },
      professional: {
        name: 'Professional',
        price: 99,
        setup: 149,
        features: [
          'Everything in Basic',
          'Call Routing',
          'Up to 3 phone numbers',
          'Priority Support',
          'Analytics Dashboard',
        ],
        popular: true,
      },
      enterprise: {
        name: 'Enterprise',
        price: 199,
        setup: 249,
        features: [
          'Everything in Professional',
          'Up to 5 phone numbers',
          'Advanced Analytics',
          'API Access',
          'Dedicated Support',
        ],
      },
    },
    real_estate: {
      basic: {
        name: 'Basic',
        price: 49,
        setup: 49,
        features: [
          'AI Phone Assistant',
          '1 phone number',
          'Standard Support',
          'Lead Management',
          'Call Transcripts',
        ],
      },
      professional: {
        name: 'Professional',
        price: 79,
        setup: 99,
        features: [
          'Everything in Basic',
          'Call Routing',
          'Showing Scheduler',
          'Listing Search',
          'Priority Support',
          'Analytics Dashboard',
        ],
        popular: true,
      },
    },
  };

  const plans = PLANS[tenantType] || PLANS.restaurant;

  useEffect(() => {
    fetchSubscription();
  }, []);

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
      const { url } = await createCheckoutSession(planKey);
      
      // Redirect to Stripe Checkout
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading billing information...</p>
        </div>
      </div>
    );
  }

  const isTrialing = subscription?.status === 'trial';
  const isActive = subscription?.status === 'active';
  const currentPlan = subscription?.plan;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="mt-2 text-gray-600">Manage your subscription and billing information</p>
        </div>

        {/* Current Status */}
        {subscription && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Current Status</h2>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-700">
                      {isTrialing ? (
                        <>
                          <span className="font-medium text-green-600">Free Trial</span>
                          {subscription.trialEndsAt && (
                            <span className="text-sm text-gray-500 ml-2">
                              Ends {new Date(subscription.trialEndsAt).toLocaleDateString()}
                            </span>
                          )}
                        </>
                      ) : isActive ? (
                        <>
                          <span className="font-medium text-green-600 capitalize">{currentPlan} Plan</span>
                          <span className="text-sm text-gray-500 ml-2">
                            ${plans[currentPlan]?.price}/month
                          </span>
                        </>
                      ) : (
                        <span className="font-medium text-gray-600 capitalize">{subscription.status}</span>
                      )}
                    </span>
                  </div>
                  {subscription.currentPeriodEnd && (
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">
                        {subscription.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on{' '}
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {isActive && !subscription.cancelAtPeriodEnd && (
                <button
                  onClick={() => setShowCancelDialog(true)}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-300 hover:border-red-400 rounded-md transition-colors"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
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
                <h3 className="text-sm font-medium text-green-900">30-Day Free Trial Active</h3>
                <p className="mt-1 text-sm text-green-700">
                  Your trial ends on {new Date(subscription.trialEndsAt).toLocaleDateString()}. 
                  Your monthly subscription will start automatically after the trial. Cancel anytime before then.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Plans */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(plans).map(([planKey, plan]) => {
              const isCurrentPlan = currentPlan === planKey && isActive;
              
              return (
                <div
                  key={planKey}
                  className={`bg-white rounded-lg shadow-sm border-2 ${
                    plan.popular 
                      ? 'border-green-500 relative' 
                      : isCurrentPlan 
                      ? 'border-green-500' 
                      : 'border-gray-200'
                  } p-6 flex flex-col`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                      MOST POPULAR
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                      CURRENT PLAN
                    </div>
                  )}
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600">/month</span>
                    <p className="text-sm text-gray-500 mt-1">
                      ${plan.setup} one-time setup fee
                    </p>
                  </div>
                  
                  <ul className="space-y-3 mb-6 flex-grow">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <button
                    onClick={() => handleUpgrade(planKey)}
                    disabled={isCurrentPlan || processingCheckout}
                    className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                      isCurrentPlan
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : plan.popular
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {isCurrentPlan ? 'Current Plan' : processingCheckout ? 'Processing...' : 'Get Started'}
                  </button>
                  
                  <p className="text-xs text-gray-500 text-center mt-3">
                    Setup fee charged today • 30 days free trial
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">When will I be charged?</h3>
              <p className="text-sm text-gray-600 mt-1">
                The one-time setup fee is charged immediately when you sign up. Your monthly subscription starts with a 30-day free trial. After the trial ends, you'll be charged the monthly subscription fee.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Can I cancel anytime?</h3>
              <p className="text-sm text-gray-600 mt-1">
                Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your current billing period.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Can I upgrade or downgrade my plan?</h3>
              <p className="text-sm text-gray-600 mt-1">
                Yes, you can change your plan at any time. Changes will be prorated based on your billing cycle.
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
