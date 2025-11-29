import { useState } from 'react';
import PromptDropdown from './PromptDropdown';

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
            <option value="gpt-5-realtime">GPT-5 Realtime (Future)</option>
          </select>
        </div>

        <div>
          <label htmlFor="voiceName" className="block text-sm font-medium text-gray-700 mb-2">
            Voice Name
          </label>
          <select
            id="voiceName"
            name="voiceName"
            value={form.voiceName}
            onChange={handleChange}
            className="input-field"
          >
            <option value="alloy">Alloy</option>
            <option value="echo">Echo</option>
            <option value="fable">Fable</option>
            <option value="onyx">Onyx</option>
            <option value="nova">Nova</option>
            <option value="shimmer">Shimmer</option>
          </select>
        </div>

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

