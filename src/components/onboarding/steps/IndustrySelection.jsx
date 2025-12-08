import { Building2, Utensils, Phone, Briefcase } from 'lucide-react';

const INDUSTRIES = [
  {
    id: 'restaurant',
    name: 'Restaurant',
    icon: Utensils,
    description: 'Take orders, manage reservations, answer menu questions',
    features: ['Phone orders', 'Reservations', 'Menu Q&A', 'POS integration'],
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    hoverBorder: 'hover:border-orange-400',
  },
  {
    id: 'real_estate',
    name: 'Real Estate',
    icon: Building2,
    description: 'Schedule showings, send flyers, qualify leads automatically',
    features: ['Showing scheduling', 'Flyer emails', 'Lead qualification', 'Property info'],
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    hoverBorder: 'hover:border-blue-400',
  },
  {
    id: 'voice',
    name: 'Professional Office',
    icon: Phone,
    description: 'Route calls, take messages, schedule appointments',
    features: ['Call routing', 'Voicemail', 'Scheduling', 'Multi-user'],
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    hoverBorder: 'hover:border-purple-400',
  },
  {
    id: 'general',
    name: 'General Business',
    icon: Briefcase,
    description: 'Custom AI assistant for any business type',
    features: ['Custom prompts', 'Flexible setup', 'Any industry', 'Tailored responses'],
    color: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    hoverBorder: 'hover:border-gray-400',
  },
];

export default function IndustrySelection({ selectedIndustry, onSelect }) {
  return (
    <div className="py-4">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Industry</h3>
        <p className="text-gray-600">Select the option that best describes your business</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {INDUSTRIES.map((industry) => {
          const Icon = industry.icon;
          const isSelected = selectedIndustry === industry.id;

          return (
            <button
              key={industry.id}
              onClick={() => onSelect(industry.id)}
              className={`relative p-5 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-green-500 bg-green-50 shadow-lg shadow-green-500/20 scale-[1.02]'
                  : `${industry.borderColor} ${industry.bgColor} ${industry.hoverBorder} hover:shadow-md`
              }`}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg font-bold">✓</span>
                </div>
              )}

              {/* Icon */}
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${industry.color} flex items-center justify-center mb-3 shadow-md`}>
                <Icon className="text-white" size={24} />
              </div>

              {/* Title */}
              <h4 className="text-lg font-bold text-gray-900 mb-1">{industry.name}</h4>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-3">{industry.description}</p>

              {/* Features */}
              <div className="flex flex-wrap gap-1.5">
                {industry.features.map((feature, index) => (
                  <span
                    key={index}
                    className={`text-xs px-2 py-1 rounded-full ${
                      isSelected
                        ? 'bg-green-100 text-green-700'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Help Text */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          💡 Don't worry, you can customize your AI assistant after setup
        </p>
      </div>
    </div>
  );
}
