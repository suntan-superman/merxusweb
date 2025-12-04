import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedTenantType, setSelectedTenantType] = useState('restaurant');

  // Real Estate Pricing Plans
  const realEstatePlans = [
    {
      name: 'Basic',
      price: '$49',
      period: '/month',
      setupFee: '$49',
      description: 'Perfect for individual real estate agents',
      features: [
        'Basic AI Assistant',
        '1 phone number',
        'Standard support',
        'Call routing',
        'Lead capture',
        'Email notifications',
      ],
      popular: false,
      tenantType: 'real_estate',
    },
    {
      name: 'Professional',
      price: '$79',
      period: '/month',
      setupFee: '$99',
      description: 'For agents who need advanced features',
      features: [
        'Enhanced AI Assistant with Routing',
        '1 phone number',
        'Scheduling integration',
        'Advanced lead management',
        'Priority support',
        'Analytics dashboard',
        'SMS notifications',
      ],
      popular: true,
      tenantType: 'real_estate',
    },
  ];

  // Voice/Office Pricing Plans
  const voicePlans = [
    {
      name: 'Basic',
      price: '$49',
      period: '/month',
      setupFee: '$49',
      description: 'Perfect for small businesses getting started',
      features: [
        'Basic AI Assistant',
        '1 phone number',
        'Standard support',
        'Call routing',
        'Voicemail transcription',
        'Email notifications',
      ],
      popular: false,
      tenantType: 'voice',
    },
    {
      name: 'Professional',
      price: '$99',
      period: '/month',
      setupFee: '$149',
      description: 'For growing businesses with multiple needs',
      features: [
        'Enhanced AI Assistant with Routing',
        '3 phone numbers',
        'Priority support',
        'Analytics dashboard',
        'Advanced call routing',
        'SMS notifications',
        'Custom greetings',
      ],
      popular: true,
      tenantType: 'voice',
    },
    {
      name: 'Enterprise',
      price: '$199',
      period: '/month',
      setupFee: '$249',
      description: 'For businesses requiring advanced capabilities',
      features: [
        'Enhanced AI Assistant with Routing',
        '5 phone numbers',
        'Priority support',
        'Advanced analytics',
        'API access',
        'Custom integrations',
        'Dedicated account manager',
        'White-label options',
      ],
      popular: false,
      tenantType: 'voice',
    },
  ];

  // Restaurant Pricing Plans
  const restaurantPlans = [
    {
      name: 'Basic',
      price: '$199',
      period: '/month',
      setupFee: '$299',
      description: 'Perfect for restaurants getting started',
      features: [
        'Basic AI Assistant with Order and Reservation Taking',
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
    {
      name: 'Enterprise',
      price: '$499',
      period: '/month',
      setupFee: '$999',
      description: 'For restaurants with POS integration needs',
      features: [
        'Basic AI Assistant with Order and Reservation Taking',
        'POS integration (Toast/Square, etc)',
        '5 phone numbers',
        'Priority support',
        'Advanced analytics',
        'Automated menu sync',
        'Real-time order synchronization',
        'Multi-location support',
        'API access',
        'Dedicated account manager',
      ],
      popular: true,
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

  return (
    <div className="min-h-screen bg-gradient-to-br to-white from-primary-50">
      <div className="container px-4 py-16 mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-gray-600">
            Choose the plan that fits your business. All plans include our AI phone assistant.
          </p>
        </div>

        {/* Tenant Type Selector */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <button
            onClick={() => setSelectedTenantType('restaurant')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              selectedTenantType === 'restaurant'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-primary-300'
            }`}
          >
            Restaurants
          </button>
          <button
            onClick={() => setSelectedTenantType('voice')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              selectedTenantType === 'voice'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-primary-300'
            }`}
          >
            Small Business
          </button>
          <button
            onClick={() => setSelectedTenantType('real_estate')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              selectedTenantType === 'real_estate'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-primary-300'
            }`}
          >
            Real Estate
          </button>
        </div>

        {/* Pricing Plans */}
        <div className={`grid grid-cols-1 gap-8 mx-auto mb-16 ${
          plans.length === 2 
            ? 'max-w-4xl md:grid-cols-2' 
            : 'max-w-6xl md:grid-cols-3'
        }`}>
          {plans.map((plan, idx) => (
            <div
              key={`${plan.tenantType}-${plan.name}-${idx}`}
              className={`bg-white rounded-lg shadow-lg p-8 border-2 ${
                plan.popular
                  ? 'border-primary-600 transform scale-105 relative'
                  : 'border-gray-200'
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
                <h3 className="mb-2 text-2xl font-bold text-gray-900">{plan.name}</h3>
                <div className="flex flex-col items-center justify-center mb-2">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    {plan.period && (
                      <span className="ml-2 text-gray-600">{plan.period}</span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-semibold">Setup Fee: </span>
                    <span>{plan.setupFee} one-time</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{plan.description}</p>
              </div>
              
              <ul className="mb-8 space-y-3 min-h-[200px]">
                {plan.features.map((feature, fIdx) => (
                  <li key={fIdx} className="flex items-start">
                    <span className="mr-2 text-primary-600">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {user ? (
                <button
                  onClick={() => {
                    try {
                      navigate('/restaurant');
                    } catch (error) {
                      console.error('Navigation error:', error);
                      window.location.href = '/restaurant';
                    }
                  }}
                  className={`block w-full text-center py-3 px-6 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-primary-600 hover:bg-primary-700 text-white'
                      : 'bg-primary-50 hover:bg-primary-100 text-primary-700'
                  }`}
                >
                  Go to Dashboard
                </button>
              ) : (
                <Link
                  to={`/onboarding?type=${plan.tenantType}&plan=${plan.name.toLowerCase()}`}
                  className={`block w-full text-center py-3 px-6 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-primary-600 hover:bg-primary-700 text-white'
                      : 'bg-primary-50 hover:bg-primary-100 text-primary-700'
                  }`}
                >
                  Get Started
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Setup Fee Information */}
        <div className="mx-auto mb-12 max-w-4xl">
          <div className="p-8 bg-white rounded-lg border-2 shadow-lg border-primary-200">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="flex justify-center items-center w-12 h-12 rounded-full bg-primary-100">
                  <span className="text-2xl">🚀</span>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="mb-2 text-2xl font-bold text-gray-900">One-Time Setup Fee</h2>
                <p className="mb-4 text-gray-700">
                  All plans include a one-time setup fee that covers comprehensive onboarding and configuration to get you started quickly.
                </p>
                <ul className="mb-6 space-y-2 text-gray-700">
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
                    <span>Training session for your team</span>
                  </li>
                  {selectedTenantType === 'restaurant' && (
                    <>
                      <li className="flex items-start">
                        <span className="mr-2 text-primary-600">✓</span>
                        <span>Menu import and optimization (if applicable)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-primary-600">✓</span>
                        <span>POS integration assistance (Enterprise plan)</span>
                      </li>
                    </>
                  )}
                </ul>
                <p className="text-sm italic text-gray-600">
                  * Setup fee varies by plan. See pricing above for specific amounts.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mx-auto mb-12 max-w-4xl">
          <h2 className="mb-6 text-2xl font-bold text-center text-gray-900">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-2 font-semibold text-gray-900">Is the setup fee required?</h3>
              <p className="text-gray-700">
                Yes, the setup fee is required for all plans and covers comprehensive onboarding, configuration, 
                and training to get you started quickly. Setup fees vary by plan type and tier.
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-2 font-semibold text-gray-900">Can I change plans later?</h3>
              <p className="text-gray-700">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle. 
                Setup fees may apply when upgrading to a higher tier.
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-2 font-semibold text-gray-900">What's included in POS integration?</h3>
              <p className="text-gray-700">
                POS integration (Restaurant Enterprise plan) includes automatic menu synchronization, 
                order import/export, and real-time inventory updates. We support Toast, Square, Clover, and other major POS systems.
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-2 font-semibold text-gray-900">Do you offer a free trial?</h3>
              <p className="text-gray-700">
                Yes! All plans include a 30-day free trial. The one-time setup fee is charged upfront, then you have 30 days to try the service before monthly billing begins. 
                You can explore all features and cancel anytime during the trial.
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-2 font-semibold text-gray-900">What happens after my trial ends?</h3>
              <p className="text-gray-700">
                After your 30-day trial, your monthly subscription will automatically begin. Your card on file will be charged the monthly subscription fee. 
                You can cancel anytime before the trial ends to avoid being charged. We'll send you reminders before your trial ends.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">Ready to Get Started?</h2>
          <p className="mb-8 text-gray-600">
            Start your 30-day free trial today. Setup fee charged upfront, monthly billing starts after trial.
          </p>
          <div className="flex flex-col gap-4 justify-center sm:flex-row">
            {user ? (
              <button
                onClick={() => {
                  try {
                    navigate('/restaurant');
                  } catch (error) {
                    console.error('Navigation error:', error);
                    window.location.href = '/restaurant';
                  }
                }}
                className="inline-block px-8 py-3 text-lg font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <Link 
                  to="/onboarding" 
                  className="inline-block px-8 py-3 text-lg font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors text-center"
                >
                  Get Started
                </Link>
                <Link 
                  to="/" 
                  className="inline-block px-8 py-3 text-lg font-semibold text-primary-700 bg-white border-2 border-primary-300 rounded-lg hover:bg-primary-50 transition-colors text-center"
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
