import { useState, useEffect } from 'react';
import {
  getCategories,
  getIndustriesForCategory,
  getPromptsForIndustry,
  getDefaultPrompt,
  getRoutingForIndustry,
  getLanguageConfigForIndustry,
} from '../../../../data/voicePromptLibraryWithRouting';
import ConfirmationModal from '../../common/ConfirmationModal';

const DEFAULT_PROMPT = getDefaultPrompt();

/**
 * Voice Prompt Dropdown Component
 * - Hierarchical selection: Category → Industry → Template
 * - Bilingual support: English and Spanish
 * - Editable textarea for customization
 * - Restore default button with confirmation
 * - Preview functionality
 * - Stores routing and language config when template is selected
 */
export default function VoicePromptDropdown({ value, onChange, businessType = null, onConfigChange = null }) {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedPromptId, setSelectedPromptId] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewText, setPreviewText] = useState('');

  const categories = getCategories();
  const industries = selectedCategory ? getIndustriesForCategory(selectedCategory) : [];
  const prompts = selectedCategory && selectedIndustry
    ? getPromptsForIndustry(selectedCategory, selectedIndustry)
    : [];

  // Auto-select business type if provided
  useEffect(() => {
    if (businessType?.category && businessType?.industry && !selectedCategory) {
      setSelectedCategory(businessType.category);
      setSelectedIndustry(businessType.industry);
    }
  }, [businessType]);

  // Detect if current value matches a library prompt
  useEffect(() => {
    if (value) {
      // Try to find matching prompt by comparing prompt text
      const allPrompts = categories.flatMap(cat => {
        const inds = getIndustriesForCategory(cat);
        return inds.flatMap(ind => getPromptsForIndustry(cat, ind));
      });
      
      const matchingPrompt = allPrompts.find(p => {
        // Compare normalized prompt text
        const normalizedValue = value.trim().replace(/\s+/g, ' ');
        const normalizedPrompt = p.prompt.trim().replace(/\s+/g, ' ');
        return normalizedPrompt === normalizedValue || normalizedPrompt.includes(normalizedValue) || normalizedValue.includes(normalizedPrompt);
      });
      
      if (matchingPrompt) {
        setSelectedPromptId(matchingPrompt.id);
        setSelectedCategory(matchingPrompt.category);
        setSelectedIndustry(matchingPrompt.industry);
        setSelectedLanguage(matchingPrompt.language);
      } else {
        setSelectedPromptId(null);
      }
    } else {
      setSelectedPromptId(null);
    }
  }, [value]);

  function handleCategoryChange(category) {
    setSelectedCategory(category);
    setSelectedIndustry('');
    setSelectedPromptId(null);
  }

  function handleIndustryChange(industry) {
    setSelectedIndustry(industry);
    setSelectedPromptId(null);
  }

  function handleLanguageChange(language) {
    setSelectedLanguage(language);
    setSelectedPromptId(null);
  }

  function handleSelectPrompt(promptObj) {
    setSelectedPromptId(promptObj.id);
    onChange(promptObj.prompt);
    
    // Store routing and language config if callback provided
    if (onConfigChange) {
      onConfigChange({
        routing: promptObj.routing || null,
        languageConfig: promptObj.languageConfig || null,
        promptId: promptObj.id,
        category: promptObj.category,
        industry: promptObj.industry,
        language: promptObj.language,
      });
    }
    
    setOpen(false);
  }

  function handleRestoreDefault() {
    setShowRestoreModal(true);
  }

  function confirmRestoreDefault() {
    onChange(DEFAULT_PROMPT);
    setSelectedPromptId(null);
    setSelectedCategory('');
    setSelectedIndustry('');
    setShowRestoreModal(false);
  }

  function handlePreview() {
    if (!value || value.trim() === '') {
      setPreviewText('Please enter a prompt to preview.');
      setShowPreview(true);
      return;
    }

    const preview = `AI Assistant Preview:\n\n${value}\n\n---\n\nThis prompt will be combined with:\n- Business name and information\n- Business hours\n- Call routing rules\n- Department information`;
    setPreviewText(preview);
    setShowPreview(true);
  }

  // Filter prompts by selected language
  const filteredPrompts = prompts.filter(p => p.language === selectedLanguage);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          AI Prompt Template
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Select a template from the library (Category → Industry → Template) or create your own custom prompt. You can edit any template after selecting it.
        </p>

        {/* Hierarchical Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="w-full text-left bg-white rounded-md border border-gray-300 shadow-sm px-4 py-3 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">
                {selectedPromptId
                  ? `${selectedCategory} → ${selectedIndustry} (${selectedLanguage === 'en' ? 'English' : 'Español'})`
                  : value && value.trim() !== ''
                  ? 'Custom Prompt'
                  : 'Choose a template or start typing...'}
              </span>
              <svg
                className={`h-5 w-5 text-gray-400 transition-transform ${open ? 'transform rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {open && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpen(false)}
              />
              <div className="absolute z-20 mt-1 w-full max-h-[600px] bg-white rounded-md border border-gray-300 shadow-lg overflow-hidden">
                <div className="max-h-[600px] overflow-y-auto p-4">
                  {/* Step 1: Category Selection */}
                  {!selectedCategory && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Step 1: Select Category</h4>
                      <div className="space-y-2">
                        {categories.map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => handleCategoryChange(category)}
                            className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors border border-gray-200 rounded-md"
                          >
                            <div className="font-medium text-gray-900">{category}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Industry Selection */}
                  {selectedCategory && !selectedIndustry && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory('');
                            setSelectedIndustry('');
                          }}
                          className="text-sm text-primary-600 hover:text-primary-700"
                        >
                          ← Back
                        </button>
                        <h4 className="text-sm font-semibold text-gray-700">
                          Step 2: Select Industry ({selectedCategory})
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {industries.map((industry) => (
                          <button
                            key={industry}
                            type="button"
                            onClick={() => handleIndustryChange(industry)}
                            className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors border border-gray-200 rounded-md"
                          >
                            <div className="font-medium text-gray-900">{industry}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Language & Template Selection */}
                  {selectedCategory && selectedIndustry && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIndustry('');
                            setSelectedPromptId(null);
                          }}
                          className="text-sm text-primary-600 hover:text-primary-700"
                        >
                          ← Back
                        </button>
                        <h4 className="text-sm font-semibold text-gray-700">
                          Step 3: Select Language & Template ({selectedIndustry})
                        </h4>
                      </div>

                      {/* Language Toggle */}
                      <div className="mb-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleLanguageChange('en')}
                          className={`flex-1 px-4 py-2 rounded-md border-2 transition-colors ${
                            selectedLanguage === 'en'
                              ? 'border-primary-600 bg-primary-50 text-primary-700 font-medium'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          English
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLanguageChange('es')}
                          className={`flex-1 px-4 py-2 rounded-md border-2 transition-colors ${
                            selectedLanguage === 'es'
                              ? 'border-primary-600 bg-primary-50 text-primary-700 font-medium'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Español
                        </button>
                      </div>

                      {/* Template Selection */}
                      {filteredPrompts.length > 0 ? (
                        <div className="space-y-2">
                          {filteredPrompts.map((prompt) => (
                            <button
                              key={prompt.id}
                              type="button"
                              onClick={() => handleSelectPrompt(prompt)}
                              className={`w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors border rounded-md ${
                                selectedPromptId === prompt.id
                                  ? 'border-primary-600 bg-primary-50 border-l-4 border-l-primary-600'
                                  : 'border-gray-200'
                              }`}
                            >
                              <div className="font-medium text-gray-900">
                                {prompt.name} ({prompt.language === 'en' ? 'English' : 'Español'})
                              </div>
                              <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {prompt.greeting || prompt.prompt.substring(0, 100)}...
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          No templates available for this industry in {selectedLanguage === 'en' ? 'English' : 'Español'}.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handlePreview}
          className="btn-secondary text-sm"
        >
          👁️ Preview
        </button>
        <button
          type="button"
          onClick={handleRestoreDefault}
          className="btn-secondary text-sm"
          disabled={value === DEFAULT_PROMPT}
        >
          🔄 Restore Default
        </button>
      </div>

      {/* Prompt Editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Customize Prompt
        </label>
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 text-sm rounded-md border border-gray-300 text-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
          rows={12}
          placeholder="Select a template above or start typing your custom prompt..."
        />
        <p className="text-xs text-gray-500 mt-1">
          This prompt will be combined with business information, business hours, and call routing rules automatically.
        </p>
      </div>

      {/* Restore Default Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onConfirm={confirmRestoreDefault}
        title="Restore Default Prompt"
        message="Are you sure you want to restore the default prompt? This will replace your current custom prompt."
        confirmText="Restore Default"
        cancelText="Cancel"
        variant="warning"
      />

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setShowPreview(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-2xl transform overflow-hidden rounded-lg bg-white shadow-xl">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Prompt Preview</h3>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-6 py-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded border">
                  {previewText}
                </pre>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

