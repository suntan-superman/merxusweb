import { useState, useEffect } from 'react';
import VoicePromptDropdown from './VoicePromptDropdown';
import { getPromptsForIndustry } from '../../../../data/voicePromptLibraryWithRouting';

export default function VoiceAISettings({ settings, onSave, saving, businessType = null }) {
  const [form, setForm] = useState({
    model: settings.aiConfig?.model || 'gpt-4o-mini',
    voiceName: settings.aiConfig?.voiceName || 'alloy',
    language: settings.aiConfig?.language || 'en-US',
    systemPrompt: settings.aiConfig?.systemPrompt || '',
    routing: settings.routing || null,
    languageConfig: settings.languageConfig || null,
    promptMetadata: settings.promptMetadata || null, // Store prompt ID, category, industry for reference
  });

  // Auto-select prompt based on business type when it changes
  useEffect(() => {
    if (businessType?.category && businessType?.industry && !form.systemPrompt) {
      // Try to find and set the default English prompt for this business type
      const prompts = getPromptsForIndustry(businessType.category, businessType.industry);
      const englishPrompt = prompts.find(p => p.language === 'en');
      if (englishPrompt) {
        setForm((prev) => ({
          ...prev,
          systemPrompt: englishPrompt.prompt,
          routing: englishPrompt.routing || null,
          languageConfig: englishPrompt.languageConfig || null,
          promptMetadata: {
            promptId: englishPrompt.id,
            category: englishPrompt.category,
            industry: englishPrompt.industry,
            language: englishPrompt.language,
          },
        }));
      }
    }
  }, [businessType, form.systemPrompt]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handlePromptChange(newPrompt) {
    setForm((prev) => ({ ...prev, systemPrompt: newPrompt }));
  }

  function handleConfigChange(config) {
    // When a template is selected, store its routing and language config
    setForm((prev) => ({
      ...prev,
      routing: config.routing,
      languageConfig: config.languageConfig,
      promptMetadata: {
        promptId: config.promptId,
        category: config.category,
        industry: config.industry,
        language: config.language,
      },
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Save AI config along with routing and language config
    onSave({ 
      aiConfig: {
        model: form.model,
        voiceName: form.voiceName,
        language: form.language,
        systemPrompt: form.systemPrompt,
      },
      routing: form.routing,
      languageConfig: form.languageConfig,
      promptMetadata: form.promptMetadata,
    });
  }

  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">AI & Telephony Settings</h3>
      <p className="text-sm text-gray-600 mb-4">
        Configure the AI model, voice settings, and prompts for your phone receptionist.
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
            Primary Language
          </label>
          <select
            id="language"
            name="language"
            value={form.language}
            onChange={handleChange}
            className="input-field"
          >
            <option value="en-US">English (US)</option>
            <option value="es-ES">Spanish (Spain)</option>
            <option value="es-MX">Spanish (Mexico)</option>
            <option value="es-US">Spanish (US)</option>
            <option value="fr-FR">French</option>
            <option value="de-DE">German</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            The AI will support both English and Spanish automatically, but this sets the primary language.
          </p>
        </div>

        <div>
          <VoicePromptDropdown
            value={form.systemPrompt}
            onChange={handlePromptChange}
            businessType={businessType}
            onConfigChange={handleConfigChange}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save AI Settings'}
        </button>
      </form>
    </section>
  );
}

