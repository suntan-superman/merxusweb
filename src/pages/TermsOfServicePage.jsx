import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/login" 
            className="text-green-600 hover:text-green-700 mb-4 inline-block"
          >
            ← Back to Login
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Terms of Service
          </h1>
          <p className="text-gray-600">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. Agreement to Terms
            </h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing or using the Merxus AI Phone Assistant platform (the "Service"), operated by 
              Workside Software LLC ("Merxus," "we," "us," or "our"), you agree to be bound by these 
              Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use 
              the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Description of Service
            </h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              Merxus provides an AI-powered phone assistant platform that helps businesses manage 
              incoming calls, schedule appointments, take orders, generate leads, and provide 24/7 
              customer service. The Service includes:
            </p>
            <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
              <li>AI voice assistant with natural language processing</li>
              <li>Call transcription and recording</li>
              <li>Lead and customer management</li>
              <li>Real-time analytics and reporting</li>
              <li>Integration with third-party services (Twilio, Google Maps, etc.)</li>
              <li>Mobile and web applications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Account Registration and Security
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  3.1 Account Creation
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  To use the Service, you must create an account by providing accurate and complete 
                  information. You are responsible for maintaining the confidentiality of your account 
                  credentials and for all activities that occur under your account.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  3.2 Account Security
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  You agree to:
                </p>
                <ul className="list-disc list-inside text-gray-700 ml-4 mt-2 space-y-1">
                  <li>Immediately notify us of any unauthorized use of your account</li>
                  <li>Use a strong password and keep it secure</li>
                  <li>Not share your account credentials with others</li>
                  <li>Be responsible for all activities under your account</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  3.3 Age Requirement
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  You must be at least 18 years old to use the Service. By using the Service, you 
                  represent and warrant that you meet this age requirement.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Subscription and Payment
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  4.1 Subscription Plans
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  The Service is offered on a subscription basis. Subscription plans, pricing, and 
                  features are described on our website and may be updated from time to time.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  4.2 Payment Terms
                </h3>
                <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
                  <li>Subscription fees are billed in advance on a monthly or annual basis</li>
                  <li>All fees are non-refundable except as required by law</li>
                  <li>You authorize us to charge your payment method on a recurring basis</li>
                  <li>You are responsible for providing accurate and current payment information</li>
                  <li>We reserve the right to suspend or terminate your account for non-payment</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  4.3 Price Changes
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  We may change our subscription fees at any time. We will provide you with reasonable 
                  advance notice of any fee changes, and you will have the opportunity to cancel your 
                  subscription before the new fees take effect.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  4.4 Cancellation
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  You may cancel your subscription at any time. Cancellation will take effect at the 
                  end of your current billing period. You will continue to have access to the Service 
                  until the end of your paid subscription period.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Acceptable Use Policy
            </h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
              <li>Violate any laws, regulations, or third-party rights</li>
              <li>Send spam, unsolicited communications, or engage in harassment</li>
              <li>Upload or transmit malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
              <li>Use the Service for illegal telemarketing or robocalling</li>
              <li>Impersonate any person or entity</li>
              <li>Collect or harvest data from the Service without permission</li>
              <li>Use the Service in any way that could harm our reputation or business</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Intellectual Property Rights
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  6.1 Our Intellectual Property
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  The Service and its original content, features, and functionality are owned by 
                  Workside Software LLC and are protected by international copyright, trademark, 
                  patent, trade secret, and other intellectual property laws.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  6.2 Your Content
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  You retain ownership of any content you upload to the Service (e.g., menus, 
                  listings, business information). By uploading content, you grant us a worldwide, 
                  non-exclusive, royalty-free license to use, reproduce, modify, and display your 
                  content solely for the purpose of providing the Service to you.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  6.3 Feedback
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  If you provide us with feedback, suggestions, or ideas about the Service, you grant 
                  us the right to use such feedback without any obligation to you.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Third-Party Services and Integrations
            </h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              The Service integrates with third-party services including:
            </p>
            <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
              <li>Twilio (telephony services)</li>
              <li>OpenAI (AI and language processing)</li>
              <li>Google Maps (location services)</li>
              <li>Firebase (authentication and data storage)</li>
              <li>Stripe (payment processing)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Your use of these third-party services is subject to their respective terms of service 
              and privacy policies. We are not responsible for the actions or policies of third-party 
              service providers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Disclaimer of Warranties
            </h2>
            <p className="text-gray-700 leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
              WHETHER EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO 
              IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND 
              NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, 
              OR COMPLETELY SECURE.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Limitation of Liability
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WORKSIDE SOFTWARE LLC SHALL NOT BE LIABLE FOR 
              ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF 
              PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, 
              GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
            <p className="text-gray-700 leading-relaxed">
              IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL DAMAGES EXCEED THE AMOUNT YOU PAID 
              TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Indemnification
            </h2>
            <p className="text-gray-700 leading-relaxed">
              You agree to indemnify, defend, and hold harmless Workside Software LLC, its officers, 
              directors, employees, and agents from any claims, liabilities, damages, losses, and 
              expenses (including reasonable attorneys' fees) arising out of or related to your use 
              of the Service, violation of these Terms, or violation of any rights of another party.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Termination
            </h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              We may suspend or terminate your access to the Service at any time, with or without 
              cause or notice, including if:
            </p>
            <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
              <li>You violate these Terms</li>
              <li>You fail to pay applicable fees</li>
              <li>We believe your use poses a security risk</li>
              <li>We are required to do so by law</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Upon termination, your right to use the Service will immediately cease, and we may 
              delete your account and data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              12. Dispute Resolution and Arbitration
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  12.1 Informal Resolution
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  If you have a dispute with us, you agree to first contact us and attempt to resolve 
                  the dispute informally by contacting our support team at support@merxusllc.com.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  12.2 Binding Arbitration
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  If we cannot resolve the dispute informally, any dispute arising out of or relating 
                  to these Terms or the Service will be resolved through binding arbitration in 
                  accordance with the rules of the American Arbitration Association. The arbitration 
                  will be conducted in English and will take place in California, United States.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  12.3 Class Action Waiver
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  You agree that any arbitration or legal proceeding will be conducted on an individual 
                  basis and not as a class action, and you waive your right to participate in a class 
                  action lawsuit or class-wide arbitration.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              13. Governing Law
            </h2>
            <p className="text-gray-700 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the State 
              of California, United States, without regard to its conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              14. Changes to Terms
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify you of material 
              changes by email or by posting a notice on our website. Your continued use of the Service 
              after such changes constitutes your acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              15. Severability
            </h2>
            <p className="text-gray-700 leading-relaxed">
              If any provision of these Terms is found to be unenforceable or invalid, that provision 
              will be limited or eliminated to the minimum extent necessary, and the remaining 
              provisions will remain in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              16. Entire Agreement
            </h2>
            <p className="text-gray-700 leading-relaxed">
              These Terms, together with our Privacy Policy, constitute the entire agreement between 
              you and Workside Software LLC regarding the Service and supersede all prior agreements 
              and understandings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              17. Contact Information
            </h2>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about these Terms, please contact us:
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-gray-700">
                <strong>Email:</strong> <a href="mailto:support@merxusllc.com" className="text-green-600 hover:text-green-700">support@merxusllc.com</a>
              </p>
              <p className="text-gray-700">
                <strong>Service:</strong> Merxus AI Phone Assistant Platform
              </p>
              <p className="text-gray-700">
                <strong>Company:</strong> Workside Software LLC
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>© {new Date().getFullYear()} Workside Software LLC. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
