const Features = () => {
  const features = [
    {
      title: 'Instant Call Answering',
      description: 'Never miss a call again. Our AI answers every call instantly, 24/7.',
      icon: '📞',
    },
    {
      title: 'Reservation Management',
      description: 'Handles reservations and waitlist management automatically.',
      icon: '📅',
    },
    {
      title: 'Order Taking',
      description: 'Takes takeout and pickup orders with menu knowledge.',
      icon: '🍽️',
    },
    {
      title: 'Menu Questions',
      description: 'Answers menu and dietary questions accurately.',
      icon: '📋',
    },
    {
      title: 'Catering & Events',
      description: 'Handles catering and event inquiries professionally.',
      icon: '🎉',
    },
    {
      title: 'After-Hours Support',
      description: 'Handles after-hours calls and voicemail messages.',
      icon: '🌙',
    },
    {
      title: 'SMS Summaries',
      description: 'Sends SMS/email summaries to owners and managers.',
      icon: '📱',
    },
    {
      title: 'Customizable',
      description: 'Customize voice, tone, and call-handling rules to match your brand.',
      icon: '⚙️',
    },
  ];

  return (
    <div className="w-full px-4 py-16 dark:bg-slate-950">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h1 className="mb-6 text-4xl font-bold text-gray-900 md:text-5xl dark:text-slate-100">
            Powerful Features for Your Restaurant
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-gray-700 dark:text-slate-300">
            Everything you need to handle customer calls professionally and efficiently
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="card hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-slate-100">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-slate-300">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-lg bg-primary-50 p-8 dark:bg-slate-800 dark:ring-1 dark:ring-slate-700">
          <h2 className="mb-4 text-center text-2xl font-bold text-gray-900 dark:text-slate-100">
            Why Choose Merxus?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center mt-1">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <p className="ml-3 text-gray-700 dark:text-slate-300">
                Designed specifically for independent and small-chain restaurants
              </p>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center mt-1">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <p className="ml-3 text-gray-700 dark:text-slate-300">
                No hardware required – works with your existing phone number
              </p>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center mt-1">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <p className="ml-3 text-gray-700 dark:text-slate-300">
                Fast onboarding with a restaurant profile form
              </p>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center mt-1">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <p className="ml-3 text-gray-700 dark:text-slate-300">
                Ongoing improvements without retraining your staff
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Features;

