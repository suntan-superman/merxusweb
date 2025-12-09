import { useState } from 'react';
import { Volume2, Play, Pause } from 'lucide-react';

const VOICES = [
  {
    id: 'alloy',
    name: 'Alloy',
    gender: 'Neutral',
    description: 'Balanced and professional - great for all industries',
    personality: 'Professional, clear, versatile',
    recommended: ['Restaurant', 'Real Estate', 'Professional Office', 'General'],
  },
  {
    id: 'echo',
    name: 'Echo',
    gender: 'Male',
    description: 'Warm and friendly - perfect for hospitality',
    personality: 'Welcoming, friendly, approachable',
    recommended: ['Restaurant', 'Real Estate'],
  },
  {
    id: 'ballad',
    name: 'Ballad',
    gender: 'Male',
    description: 'Confident and authoritative - ideal for professional services',
    personality: 'Authoritative, confident, trustworthy',
    recommended: ['Professional Office', 'Real Estate', 'General'],
  },
  {
    id: 'verse',
    name: 'Verse',
    gender: 'Male',
    description: 'Deep and reassuring - excellent for formal settings',
    personality: 'Calm, reassuring, professional',
    recommended: ['Professional Office', 'General'],
  },
  {
    id: 'coral',
    name: 'Coral',
    gender: 'Female',
    description: 'Bright and energetic - great for sales and customer service',
    personality: 'Energetic, enthusiastic, helpful',
    recommended: ['Restaurant', 'Real Estate', 'General'],
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    gender: 'Female',
    description: 'Soft and gentle - perfect for appointment scheduling',
    personality: 'Gentle, patient, caring',
    recommended: ['Professional Office', 'Real Estate'],
  },
];

export default function VoiceSelection({ selectedVoice, onSelect, tenantType}) {
  const [playingVoice, setPlayingVoice] = useState(null);

  const handlePlaySample = (voiceId) => {
    // Stop any currently playing speech
    window.speechSynthesis.cancel();

    if (playingVoice === voiceId) {
      setPlayingVoice(null);
      return;
    }

    setPlayingVoice(voiceId);

    // Use browser's speech synthesis as a demo
    const sampleText = "Hello! This is a sample of how this voice sounds. Thank you for choosing Merxus AI.";
    const utterance = new SpeechSynthesisUtterance(sampleText);
    
    // Try to match voice characteristics (limited browser support)
    const voices = window.speechSynthesis.getVoices();
    const voiceConfig = VOICES.find(v => v.id === voiceId);
    
    if (voiceConfig) {
      // Try to find a matching voice based on gender
      const matchingVoice = voices.find(v => 
        voiceConfig.gender === 'Female' ? v.name.toLowerCase().includes('female') : 
        voiceConfig.gender === 'Male' ? v.name.toLowerCase().includes('male') :
        true
      );
      
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }
    }
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => {
      setPlayingVoice(null);
    };

    utterance.onerror = () => {
      setPlayingVoice(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Get industry name for recommendation matching
  const getIndustryName = (type) => {
    const map = {
      restaurant: 'Restaurant',
      real_estate: 'Real Estate',
      voice: 'Professional Office',
      general: 'General',
    };
    return map[type] || 'General';
  };

  const industryName = getIndustryName(tenantType);

  return (
    <div className="py-4">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Choose Your AI Voice</h3>
        <p className="text-gray-600">Select the voice that best represents your brand</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-3">
        {VOICES.map((voice) => {
          const isSelected = selectedVoice === voice.id;
          const isRecommended = voice.recommended.includes(industryName);
          const isPlaying = playingVoice === voice.id;

          return (
            <div
              key={voice.id}
              onClick={() => {
                console.log('🎤 [VoiceSelection] User clicked voice:', voice.id, voice.name);
                onSelect(voice.id);
              }}
              className={`w-full p-4 rounded-xl border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'border-green-500 bg-green-50 shadow-lg shadow-green-500/20'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Voice Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-lg font-bold text-gray-900">{voice.name}</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {voice.gender}
                    </span>
                    {isRecommended && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                        ⭐ Recommended
                      </span>
                    )}
                    {isSelected && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500 text-white font-bold">
                        ✓ Selected
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-700 mb-2">{voice.description}</p>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-gray-500">Personality:</span>
                    {voice.personality.split(', ').map((trait, index) => (
                      <span
                        key={index}
                        className={`px-2 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Play Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlaySample(voice.id);
                  }}
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isPlaying
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                      : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-600'
                  }`}
                  disabled={isPlaying}
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Help Text */}
      <div className="mt-6 space-y-3">
        <div className="text-center">
          <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
            <Volume2 size={16} />
            Click the play button to hear each voice sample
          </p>
        </div>

        <div className="max-w-2xl mx-auto bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-sm text-blue-900">
          <p className="font-semibold mb-1">💡 Pro Tip</p>
          <p className="text-blue-700">
            You can change your AI's voice anytime from settings. Try different voices to see which one your customers prefer!
          </p>
        </div>
      </div>
    </div>
  );
}
