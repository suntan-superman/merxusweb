import { useState } from 'react';
import { Link } from 'react-router-dom';
import TenantSelector from '../components/TenantSelector';

const Home = () => {
  const [showDemoVideo, setShowDemoVideo] = useState(false);

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-white px-4 pb-2 pt-12 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <div className="container max-w-4xl mx-auto text-center">
          <h1 className="mb-6 text-3xl font-bold text-neutral-900 md:text-5xl dark:text-slate-100">
            AI Phone Assistant for Your Business
          </h1>
          <p className="mb-2 text-xl text-neutral-700 md:text-2xl dark:text-slate-300">
            24/7 Virtual Receptionist that Answers Calls, Handles Inquiries, and Never Misses a Customer
          </p>
          {/* <div className="flex flex-col justify-center gap-4 mb-4 sm:flex-row">
            <Link to="#choose-service" className="px-8 py-3 text-lg btn-primary">
              Get Started Free
            </Link>
            <Link to="/features" className="px-8 py-3 text-lg btn-secondary">
              Learn More
            </Link>
          </div> */}
        </div>
      </section>

      {/* Demo Video Section */}
      <section className="bg-white px-4 py-8 dark:bg-slate-900">
        <div className="container max-w-4xl mx-auto">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-900 md:text-3xl dark:text-slate-100">
            What Is Merxus AI?
          </h2>
          <div className="relative overflow-hidden rounded-lg shadow-xl">
            {showDemoVideo ? (
              <video
                controls
                autoPlay
                preload="metadata"
                className="w-full"
                poster="/videos/poster.png"
                crossOrigin="anonymous"
              >
                <source src="/videos/Merxus_AI_Demo.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <button
                type="button"
                onClick={() => setShowDemoVideo(true)}
                className="group relative block w-full"
                aria-label="Load demo video"
              >
                <img
                  src="/videos/poster.png"
                  alt="Merxus AI demo preview"
                  className="w-full"
                  loading="lazy"
                />
                <span className="absolute inset-0 bg-black/30 transition group-hover:bg-black/40" />
                <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-white/95 px-5 py-3 text-sm font-semibold text-neutral-900 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-1 dark:ring-slate-700">
                  Load Demo Video
                </span>
              </button>
            )}
          </div>
          {!showDemoVideo && (
            <p className="mt-2 text-center text-xs text-gray-500 dark:text-slate-400">
              Video loads on demand to keep page load fast.
            </p>
          )}
        </div>
      </section>

      {/* Tenant Selection Section */}
      <section id="choose-service" className="bg-white dark:bg-slate-900">
        <TenantSelector />
      </section>

      {/* Problem Section */}
      <section className="bg-white px-4 pb-8 pt-8 dark:bg-slate-900">
        <div className="container max-w-4xl mx-auto">
          <h2 className="mb-6 text-center text-3xl font-bold text-gray-900 md:text-4xl dark:text-slate-100">
            The Problem
          </h2>
          <p className="mx-auto max-w-2xl text-center text-lg text-gray-700 dark:text-slate-300">
            Businesses lose customers every day due to missed calls, long hold times, and overwhelmed staff. Every unanswered call is a lost opportunity.
          </p>
        </div>
      </section>

      {/* Solution Section */}
      <section className="bg-primary-50 px-4 py-8 dark:bg-slate-800">
        <div className="container max-w-4xl mx-auto">
          <h2 className="mb-6 text-center text-3xl font-bold text-gray-900 md:text-4xl dark:text-slate-100">
            The Solution
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-center text-lg text-gray-700 dark:text-slate-300">
            An AI phone receptionist that answers every call instantly, handles common requests, and only involves staff when needed.
          </p>
        </div>
      </section>

      {/* Key Features */}
      <section className="bg-white px-4 py-8 dark:bg-slate-900">
        <div className="container max-w-6xl mx-auto">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 md:text-4xl dark:text-slate-100">
            Key Features
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100">
                      <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <p className="ml-3 text-gray-700 dark:text-slate-300">{feature}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-primary-50 px-4 py-8 dark:bg-slate-800">
        <div className="container max-w-4xl mx-auto">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 md:text-4xl dark:text-slate-100">
            Benefits
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                  <div className="flex items-center justify-center w-6 h-6 mt-1 rounded-full bg-primary-600">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
                <p className="ml-3 text-lg text-gray-700 dark:text-slate-300">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white px-4 py-8 dark:bg-slate-900">
        <div className="container max-w-4xl mx-auto">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 md:text-4xl dark:text-slate-100">
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
                  <div className="flex items-center justify-center w-12 h-12 text-lg font-bold text-white rounded-full bg-primary-600">
                    {item.step}
                  </div>
                </div>
                <p className="pt-2 ml-4 text-lg text-gray-700 dark:text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 text-white bg-gradient-to-br from-primary-600 to-primary-700">
        <div className="container max-w-4xl mx-auto text-center">
          <h2 className="mb-6 text-3xl font-bold md:text-4xl">
            Ready to Get Started?
          </h2>
          <p className="mb-8 text-xl text-primary-100">
            Try it free for 14 days – cancel anytime
          </p>
          <Link to="#choose-service" className="inline-block bg-white btn-secondary text-primary-600 hover:bg-primary-50">
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;

