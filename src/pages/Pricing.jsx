const Pricing = () => {
  const plans = [
    {
      name: 'Starter',
      price: '$49',
      period: '/mo',
      description: 'Perfect for small restaurants getting started',
      features: [
        'Basic answering service',
        'Hours information',
        'Menu questions',
        'Directions assistance',
      ],
      popular: false,
    },
    {
      name: 'Standard',
      price: '$99',
      period: '/mo',
      description: 'Most popular for growing restaurants',
      features: [
        'Everything in Starter',
        'Reservations handling',
        'Simple order taking',
        'SMS summaries',
      ],
      popular: true,
    },
    {
      name: 'Premium',
      price: '$199',
      period: '/mo',
      description: 'Advanced features for busy restaurants',
      features: [
        'Everything in Standard',
        'Advanced call flows',
        'Detailed reporting',
        'Custom integrations',
      ],
      popular: false,
    },
  ];

  return (
    <div className="w-full py-16 px-4 bg-gradient-to-br from-primary-50 to-white">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Choose the plan that works best for your restaurant
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`card relative ${
                plan.popular
                  ? 'border-2 border-primary-600 shadow-lg scale-105'
                  : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center mb-2">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-gray-600 ml-1">{plan.period}</span>
                </div>
                <p className="text-gray-600">{plan.description}</p>
              </div>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <svg
                      className="w-5 h-5 text-primary-600 mr-2 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}
              >
                Get Started
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-lg text-gray-700 mb-4">
            All plans include a 14-day free trial. Cancel anytime.
          </p>
          <p className="text-gray-600">
            No credit card required to start your free trial.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;

