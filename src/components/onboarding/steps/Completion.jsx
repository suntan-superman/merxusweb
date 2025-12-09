import { useState } from 'react';
import { CheckCircle2, LogIn, ExternalLink } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export default function Completion({ tenantType, businessName, ownerEmail, ownerPassword, onSwitchToOwner }) {
  const { userClaims } = useAuth();
  const [switchingUser, setSwitchingUser] = useState(false);
  
  // Check if current user is super_admin/merxus
  const isSuperAdmin = userClaims?.role === 'super_admin' || userClaims?.type === 'merxus';

  const handleSwitchToOwner = async () => {
    setSwitchingUser(true);
    await onSwitchToOwner();
    // onSwitchToOwner will handle the actual login and redirect
  };
  // Get dashboard path based on tenant type
  const getDashboardPath = () => {
    const paths = {
      restaurant: '/restaurant/dashboard',
      real_estate: '/estate/dashboard',
      voice: '/voice/dashboard',
      general: '/dashboard',
    };
    return paths[tenantType] || '/dashboard';
  };

  // Get action text based on tenant type
  const getActionText = () => {
    if (tenantType === 'restaurant') return 'Add Your Menu';
    if (tenantType === 'real_estate') return 'Add Your Listings';
    if (tenantType === 'voice') return 'Configure Routing';
    return 'Configure Settings';
  };

  return (
    <div className="py-4">
      <div className="text-center mb-8">
        {/* Success Animation */}
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center animate-bounce">
          <CheckCircle2 size={56} className="text-white" />
        </div>
        
        <h3 className="text-3xl font-bold text-gray-900 mb-2">🎉 Setup Complete!</h3>
        <p className="text-lg text-gray-600 mb-1">
          {businessName ? `${businessName} is` : 'Your business is'} ready to go
        </p>
        <p className="text-sm text-gray-500">Your AI assistant is live and taking calls</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Success Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">✓</div>
            <p className="text-xs text-green-700 font-medium">AI Configured</p>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">✓</div>
            <p className="text-xs text-green-700 font-medium">Phone Connected</p>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">✓</div>
            <p className="text-xs text-green-700 font-medium">Account Created</p>
          </div>
        </div>

        {/* Super Admin: Choice to continue as owner OR go to dashboard */}
        {isSuperAdmin ? (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-6">
              <h4 className="font-bold text-gray-900 mb-2 text-lg">Ready to Finish Setup?</h4>
              <p className="text-gray-700 mb-4">
                The account has been created successfully. To complete setup and add data ({getActionText().toLowerCase()}), 
                you can log in as the new owner.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Continue as Owner Button */}
                <button
                  onClick={handleSwitchToOwner}
                  disabled={switchingUser}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {switchingUser ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Switching User...</span>
                    </>
                  ) : (
                    <>
                      <LogIn size={20} />
                      <span>Continue as Owner</span>
                    </>
                  )}
                </button>

                {/* View as Admin Button */}
                <button
                  onClick={() => window.location.href = getDashboardPath()}
                  className="flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                >
                  <ExternalLink size={20} />
                  <span>View as Admin</span>
                </button>
              </div>

              <p className="text-xs text-gray-600 mt-3 text-center">
                💡 <strong>Tip:</strong> "Continue as Owner" lets you add {getActionText().toLowerCase()} right away
              </p>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-sm text-blue-900">
              <p className="font-semibold mb-1">Owner Credentials:</p>
              <p className="text-blue-700 font-mono text-xs">
                Email: {ownerEmail}<br />
                Password: {ownerPassword}
              </p>
              <p className="text-xs text-blue-600 mt-2">
                ℹ️ The owner can reset their password using the invitation email
              </p>
            </div>
          </div>
        ) : (
          /* Regular Owner: Just go to dashboard */
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-6 text-center">
            <h4 className="font-bold text-gray-900 mb-3 text-lg">What's Next?</h4>
            <p className="text-gray-700 mb-4">
              Your AI is ready to take calls! Head to your dashboard to {getActionText().toLowerCase()} and explore all features.
            </p>
            <button
              onClick={() => window.location.href = getDashboardPath()}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg"
            >
              <ExternalLink size={20} />
              <span>Go to Dashboard</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
