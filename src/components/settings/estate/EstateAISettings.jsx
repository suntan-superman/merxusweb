import { useState } from 'react';

export default function EstateAISettings({ settings, onSave, saving }) {
  const [form, setForm] = useState({
    model: settings.aiConfig?.model || 'gpt-4o-mini',
    voiceName: settings.aiConfig?.voiceName || 'alloy',
    language: settings.aiConfig?.language || 'en-US',
    systemPrompt: settings.aiConfig?.systemPrompt || '',
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      aiConfig: {
        model: form.model,
        voiceName: form.voiceName,
        language: form.language,
        systemPrompt: form.systemPrompt,
        promptMetadata: settings.aiConfig?.promptMetadata || {
          routing: {},
          languageConfig: {
            default: 'en',
            methods: [
              {
                type: 'menu',
                dtmf: { '1': 'en', '2': 'es' },
                prompt_en: 'For English, press 1. Para español, presione 2.',
                prompt_es: 'Para inglés, presione 1. Para español, presione 2.',
              },
            ],
            fallback: 'en',
          },
          faqs: [],
        },
      },
    });
  }

  const VOICE_OPTIONS = [
    { value: 'alloy', label: 'Alloy' },
    { value: 'echo', label: 'Echo' },
    { value: 'fable', label: 'Fable' },
    { value: 'onyx', label: 'Onyx' },
    { value: 'nova', label: 'Nova' },
    { value: 'shimmer', label: 'Shimmer' },
  ];

  const LANGUAGE_OPTIONS = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'es-ES', label: 'Spanish (Spain)' },
    { value: 'es-MX', label: 'Spanish (Mexico)' },
  ];

  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Assistant Settings</h3>
      <p className="text-sm text-gray-600 mb-4">
        Configure the AI model, voice, and custom instructions for your real estate assistant.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
            AI Model
          </label>
          <select
            id="model"
            name="model"
            value={form.model}
            onChange={handleChange}
            className="input-field"
          >
            <option value="gpt-4o-mini">GPT-4o Mini (Fast, Cost-effective)</option>
            <option value="gpt-4o">GPT-4o (More Capable)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            GPT-4o Mini is recommended for most use cases. GPT-4o provides better reasoning for complex inquiries.
          </p>
        </div>

        <div>
          <label htmlFor="voiceName" className="block text-sm font-medium text-gray-700 mb-2">
            Voice
          </label>
          <select
            id="voiceName"
            name="voiceName"
            value={form.voiceName}
            onChange={handleChange}
            className="input-field"
          >
            {VOICE_OPTIONS.map((voice) => (
              <option key={voice.value} value={voice.value}>
                {voice.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
            Default Language
          </label>
          <select
            id="language"
            name="language"
            value={form.language}
            onChange={handleChange}
            className="input-field"
          >
            {LANGUAGE_OPTIONS.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            The AI will automatically detect and respond in English or Spanish based on caller preference.
          </p>
        </div>

        <div>
          <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700 mb-2">
            Custom Instructions (Optional)
          </label>
          <textarea
            id="systemPrompt"
            name="systemPrompt"
            rows="8"
            value={form.systemPrompt}
            onChange={handleChange}
            className="input-field font-mono text-sm"
            placeholder="Add any custom instructions for the AI assistant here. The default prompt includes listings, showing scheduling, and lead qualification."
          />
          <p className="text-xs text-gray-500 mt-1">
            Customize how the AI assistant behaves. Leave blank to use the default real estate prompt.
          </p>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save AI Settings'}
        </button>
      </form>
    </section>
  );
}

