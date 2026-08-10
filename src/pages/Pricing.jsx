import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBillingPricing } from '../api/billing';

const DISPLAY_PRICING = {
  voice: {
    basic: { price: '$49', setupFee: '$49' },
  },
  real_estate: {
    basic: { price: '$49', setupFee: '$49' },
  },
  restaurant: {
    basic: { price: '$299', setupFee: '$499' },
  },
};

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTenantType = searchParams.get('type');
  const initialTenantType = ['voice', 'real_estate', 'restaurant'].includes(requestedTenantType)
    ? requestedTenantType
    : 'voice';
  const [selectedTenantType, setSelectedTenantType] = useState(initialTenantType);
  const [pricingData, setPricingData] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(true);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        setPricingLoading(true);
        const data = await getBillingPricing();
        setPricingData(data);
      } catch (error) {
        console.error('Failed to load pricing:', error);
      } finally {
        setPricingLoading(false);
      }
    };

    loadPricing();
  }, []);

  useEffect(() => {
    if (['voice', 'real_estate', 'restaurant'].includes(requestedTenantType)) {
      setSelectedTenantType(requestedTenantType);
    }
  }, [requestedTenantType]);

  const selectTenantType = (tenantType) => {
    setSelectedTenantType(tenantType);
    setSearchParams({ type: tenantType }, { replace: true });
  };

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

  const getDynamicPrice = (plan) => {
    const pricingKey = plan.tenantType === 'voice' ? 'office' : plan.tenantType;
    const tierPricing = pricingData?.displayPlans?.[pricingKey]?.find((item) => item.tier === plan.tier);
    const amount = tierPricing?.subscriptionUnitAmount;
    const currency = tierPricing?.currency;
    return formatMoney(amount, currency) || plan.price;
  };

  const getDynamicSetupFee = (plan) => {
    const pricingKey = plan.tenantType === 'voice' ? 'office' : plan.tenantType;
    const tierPricing = pricingData?.displayPlans?.[pricingKey]?.find((item) => item.tier === plan.tier);
    const amount = tierPricing?.onboardingUnitAmount;
    const currency = tierPricing?.currency;
    return formatMoney(amount, currency) || plan.setupFee;
  };

  // Stripe currently has one active billable offering for each tenant type.
  const realEstatePlans = [
    {
      name: 'Merxus Real Estate',
      tier: 'basic',
      price: DISPLAY_PRICING.real_estate.basic.price,
      period: '/month',
      setupFee: DISPLAY_PRICING.real_estate.basic.setupFee,
      description: 'AI call handling and lead capture for real estate professionals',
      features: [
        'Merxus AI Assistant',
        '1 phone number',
        'Standard support',
        'Call routing',
        'Lead capture',
        'Email notifications',
      ],
      popular: false,
      tenantType: 'real_estate',
    },
  ];

  const voicePlans = [
    {
      name: 'Merxus Office',
      tier: 'basic',
      price: DISPLAY_PRICING.voice.basic.price,
      period: '/month',
      setupFee: DISPLAY_PRICING.voice.basic.setupFee,
      description: 'AI front-desk call handling for offices and professional services',
      features: [
        'Merxus AI Assistant',
        '1 phone number',
        'Standard support',
        'Call routing',
        'Voicemail transcription',
        'Email notifications',
      ],
      popular: false,
      tenantType: 'voice',
    },
  ];

  const restaurantPlans = [
    {
      name: 'Merxus Restaurant',
      tier: 'basic',
      price: DISPLAY_PRICING.restaurant.basic.price,
      period: '/month',
      setupFee: DISPLAY_PRICING.restaurant.basic.setupFee,
      description: 'AI phone assistance for restaurant orders and reservations',
      features: [
        'Merxus AI Assistant with Order and Reservation Taking',
        '3 phone numbers',
        'Priority support',
        'Analytics dashboard',
        'Order management',
        'Reservation management',
        'Customer CRM',
        'Email & SMS notifications',
      ],
      popular: false,
      tenantType: 'restaurant',
    },
  ];

  // Get plans based on selected tenant type
  const getPlans = () => {
    switch (selectedTenantType) {
      case 'real_estate':
        return realEstatePlans;
      case 'voice':
        return voicePlans;
      case 'restaurant':
        return restaurantPlans;
      default:
        return restaurantPlans; // Default to restaurant
    }
  };

  const plans = getPlans();
  const trainingSession = pricingData?.addOns?.trainingSession;
  const trainingPrice = formatMoney(
    trainingSession?.unitAmount ?? 7500,
    trainingSession?.currency || 'usd',
  );
  const dashboardPath = {
    voice: '/voice',
    real_estate: '/estate',
    restaurant: '/restaurant',
  }[selectedTenantType] || '/';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="container px-4 py-16 mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-slate-100">
            Simple, Transparent Pricing
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-gray-600 dark:text-slate-300">
            Choose your business type. Each service includes a dedicated Merxus AI phone assistant.
          </p>
          {pricingLoading && (
            <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">Confirming current Stripe pricing…</p>
          )}
        </div>

        {/* Tenant Type Selector */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <button
            onClick={() => selectTenantType('voice')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              selectedTenantType === 'voice'
                ? 'bg-primary-600 text-white'
                : 'border-2 border-gray-200 bg-white text-gray-700 hover:border-primary-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            Office
          </button>
          <button
            onClick={() => selectTenantType('real_estate')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              selectedTenantType === 'real_estate'
                ? 'bg-primary-600 text-white'
                : 'border-2 border-gray-200 bg-white text-gray-700 hover:border-primary-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            Real Estate
          </button>
          <button
            onClick={() => selectTenantType('restaurant')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              selectedTenantType === 'restaurant'
                ? 'bg-primary-600 text-white'
                : 'border-2 border-gray-200 bg-white text-gray-700 hover:border-primary-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            Restaurants
          </button>
        </div>

        {/* Pricing Plans */}
        <div className={`grid grid-cols-1 gap-8 mx-auto mb-16 ${
          plans.length === 1
            ? 'max-w-xl'
            : plans.length === 2
            ? 'max-w-4xl md:grid-cols-2' 
            : 'max-w-6xl md:grid-cols-3'
        }`}>
          {plans.map((plan, idx) => (
            <div
              key={`${plan.tenantType}-${plan.name}-${idx}`}
              className={`rounded-lg border-2 bg-white p-8 shadow-lg dark:bg-slate-900 ${
                plan.popular
                  ? 'border-primary-600 transform scale-105 relative'
                  : 'border-gray-200 dark:border-slate-700'
              }`}
            >
              {/* Tenant Type Badge */}
              <div className="mb-4">
                <span className="px-3 py-1 text-xs font-semibold text-primary-700 bg-primary-100 rounded-full">
                  {plan.tenantType === 'real_estate' ? 'Real Estate' : 
                   plan.tenantType === 'voice' ? 'Small Business' : 
                   'Restaurant'}
                </span>
              </div>

              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="px-4 py-1 text-sm font-semibold text-white rounded-full bg-primary-600">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="mb-6 text-center">
                <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-slate-100">{plan.name}</h3>
                <div className="flex flex-col items-center justify-center mb-2">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900 dark:text-slate-100">{getDynamicPrice(plan)}</span>
                    {plan.period && (
                      <span className="ml-2 text-gray-600 dark:text-slate-300">{plan.period}</span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-gray-600 dark:text-slate-300">
                    <span className="font-semibold">Setup Fee: </span>
                    <span>{getDynamicSetupFee(plan)} one-time</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-300">{plan.description}</p>
              </div>
              
              <ul className="mb-8 space-y-3 min-h-[200px]">
                {plan.features.map((feature, fIdx) => (
                  <li key={fIdx} className="flex items-start">
                    <span className="mr-2 text-primary-600">✓</span>
                    <span className="text-gray-700 dark:text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {user ? (
                <button
                  onClick={() => {
                    try {
                      navigate(dashboardPath);
                    } catch (error) {
                      console.error('Navigation error:', error);
                      window.location.href = dashboardPath;
                    }
                  }}
                  className={`block w-full text-center py-3 px-6 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-primary-600 hover:bg-primary-700 text-white'
                      : 'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-slate-800 dark:text-primary-300 dark:hover:bg-slate-700'
                  }`}
                >
                  Go to Dashboard
                </button>
              ) : (
                <Link
                  to={`/onboarding?type=${plan.tenantType}&plan=basic`}
                  className={`block w-full text-center py-3 px-6 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-primary-600 hover:bg-primary-700 text-white'
                      : 'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-slate-800 dark:text-primary-300 dark:hover:bg-slate-700'
                  }`}
                >
                  Get Started
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Optional Training */}
        <div className="mx-auto mb-12 max-w-4xl">
          <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-8 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Optional add-on
                </p>
                <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">Merxus Training Session</h2>
                <p className="mt-2 text-gray-700 dark:text-slate-300">
                  A 30-minute guided session for paid assistance beyond the onboarding guidance included with setup.
                </p>
              </div>
              <div className="shrink-0 text-center sm:text-right">
                <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{trainingPrice}</p>
                <p className="text-sm text-gray-600 dark:text-slate-400">per 30-minute session</p>
                <a
                  href="mailto:support@merxus.ai?subject=Merxus%20Training%20Session"
                  className="mt-3 inline-block rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-700"
                >
                  Request Training
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Setup Fee Information */}
        <div className="mx-auto mb-12 max-w-4xl">
          <div className="rounded-lg border-2 border-primary-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="flex justify-center items-center w-12 h-12 rounded-full bg-primary-100">
                  <span className="text-2xl">🚀</span>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-slate-100">One-Time Setup Fee</h2>
                <p className="mb-4 text-gray-700 dark:text-slate-300">
                  Each tenant service includes a one-time setup fee that covers onboarding and configuration to get you started quickly.
                </p>
                <ul className="mb-6 space-y-2 text-gray-700 dark:text-slate-300">
                  <li className="flex items-start">
                    <span className="mr-2 text-primary-600">✓</span>
                    <span>Complete account setup and configuration</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary-600">✓</span>
                    <span>Phone number provisioning and setup</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary-600">✓</span>
                    <span>AI assistant training and customization</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary-600">✓</span>
                    <span>Email and SMS notification configuration</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary-600">✓</span>
                    <span>Business hours and timezone setup</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary-600">✓</span>
                    <span>Team member account creation</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary-600">✓</span>
                    <span>Custom training sessions are available</span>
                  </li>
                  {selectedTenantType === 'restaurant' && (
                    <li className="flex items-start">
                      <span className="mr-2 text-primary-600">✓</span>
                      <span>Menu import and optimization (if applicable)</span>
                    </li>
                  )}
                </ul>
                <p className="text-sm italic text-gray-600 dark:text-slate-400">
                  * Setup fees vary by tenant service. See the current amount above.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mx-auto mb-12 max-w-4xl">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-900 dark:text-slate-100">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="rounded-lg bg-white p-6 shadow-md dark:bg-slate-900 dark:ring-1 dark:ring-slate-700">
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-slate-100">Is the setup fee required?</h3>
              <p className="text-gray-700 dark:text-slate-300">
                Yes. It covers onboarding and initial configuration. Optional 30-minute training sessions beyond the included guidance are {trainingPrice} each.
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-md dark:bg-slate-900 dark:ring-1 dark:ring-slate-700">
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-slate-100">Can I change services later?</h3>
              <p className="text-gray-700 dark:text-slate-300">
                Contact Merxus support if your business type or requirements change. We will review any billing or setup impact with you before making changes.
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-md dark:bg-slate-900 dark:ring-1 dark:ring-slate-700">
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-slate-100">Can I purchase additional help?</h3>
              <p className="text-gray-700 dark:text-slate-300">
                Yes. Merxus Training Sessions provide 30 minutes of guided assistance beyond onboarding for {trainingPrice} per session.
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-md dark:bg-slate-900 dark:ring-1 dark:ring-slate-700">
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-slate-100">Do you offer a free trial?</h3>
              <p className="text-gray-700 dark:text-slate-300">
                Yes! Each service includes a 30-day free trial. The one-time setup fee is charged upfront, then you have 30 days to try the service before monthly billing begins.
                You can explore all features and cancel anytime during the trial.
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-md dark:bg-slate-900 dark:ring-1 dark:ring-slate-700">
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-slate-100">What happens after my trial ends?</h3>
              <p className="text-gray-700 dark:text-slate-300">
                After your 30-day trial, your monthly subscription will automatically begin. Your card on file will be charged the monthly subscription fee. 
                You can cancel anytime before the trial ends to avoid being charged. We'll send you reminders before your trial ends.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-slate-100">Ready to Get Started?</h2>
          <p className="mb-8 text-gray-600 dark:text-slate-300">
            Start your 30-day free trial today. Setup fee charged upfront, monthly billing starts after trial.
          </p>
          <div className="flex flex-col gap-4 justify-center sm:flex-row">
            {user ? (
              <button
                onClick={() => {
                  try {
                    navigate(dashboardPath);
                  } catch (error) {
                    console.error('Navigation error:', error);
                    window.location.href = dashboardPath;
                  }
                }}
                className="inline-block px-8 py-3 text-lg font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <Link 
                  to={`/onboarding?type=${selectedTenantType}`}
                  className="inline-block px-8 py-3 text-lg font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors text-center"
                >
                  Get Started
                </Link>
                <Link 
                  to="/" 
                  className="inline-block rounded-lg border-2 border-primary-300 bg-white px-8 py-3 text-center text-lg font-semibold text-primary-700 transition-colors hover:bg-primary-50 dark:border-slate-600 dark:bg-slate-900 dark:text-primary-300 dark:hover:bg-slate-800"
                >
                  Learn More
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
