import { Play, Pause } from 'lucide-react';

// Voice options
const VOICES = [
  {
    id: 'alloy',
    name: 'Alloy',
    gender: 'Neutral',
    description: 'Balanced and professional',
    personality: 'Professional, clear, versatile',
  },
  {
    id: 'echo',
    name: 'Echo',
    gender: 'Male',
    description: 'Warm and friendly',
    personality: 'Welcoming, approachable',
  },
  {
    id: 'ballad',
    name: 'Ballad',
    gender: 'Male',
    description: 'Confident and authoritative',
    personality: 'Authoritative, trustworthy',
  },
  {
    id: 'coral',
    name: 'Coral',
    gender: 'Female',
    description: 'Bright and energetic',
    personality: 'Energetic, enthusiastic',
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    gender: 'Female',
    description: 'Soft and gentle',
    personality: 'Gentle, patient, caring',
  },
];

// Real estate prompt templates
const PROMPT_TEMPLATES = [
  {
    id: 'standard_agent',
    title: 'Standard Real Estate Agent',
    prompt: `You are speaking on behalf of a professional real estate agent. Use a warm, confident, and knowledgeable tone at all times. Your goal is to assist callers, capture their needs, and present the agent as a trusted partner in buying or selling a home.

Highlight:
• Extensive knowledge of neighborhoods, market trends, and property values
• Strong negotiation skills and excellent communication
• Experience guiding buyers, sellers, and investors

If callers ask about listings, you may discuss general availability.
If you don't have specific data, say: "The agent will follow up shortly with exact details."

Do NOT provide legal, financial, or mortgage advice.`
  },
  {
    id: 'luxury_specialist',
    title: 'Luxury Real Estate Specialist',
    prompt: `You are speaking on behalf of a luxury real estate specialist. Use a polished, elegant, and highly professional tone. Make callers feel valued and in good hands.

Highlight:
• Expertise in luxury communities and high-end properties
• Discretion, confidentiality, and white-glove service
• Successful history with high-value clients

If callers ask about properties, speak only in general terms.
If details are needed, say: "The specialist will personally follow up with complete information."

Do NOT disclose sensitive information or invent property details.`
  },
  {
    id: 'first_time_buyer',
    title: 'First-Time Homebuyer Specialist',
    prompt: `You are speaking on behalf of a real estate agent who specializes in first-time homebuyers. Use an encouraging, friendly tone and simplify complex information.

Highlight:
• Step-by-step guidance throughout the buying process
• Clear explanations of pre-approval, offers, escrow, and closing
• Knowledge of affordable neighborhoods and starter homes

If callers have questions, reassure them and gather their needs.

Do NOT give mortgage qualification or financial guarantees.`
  },
  {
    id: 'investor_specialist',
    title: 'Investor-Focused Agent',
    prompt: `You are speaking on behalf of a real estate agent who specializes in investment properties. Use a strategic, opportunity-focused tone.

Highlight:
• Deep knowledge of ROI, cap rates, and market trends
• Experience with multi-family, commercial, and rental properties
• Network of contractors, property managers, and lenders

If callers ask about specific deals, gather their criteria and schedule follow-up.

Do NOT provide guaranteed returns or financial projections.`
  },
  {
    id: 'custom',
    title: 'Custom (Write Your Own)',
    prompt: ''
  }
];

export default function FlyoverVoiceStep({ formData, playingVoice, onChange, onPlayVoice }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-gray-900">Choose Your AI Voice</h3>
        <p className="text-gray-600 text-sm">Select the voice that represents your brand</p>
      </div>

      <div className="space-y-2">
        {VOICES.map((voice) => {
          const isSelected = formData.aiVoice === voice.id;
          const isPlaying = playingVoice === voice.id;

          return (
            <div
              key={voice.id}
              onClick={() => onChange('aiVoice', voice.id)}
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                isSelected
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{voice.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {voice.gender}
                  </span>
                  {isSelected && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500 text-white">
                      ✓ Selected
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{voice.description}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayVoice(voice.id);
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isPlaying
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-primary-100 hover:text-primary-600'
                }`}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            AI Personality Template
          </label>
          <select
            value={formData.promptTemplate || 'standard_agent'}
            onChange={(e) => {
              const template = PROMPT_TEMPLATES.find(t => t.id === e.target.value);
              onChange('promptTemplate', e.target.value);
              if (template && template.id !== 'custom') {
                onChange('customInstructions', template.prompt);
              }
            }}
            className="input-field"
          >
            {PROMPT_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Choose a pre-built personality or write your own
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custom Instructions
          </label>
          <textarea
            value={formData.customInstructions}
            onChange={(e) => {
              onChange('customInstructions', e.target.value);
              onChange('promptTemplate', 'custom');
            }}
            className="input-field resize-none text-sm"
            rows={6}
            placeholder="Your AI assistant's personality and instructions will appear here..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Edit the template above or write completely custom instructions
          </p>
        </div>
      </div>
    </div>
  );
}

export { VOICES, PROMPT_TEMPLATES };
