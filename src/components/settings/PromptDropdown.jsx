import { useState, useEffect } from 'react';
import { PROMPT_LIBRARY } from '../../../data/promptLibrary';
import ConfirmationModal from '../common/ConfirmationModal';

const DEFAULT_PROMPT = PROMPT_LIBRARY.find(p => p.id === 'universal')?.prompt || '';

/**
 * Enhanced Prompt Dropdown Component
 * - Dropdown to select from prompt library
 * - Editable textarea for customization
 * - Restore default button with confirmation
 * - Preview functionality
 */
export default function PromptDropdown({ value, onChange, voiceName = 'alloy' }) {
  const [open, setOpen] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewText, setPreviewText] = useState('');

  // Detect if current value matches a library prompt
  useEffect(() => {
    if (value) {
      const matchingPrompt = PROMPT_LIBRARY.find(p => p.prompt.trim() === value.trim());
      if (matchingPrompt) {
        setSelectedPromptId(matchingPrompt.id);
      } else {
        setSelectedPromptId(null);
      }
    } else {
      setSelectedPromptId(null);
    }
  }, [value]);

  function handleSelectPrompt(promptObj) {
    setSelectedPromptId(promptObj.id);
    onChange(promptObj.prompt);
    setOpen(false);
  }

  function handleRestoreDefault() {
    setShowRestoreModal(true);
  }

  function confirmRestoreDefault() {
    onChange(DEFAULT_PROMPT);
    setSelectedPromptId('universal');
    setShowRestoreModal(false);
  }

  function handlePreview() {
    if (!value || value.trim() === '') {
      setPreviewText('Please enter a prompt to preview.');
      setShowPreview(true);
      return;
    }

    // Simple preview - show how the prompt will be formatted
    const preview = `AI Assistant Preview:\n\n${value}\n\n---\n\nThis prompt will be combined with:\n- Restaurant name and information\n- Business hours\n- Menu items\n- Order/reservation workflows`;
    setPreviewText(preview);
    setShowPreview(true);
  }

  // Group prompts by category
  const promptsByCategory = PROMPT_LIBRARY.reduce((acc, prompt) => {
    if (!acc[prompt.category]) {
      acc[prompt.category] = [];
    }
    acc[prompt.category].push(prompt);
    return acc;
  }, {});

  const sortedCategories = Object.keys(promptsByCategory).sort();

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          AI Prompt Template
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Select a template from the library or create your own custom prompt. You can edit any template after selecting it.
        </p>

        {/* Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="w-full text-left bg-white rounded-md border border-gray-300 shadow-sm px-4 py-3 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">
                {selectedPromptId
                  ? PROMPT_LIBRARY.find((p) => p.id === selectedPromptId)?.name
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
            {selectedPromptId && (
              <p className="text-xs text-gray-500 mt-1">
                {PROMPT_LIBRARY.find((p) => p.id === selectedPromptId)?.category}
              </p>
            )}
          </button>

          {open && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpen(false)}
              />
              <div className="absolute z-20 mt-1 w-full max-h-96 bg-white rounded-md border border-gray-300 shadow-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  {sortedCategories.map((category) => (
                    <div key={category}>
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          {category}
                        </p>
                      </div>
                      {promptsByCategory[category].map((prompt) => (
                        <button
                          key={prompt.id}
                          type="button"
                          onClick={() => handleSelectPrompt(prompt)}
                          className={`w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors border-b border-gray-100 ${
                            selectedPromptId === prompt.id ? 'bg-primary-50 border-l-4 border-l-primary-600' : ''
                          }`}
                        >
                          <div className="font-medium text-gray-900">{prompt.name}</div>
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {prompt.prompt.substring(0, 100)}...
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
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
          This prompt will be combined with restaurant information, menu items, and business hours automatically.
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

