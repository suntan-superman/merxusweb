import { useState } from 'react';

export default function CallHQModal() {
  const [isOpen, setIsOpen] = useState(false);
  const phoneNumber = '833-309-4212';

  const handleOpenModal = () => {
    setIsOpen(true);
  };

  const handleCall = () => {
    setIsOpen(false);
    window.location.href = `tel:${phoneNumber.replace(/-/g, '')}`;
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Phone Icon Button */}
      <button
        onClick={handleOpenModal}
        className="p-2 text-gray-600 hover:text-primary-600 transition-colors"
        title="Call Merxus HQ"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-blue-100">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Call Merxus HQ
            </h3>
            
            <p className="text-gray-600 text-center mb-6">
              Connect with our support team at
            </p>
            
            <div className="text-center mb-6">
              <p className="text-2xl font-bold text-primary-600">
                {phoneNumber}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                24/7 AI Assistant Support
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCall}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Call Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
