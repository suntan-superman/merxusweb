import { Link } from 'react-router-dom';
import TenantSelector from '../components/TenantSelector';

const Home = () => {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-white pt-12 pb-2 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
            AI Phone Assistant for Your Business
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 mb-2">
            24/7 Virtual Receptionist that Answers Calls, Handles Inquiries, and Never Misses a Customer
          </p>
          {/* <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
            <Link to="#choose-service" className="btn-primary text-lg px-8 py-3">
              Get Started Free
            </Link>
            <Link to="/features" className="btn-secondary text-lg px-8 py-3">
              Learn More
            </Link>
          </div> */}
        </div>
      </section>

      {/* Tenant Selection Section */}
      <section id="choose-service" className="bg-white">
        <TenantSelector />
      </section>

      {/* Problem Section */}
      <section className="pt-8 pb-8 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 text-center">
            The Problem
          </h2>
          <p className="text-lg text-gray-700 text-center max-w-2xl mx-auto">
            Businesses lose customers every day due to missed calls, long hold times, and overwhelmed staff. Every unanswered call is a lost opportunity.
          </p>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-8 px-4 bg-primary-50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 text-center">
            The Solution
          </h2>
          <p className="text-lg text-gray-700 text-center max-w-2xl mx-auto mb-8">
            An AI phone receptionist that answers every call instantly, handles common requests, and only involves staff when needed.
          </p>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-8 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              'Answers all calls instantly',
              'Handles reservations & waitlist',
              'Takes takeout / pickup orders',
              'Answers menu & dietary questions',
              'Handles catering & event inquiries',
              'After-hours & voicemail handling',
              'Sends SMS/email summaries to owner/manager',
            ].map((feature, index) => (
              <div key={index} className="card">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <p className="ml-3 text-gray-700">{feature}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-8 px-4 bg-primary-50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
            Benefits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              'Never miss a customer call again',
              'Reduce front-of-house workload',
              'Increase reservations and orders',
              'Deliver consistent, professional phone etiquette',
              'Free up staff to focus on in-person guests',
              'Affordable alternative to hiring additional staff',
            ].map((benefit, index) => (
              <div key={index} className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center mt-1">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
                <p className="ml-3 text-gray-700 text-lg">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-8 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
            How It Works
          </h2>
          <div className="space-y-8">
            {[
              { step: 1, text: "Customer calls your business phone number" },
              { step: 2, text: 'The AI receptionist answers immediately' },
              { step: 3, text: 'It handles inquiries, routing, and requests using your business rules' },
              { step: 4, text: 'It transfers to a human or sends an SMS summary when needed' },
              { step: 5, text: 'You receive simple reports on calls, messages, and inquiries' },
            ].map((item) => (
              <div key={item.step} className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    {item.step}
                  </div>
                </div>
                <p className="ml-4 text-gray-700 text-lg pt-2">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 text-primary-100">
            Try it free for 14 days – cancel anytime
          </p>
          <Link to="#choose-service" className="btn-secondary bg-white text-primary-600 hover:bg-primary-50 inline-block">
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;

