import { CheckCircle2, ArrowRight, Settings, Phone, BarChart3, Book } from 'lucide-react';

export default function Completion({ tenantType, businessName }) {
  // Get dashboard path based on tenant type
  const getDashboardPath = () => {
    const paths = {
      restaurant: '/dashboard',
      real_estate: '/estate/dashboard',
      voice: '/voice/dashboard',
      general: '/dashboard',
    };
    return paths[tenantType] || '/dashboard';
  };

  // Get industry-specific next steps
  const getNextSteps = () => {
    if (tenantType === 'restaurant') {
      return [
        { icon: Settings, text: 'Upload your menu', description: 'Let customers order by phone' },
        { icon: Phone, text: 'Test phone ordering', description: 'Make a test call to place an order' },
        { icon: BarChart3, text: 'View call analytics', description: 'Track orders and reservations' },
      ];
    }
    if (tenantType === 'real_estate') {
      return [
        { icon: Settings, text: 'Add your listings', description: 'Upload properties and flyers' },
        { icon: Phone, text: 'Test showing scheduler', description: 'Call to schedule a property showing' },
        { icon: BarChart3, text: 'View lead dashboard', description: 'Track inquiries and showings' },
      ];
    }
    if (tenantType === 'voice') {
      return [
        { icon: Settings, text: 'Invite team members', description: 'Add users for call routing' },
        { icon: Phone, text: 'Configure routing rules', description: 'Set up call forwarding' },
        { icon: BarChart3, text: 'View call analytics', description: 'Track calls and messages' },
      ];
    }
    return [
      { icon: Settings, text: 'Customize AI prompts', description: 'Tailor responses to your needs' },
      { icon: Phone, text: 'Test your AI', description: 'Make a call to try it out' },
      { icon: BarChart3, text: 'View analytics', description: 'Track performance' },
    ];
  };

  const nextSteps = getNextSteps();

  return (
    <div className="py-4">
      <div className="text-center mb-8">
        {/* Success Animation */}
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center animate-bounce">
          <CheckCircle2 size={56} className="text-white" />
        </div>
        
        <h3 className="text-3xl font-bold text-gray-900 mb-2">🎉 You're All Set!</h3>
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
            <p className="text-xs text-green-700 font-medium">Ready to Use</p>
          </div>
        </div>

        {/* Next Steps */}
        <div>
          <h4 className="font-bold text-gray-900 mb-3 text-center">Recommended Next Steps</h4>
          <div className="space-y-3">
            {nextSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="bg-white border-2 border-gray-200 rounded-xl p-4 flex items-start gap-4 hover:border-green-300 hover:bg-green-50 transition-all">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{step.text}</p>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                  <ArrowRight size={20} className="text-gray-400 flex-shrink-0 mt-1" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Resources */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
          <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
            <Book size={18} />
            Helpful Resources
          </h4>
          <div className="space-y-2 text-sm text-blue-800">
            <a href="#" className="flex items-center gap-2 hover:text-blue-900 transition-colors">
              <span>📖</span>
              <span>Getting Started Guide</span>
            </a>
            <a href="#" className="flex items-center gap-2 hover:text-blue-900 transition-colors">
              <span>🎥</span>
              <span>Video Tutorials</span>
            </a>
            <a href="#" className="flex items-center gap-2 hover:text-blue-900 transition-colors">
              <span>💬</span>
              <span>Join Community</span>
            </a>
            <a href="#" className="flex items-center gap-2 hover:text-blue-900 transition-colors">
              <span>📧</span>
              <span>Contact Support</span>
            </a>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Ready to see your AI in action?
          </p>
          <div className="text-xs text-gray-500">
            Click "Go to Dashboard" below to get started
          </div>
        </div>
      </div>
    </div>
  );
}
