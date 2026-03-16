import { useState } from 'react';
import PromptDropdown from './PromptDropdown';
import SelectField from '../common/SelectField';

export default function AISettings({ settings, onSave, saving }) {
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

  function handlePromptChange(newPrompt) {
    setForm((prev) => ({ ...prev, systemPrompt: newPrompt }));
  }

  function handleSelectChange(field, nextValue) {
    setForm((prev) => ({ ...prev, [field]: nextValue }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ aiConfig: form });
  }

  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">AI & Telephony Settings</h3>
      <p className="text-sm text-gray-600 mb-4">
        Configure the AI model and voice settings for your phone receptionist.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField
          id="model"
          name="model"
          label="AI Model"
          value={form.model}
          onChange={(nextValue) => handleSelectChange('model', nextValue)}
          options={[
            { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast, Cost-effective)' },
            { value: 'gpt-4o', label: 'GPT-4o (More Capable)' },
            { value: 'gpt-5-realtime', label: 'GPT-5 Realtime (Future)' },
          ]}
        />

        <SelectField
          id="voiceName"
          name="voiceName"
          label="Voice Name"
          value={form.voiceName}
          onChange={(nextValue) => handleSelectChange('voiceName', nextValue)}
          options={[
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
          ]}
          helperText="Select the voice for your AI assistant. All voices support multiple languages."
        />

        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
            Language
          </label>
          <input
            id="language"
            name="language"
            type="text"
            value={form.language}
            onChange={handleChange}
            className="input-field"
            placeholder="en-US"
          />
          <p className="text-xs text-gray-500 mt-1">
            Language code (e.g., en-US, es-ES, fr-FR)
          </p>
        </div>

        <div>
          <PromptDropdown
            value={form.systemPrompt}
            onChange={handlePromptChange}
            voiceName={form.voiceName}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save AI Settings'}
        </button>
      </form>
    </section>
  );
}

