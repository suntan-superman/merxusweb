import { Check } from 'lucide-react';

export default function FlyoverCompleteStep() {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check size={40} className="text-primary-600" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-3">You're All Set! 🎉</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Your AI assistant is ready to help manage your real estate business. 
        Calls to your Twilio number will now be handled by your personalized AI.
      </p>
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 max-w-sm mx-auto text-left">
        <h4 className="font-semibold text-primary-900 mb-2">Quick Links:</h4>
        <ul className="text-sm text-primary-800 space-y-1">
          <li>📊 <a href="/estate/dashboard" className="underline hover:text-primary-600">Dashboard</a> - View your activity</li>
          <li>🏠 <a href="/estate/listings" className="underline hover:text-primary-600">Listings</a> - Manage properties</li>
          <li>📞 <a href="/estate/calls" className="underline hover:text-primary-600">Calls</a> - Review AI conversations</li>
          <li>⚙️ <a href="/estate/settings" className="underline hover:text-primary-600">Settings</a> - Adjust your preferences</li>
        </ul>
      </div>
    </div>
  );
}
