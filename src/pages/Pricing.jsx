import { Link } from 'react-router-dom';

export default function Pricing() {
  const plans = [
    {
      name: 'Starter',
      price: '$199',
      period: '/month',
      description: 'Perfect for small restaurants getting started',
      features: [
        'AI Phone Receptionist',
        'Unlimited calls & orders',
        'Basic order management',
        'Customer CRM',
        'Email notifications',
        'Mobile & web access',
      ],
      popular: false,
    },
    {
      name: 'Professional',
      price: '$299',
      period: '/month',
      description: 'For growing restaurants with multiple locations',
      features: [
        'Everything in Starter',
        'Advanced analytics',
        'SMS notifications',
        'Team management (up to 5 users)',
        'Priority support',
        'Custom integrations',
      ],
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large restaurant groups and franchises',
      features: [
        'Everything in Professional',
        'Unlimited team members',
        'Multi-location management',
        'Dedicated account manager',
        'Custom AI training',
        'API access',
        'White-label options',
      ],
      popular: false,
    },
  ];

  const addOns = [
    {
      name: 'POS Integration',
      description: 'Connect with Square, Toast, Clover, or other POS systems',
      price: '$49/month',
      features: ['Automatic menu sync', 'Order synchronization', 'Real-time inventory updates'],
    },
    {
      name: 'Advanced Analytics',
      description: 'Deep insights and reporting',
      price: '$29/month',
      features: ['Custom reports', 'Revenue analytics', 'Customer insights', 'Performance dashboards'],
    },
    {
      name: 'Multi-Location',
      description: 'Manage multiple restaurant locations',
      price: '$99/month per location',
      features: ['Centralized dashboard', 'Location-specific settings', 'Unified reporting'],
    },
    {
      name: 'Priority Support',
      description: '24/7 priority support with faster response times',
      price: '$79/month',
      features: ['Phone support', 'Guaranteed 1-hour response', 'Dedicated support channel'],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br to-white from-primary-50">
      <div className="container px-4 py-16 mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-gray-600">
            Choose the plan that fits your restaurant. All plans include our AI phone receptionist.
          </p>
        </div>

        {/* Onboarding Section */}
        <div className="mx-auto mb-12 max-w-4xl">
          <div className="p-8 bg-white rounded-lg border-2 shadow-lg border-primary-200">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="flex justify-center items-center w-12 h-12 rounded-full bg-primary-100">
                  <span className="text-2xl">🚀</span>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="mb-2 text-2xl font-bold text-gray-900">One-Time Onboarding Fee</h2>
                <p className="mb-4 text-lg font-semibold text-primary-600">$299 one-time setup fee</p>
                <p className="mb-4 text-gray-700">
                  Get your restaurant up and running quickly with our comprehensive onboarding service.
                </p>
                <ul className="mb-6 space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="mr-2 text-primary-600">✓</span>
                    <span>Complete account setup and configuration</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary-600">✓</span>
                    <span>Menu import and optimization</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary-600">✓</span>
                    <span>Email account linking and notification setup</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary-600">✓</span>
                    <span>SMS notification configuration</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary-600">✓</span>
                    <span>Business hours and timezone setup</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary-600">✓</span>
                    <span>Team member account creation (up to 3 users)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary-600">✓</span>
                    <span>Training session for your team</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary-600">✓</span>
                    <span>POS integration assistance (if applicable)</span>
                  </li>
                </ul>
                <p className="text-sm italic text-gray-600">
                  * Onboarding fee is waived for annual plans or Enterprise customers
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 gap-8 mx-auto mb-16 max-w-6xl md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-lg shadow-lg p-8 border-2 ${
                plan.popular
                  ? 'border-primary-600 transform scale-105 relative'
                  : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="px-4 py-1 text-sm font-semibold text-white rounded-full bg-primary-600">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="mb-6 text-center">
                <h3 className="mb-2 text-2xl font-bold text-gray-900">{plan.name}</h3>
                <div className="flex justify-center items-baseline mb-2">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && (
                    <span className="ml-2 text-gray-600">{plan.period}</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{plan.description}</p>
              </div>
              <ul className="mb-8 space-y-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="mr-2 text-primary-600">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/onboarding"
                className={`block w-full text-center py-3 px-6 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-primary-600 hover:bg-primary-700 text-white'
                    : 'bg-primary-50 hover:bg-primary-100 text-primary-700'
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>

        {/* Add-Ons Section */}
        <div className="mx-auto mb-12 max-w-6xl">
          <div className="mb-8 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">Add-On Services</h2>
            <p className="text-gray-600">
              Enhance your plan with additional features and integrations
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {addOns.map((addon, idx) => (
              <div key={idx} className="p-6 bg-white rounded-lg border border-gray-200 shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="mb-1 text-xl font-semibold text-gray-900">{addon.name}</h3>
                    <p className="mb-3 text-sm text-gray-600">{addon.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary-600">{addon.price}</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {addon.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start text-sm text-gray-700">
                      <span className="mr-2 text-primary-600">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Charges Section */}
        <div className="mx-auto mb-12 max-w-4xl">
          <div className="p-8 bg-gray-50 rounded-lg border border-gray-200">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Additional Charges & Fees</h2>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">POS Integration Setup</h3>
                <p className="mb-2 text-gray-700">
                  One-time setup fee for connecting your POS system: <strong>$149</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Includes API configuration, initial menu sync, and testing. Monthly POS integration subscription is separate.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">Custom Integrations</h3>
                <p className="mb-2 text-gray-700">
                  Custom API integrations or third-party connections: <strong>$199-$499</strong> (one-time)
                </p>
                <p className="text-sm text-gray-600">
                  Pricing depends on complexity. Contact us for a custom quote.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">Additional Team Members</h3>
                <p className="mb-2 text-gray-700">
                  Beyond included users: <strong>$9/user/month</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Starter plan includes 2 users, Professional includes 5 users, Enterprise includes unlimited.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">SMS Notifications</h3>
                <p className="mb-2 text-gray-700">
                  SMS notifications: <strong>$0.02 per message</strong> or included in Professional+ plans
                </p>
                <p className="text-sm text-gray-600">
                  Professional and Enterprise plans include up to 1,000 SMS per month. Additional messages charged per message.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">Data Export & Backup</h3>
                <p className="mb-2 text-gray-700">
                  One-time data export: <strong>$49</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Automated daily backups included. Custom export formats available.
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
              <h3 className="mb-2 font-semibold text-gray-900">Is the onboarding fee required?</h3>
              <p className="text-gray-700">
                The $299 onboarding fee is required for monthly plans. It's waived for annual subscriptions and Enterprise customers. 
                This fee covers setup, training, and configuration to get you started quickly.
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-2 font-semibold text-gray-900">Can I change plans later?</h3>
              <p className="text-gray-700">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-2 font-semibold text-gray-900">What's included in POS integration?</h3>
              <p className="text-gray-700">
                POS integration includes automatic menu synchronization, order import/export, and real-time inventory updates. 
                Setup fee is $149 one-time, plus $49/month subscription. We support Square, Toast, Clover, and custom integrations.
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="mb-2 font-semibold text-gray-900">Do you offer discounts for annual plans?</h3>
              <p className="text-gray-700">
                Yes! Annual plans receive 15% off monthly pricing and the onboarding fee is waived. Contact us for Enterprise pricing.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">Ready to Get Started?</h2>
          <p className="mb-8 text-gray-600">
            Schedule a 15-minute demo to see Merxus in action
          </p>
          <div className="flex flex-col gap-4 justify-center sm:flex-row">
            <Link to="/onboarding" className="btn-primary">
              Start Free Trial
            </Link>
            <Link to="/features" className="btn-secondary">
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
