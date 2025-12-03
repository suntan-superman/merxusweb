import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  EnvelopeIcon, 
  PhoneIcon, 
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const projectId = 'merxus-f0872';
      const functionUrl = `https://us-central1-${projectId}.cloudfunctions.net/submitSupportRequest`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitStatus('success');
        // Reset form
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setSubmitStatus('error');
        console.error('Support request error:', data.error);
      }
    } catch (error) {
      console.error('Error submitting support request:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
      // Clear status after 5 seconds
      setTimeout(() => {
        setSubmitStatus(null);
      }, 5000);
    }
  };

  const faqs = [
    {
      question: 'How do I reset my password?',
      answer: 'If you forgot your password, please contact support at support@merxusllc.com and we will help you reset it.'
    },
    {
      question: 'How do I set up my AI phone assistant?',
      answer: 'After logging in, go to Settings to configure your business information, hours of operation, and customize your AI assistant\'s responses. You can also set up call forwarding from your Settings page.'
    },
    {
      question: 'How do I view my call history?',
      answer: 'All calls are visible in the Calls page of your dashboard. You can see transcripts, caller information, and call outcomes. Filter by date range or search for specific calls.'
    },
    {
      question: 'How do I manage leads (Real Estate)?',
      answer: 'Real estate agents can view all leads captured by the AI assistant in the Leads page. Each lead includes caller information, property interests, and callback requests.'
    },
    {
      question: 'How do I manage reservations (Restaurants)?',
      answer: 'Restaurant owners can view and manage reservations in the Reservations page. The AI assistant captures party size, date/time, and special requests automatically.'
    },
    {
      question: 'How do I set up call forwarding?',
      answer: 'Go to Settings and find the Call Forwarding section. You\'ll see your Merxus phone number and instructions for forwarding calls from your carrier. The mobile app also has a dedicated Call Forwarding screen.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-12 mx-auto max-w-4xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/login" 
            className="inline-block mb-4 text-green-600 hover:text-green-700"
          >
            ← Back to Login
          </Link>
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Support & Help Center
          </h1>
          <p className="text-gray-600">
            Get help with Merxus AI Phone Assistant Platform
          </p>
        </div>

        {/* Contact Methods */}
        <div className="p-8 mb-8 bg-white rounded-lg shadow-sm">
          <h2 className="mb-6 text-2xl font-semibold text-gray-900">
            Contact Us
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex items-start">
              <EnvelopeIcon className="flex-shrink-0 mt-1 mr-3 w-6 h-6 text-green-600" />
              <div>
                <h3 className="mb-1 font-medium text-gray-900">Email Support</h3>
                <a 
                  href="mailto:support@merxusllc.com" 
                  className="text-green-600 hover:text-green-700"
                >
                  support@merxusllc.com
                </a>
                <p className="mt-1 text-sm text-gray-600">
                  We typically respond within 24 hours
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <DocumentTextIcon className="flex-shrink-0 mt-1 mr-3 w-6 h-6 text-green-600" />
              <div>
                <h3 className="mb-1 font-medium text-gray-900">Documentation</h3>
                <Link 
                  to="/privacy-policy" 
                  className="text-green-600 hover:text-green-700"
                >
                  Privacy Policy
                </Link>
                <p className="mt-1 text-sm text-gray-600">
                  Review our privacy policy and terms
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="p-8 mb-8 bg-white rounded-lg shadow-sm">
          <h2 className="flex items-center mb-6 text-2xl font-semibold text-gray-900">
            <ChatBubbleLeftRightIcon className="mr-2 w-6 h-6 text-green-600" />
            Send Us a Message
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="name" className="block mb-1 text-sm font-medium text-gray-700">
                  Your Name *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-3 py-2 w-full rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label htmlFor="email" className="block mb-1 text-sm font-medium text-gray-700">
                  Your Email *
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="px-3 py-2 w-full rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="subject" className="block mb-1 text-sm font-medium text-gray-700">
                Subject *
              </label>
              <input
                type="text"
                id="subject"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Password Reset, Feature Request, Bug Report"
                className="px-3 py-2 w-full rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label htmlFor="message" className="block mb-1 text-sm font-medium text-gray-700">
                Message *
              </label>
              <textarea
                id="message"
                required
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Please describe your issue or question in detail..."
                className="px-3 py-2 w-full rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>
            {submitStatus === 'success' && (
              <div className="p-3 text-sm text-green-800 bg-green-50 rounded-md border border-green-200">
                ✓ Your support request has been submitted successfully! We've sent a confirmation email and will respond within 24 hours.
              </div>
            )}
            {submitStatus === 'error' && (
              <div className="p-3 text-sm text-red-800 bg-red-50 rounded-md border border-red-200">
                ✗ There was an error submitting your request. Please try again or email us directly at support@merxusllc.com
              </div>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 w-full text-white bg-green-600 rounded-md md:w-auto hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Opening Email...' : 'Send Message'}
            </button>
          </form>
        </div>

        {/* FAQ Section */}
        <div className="p-8 bg-white rounded-lg shadow-sm">
          <h2 className="flex items-center mb-6 text-2xl font-semibold text-gray-900">
            <QuestionMarkCircleIcon className="mr-2 w-6 h-6 text-green-600" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="pb-4 border-b border-gray-200 last:border-b-0">
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  {faq.question}
                </h3>
                <p className="leading-relaxed text-gray-700">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="p-8 mt-8 bg-white rounded-lg shadow-sm">
          <h2 className="mb-4 text-2xl font-semibold text-gray-900">
            Quick Links
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Link 
              to="/login" 
              className="p-4 rounded-md border border-gray-200 transition-colors hover:border-green-500 hover:bg-green-50"
            >
              <h3 className="mb-1 font-medium text-gray-900">Login to Your Account</h3>
              <p className="text-sm text-gray-600">Access your dashboard and manage your business</p>
            </Link>
            <Link 
              to="/signup" 
              className="p-4 rounded-md border border-gray-200 transition-colors hover:border-green-500 hover:bg-green-50"
            >
              <h3 className="mb-1 font-medium text-gray-900">Create an Account</h3>
              <p className="text-sm text-gray-600">Sign up for Merxus AI phone assistant</p>
            </Link>
            <Link 
              to="/privacy-policy" 
              className="p-4 rounded-md border border-gray-200 transition-colors hover:border-green-500 hover:bg-green-50"
            >
              <h3 className="mb-1 font-medium text-gray-900">Privacy Policy</h3>
              <p className="text-sm text-gray-600">Learn how we protect your data and privacy</p>
            </Link>
            <a 
              href="mailto:support@merxusllc.com" 
              className="p-4 rounded-md border border-gray-200 transition-colors hover:border-green-500 hover:bg-green-50"
            >
              <h3 className="mb-1 font-medium text-gray-900">Email Support</h3>
              <p className="text-sm text-gray-600">Get help from our support team</p>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-sm text-center text-gray-600">
          <p>© {new Date().getFullYear()} Workside Software LLC. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

