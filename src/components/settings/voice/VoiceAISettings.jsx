import { useState, useEffect } from 'react';
import VoicePromptDropdown from './VoicePromptDropdown';
import { getPromptsForIndustry } from '../../../../data/voicePromptLibraryWithRouting';
import SelectField from '../../common/SelectField';

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
        <SelectField
          id="model"
          name="model"
          label="AI Model"
          value={form.model}
          onChange={(nextValue) => setForm((prev) => ({ ...prev, model: nextValue }))}
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
          onChange={(nextValue) => setForm((prev) => ({ ...prev, voiceName: nextValue }))}
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

        <SelectField
          id="language"
          name="language"
          label="Primary Language"
          value={form.language}
          onChange={(nextValue) => setForm((prev) => ({ ...prev, language: nextValue }))}
          options={[
            { value: 'en-US', label: 'English (US)' },
            { value: 'es-ES', label: 'Spanish (Spain)' },
            { value: 'es-MX', label: 'Spanish (Mexico)' },
            { value: 'es-US', label: 'Spanish (US)' },
            { value: 'fr-FR', label: 'French' },
            { value: 'de-DE', label: 'German' },
          ]}
          helperText="The AI will support both English and Spanish automatically, but this sets the primary language."
        />

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

