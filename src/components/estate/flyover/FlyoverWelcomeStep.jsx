export default function FlyoverWelcomeStep() {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-4xl">🏠</span>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-3">Welcome to Merxus AI!</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Let's get your AI assistant set up in just a few minutes. We'll walk you through 
        personalizing your brand, configuring your phone, and importing your listings.
      </p>
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 max-w-sm mx-auto">
        <p className="text-sm text-primary-800">
          <strong>⏱️ Estimated time:</strong> 5-10 minutes
        </p>
        <p className="text-sm text-primary-700 mt-1">
          You can save and continue later at any time.
        </p>
      </div>
    </div>
  );
}
