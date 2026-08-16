import { useState } from 'react';
import SelectField from '../../common/SelectField';

export default function EstateAISettings({ settings, onSave, saving }) {
  const [form, setForm] = useState({
    model: settings.aiConfig?.model || 'gpt-4o-mini',
    voiceName: settings.aiConfig?.voiceName || 'alloy',
    language: settings.aiConfig?.language || 'en-US',
    systemPrompt: settings.aiConfig?.systemPrompt || '',
    autoSendFlyers: settings.autoSendFlyers === true,
  });

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      autoSendFlyers: form.autoSendFlyers,
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
    { value: 'alloy', label: 'Alloy (Neutral)' },
    { value: 'ash', label: 'Ash (Male)' },
    { value: 'ballad', label: 'Ballad (Male)' },
    { value: 'cedar', label: 'Cedar (Male)' },
    { value: 'coral', label: 'Coral (Female)' },
    { value: 'echo', label: 'Echo (Male)' },
    { value: 'marin', label: 'Marin (Female)' },
    { value: 'sage', label: 'Sage (Female)' },
    { value: 'shimmer', label: 'Shimmer (Female)' },
    { value: 'verse', label: 'Verse (Male)' },
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
        <SelectField
          id="model"
          name="model"
          label="AI Model"
          value={form.model}
          onChange={(nextValue) => setForm((prev) => ({ ...prev, model: nextValue }))}
          options={[
            { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast, Cost-effective)' },
            { value: 'gpt-4o', label: 'GPT-4o (More Capable)' },
          ]}
          helperText="GPT-4o Mini is recommended for most use cases. GPT-4o provides better reasoning for complex inquiries."
        />

        <SelectField
          id="voiceName"
          name="voiceName"
          label="Voice"
          value={form.voiceName}
          onChange={(nextValue) => setForm((prev) => ({ ...prev, voiceName: nextValue }))}
          options={VOICE_OPTIONS}
        />

        <SelectField
          id="language"
          name="language"
          label="Default Language"
          value={form.language}
          onChange={(nextValue) => setForm((prev) => ({ ...prev, language: nextValue }))}
          options={LANGUAGE_OPTIONS}
          helperText="The AI will automatically detect and respond in English or Spanish based on caller preference."
        />

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
            Add <code>BILINGUAL_GREETING: enabled</code> on its own line only if you want the opening
            greeting spoken in both English and Spanish. Spanish callers are still detected and served
            automatically when this directive is omitted.
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-slate-700">
          <input
            type="checkbox"
            name="autoSendFlyers"
            checked={form.autoSendFlyers}
            onChange={handleChange}
            className="mt-1 h-4 w-4"
          />
          <span>
            <span className="block text-sm font-medium text-gray-900 dark:text-slate-100">
              Automatically email confirmed flyer requests
            </span>
            <span className="mt-1 block text-xs text-gray-500 dark:text-slate-400">
              Merxus sends only when the exact listing and flyer exist, the caller provides an email,
              and the caller explicitly agrees. Otherwise the request remains in Flyer Approvals.
            </span>
          </span>
        </label>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save AI Settings'}
        </button>
      </form>
    </section>
  );
}

