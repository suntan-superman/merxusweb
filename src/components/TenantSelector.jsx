import { Link } from 'react-router-dom';

/**
 * TenantSelector Component
 * Allows users to choose between Restaurant and Voice (Office) services
 */
export default function TenantSelector() {
  return (
    <div className="pt-12 pb-16 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Choose Your Service
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select the Merxus service that best fits your business needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Restaurant Option */}
          <div className="group relative bg-white border-2 border-gray-200 rounded-lg p-8 hover:border-primary-500 hover:shadow-lg transition-all duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary-200 transition-colors">
                <span className="text-3xl">🍽️</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Merxus Restaurant
              </h3>
              <p className="text-gray-600 mb-6">
                AI-powered phone assistant for restaurants
              </p>
              <ul className="text-left space-y-2 text-sm text-gray-700 mb-6">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Menu management & ordering</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Reservation booking</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>24/7 call answering</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Order & reservation tracking</span>
                </li>
              </ul>
              <Link
                to="/onboarding?type=restaurant"
                className="btn-primary w-full text-center"
              >
                Get Started
              </Link>
            </div>
          </div>

          {/* Voice/Office Option */}
          <div className="group relative bg-white border-2 border-gray-200 rounded-lg p-8 hover:border-primary-500 hover:shadow-lg transition-all duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary-200 transition-colors">
                <span className="text-3xl">📞</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Merxus Voice
              </h3>
              <p className="text-gray-600 mb-6">
                AI receptionist for small businesses
              </p>
              <ul className="text-left space-y-2 text-sm text-gray-700 mb-6">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Smart call routing</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Voicemail management</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Call forwarding</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>24/7 professional answering</span>
                </li>
              </ul>
              <Link
                to="/onboarding?type=voice"
                className="btn-primary w-full text-center"
              >
                Get Started
              </Link>
            </div>
          </div>

          {/* Real Estate Option */}
          <div className="group relative bg-white border-2 border-gray-200 rounded-lg p-8 hover:border-primary-500 hover:shadow-lg transition-all duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary-200 transition-colors">
                <span className="text-3xl">🏡</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Merxus Real Estate
              </h3>
              <p className="text-gray-600 mb-6">
                AI assistant for real estate agents
              </p>
              <ul className="text-left space-y-2 text-sm text-gray-700 mb-6">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Listing inquiries & search</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Showing scheduling</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Lead qualification</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Bilingual support</span>
                </li>
              </ul>
              <Link
                to="/onboarding?type=real_estate"
                className="btn-primary w-full text-center"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            Not sure which service is right for you?{' '}
            <Link to="/features" className="text-primary-600 hover:text-primary-700 font-medium">
              Compare features
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

