import { useState } from 'react';
import { Link2, Copy, Check, ExternalLink } from 'lucide-react';

/**
 * Professional modal for displaying invitation links when email fails
 * Part of the Merxus design system
 */
export default function InvitationLinkModal({ 
  isOpen, 
  onClose, 
  invitationLink, 
  email,
  tenantType = 'account'
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(invitationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenLink = () => {
    window.location.href = invitationLink;
  };

  const getTenantName = () => {
    switch (tenantType) {
      case 'restaurant': return 'Restaurant';
      case 'voice': return 'Office';
      case 'real_estate': return 'Agent';
      default: return 'Account';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full transform transition-all">
          {/* Header with Merxus branding */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-xl">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <Link2 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                {getTenantName()} Created Successfully!
              </h3>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-amber-800">
                    The invitation email could not be sent automatically. Please use the link below to set up your password.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900">
                {email}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password Setup Link
              </label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 overflow-hidden text-ellipsis">
                  {invitationLink}
                </div>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  title="Copy link"
                >
                  {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
              {copied && (
                <p className="mt-1 text-xs text-green-600">✓ Link copied to clipboard!</p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> You can open the link directly or copy it to share with the account owner.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end space-x-3 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleOpenLink}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center space-x-2"
            >
              <span>Open Setup Link</span>
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
