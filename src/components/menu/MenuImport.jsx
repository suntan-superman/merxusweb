import { useState } from 'react';
import { apiClient } from '../../api/client';
import { fetchMenu } from '../../api/menu';
import {
  parseMenuCsv,
  toImportableMenuItems,
  validateMenuItems,
} from '../../utils/menuImport';

export default function MenuImport({ onImportComplete, onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 });
  const [validation, setValidation] = useState(null); // { errors: [], warnings: [], valid: count }
  const [showModeConfirmation, setShowModeConfirmation] = useState(false);
  const [existingItemCount, setExistingItemCount] = useState(0);
  const [parsedItems, setParsedItems] = useState(null);

  function handleFileSelect(e) {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setSuccess(null);
    setValidation(null);

    // Preview and validate the file
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter((line) => line.trim());
      const previewLines = lines.slice(0, 5); // Show first 5 lines
      setPreview({
        totalLines: lines.length - 1, // Subtract header
        preview: previewLines.join('\n'),
      });

      // Validate menu items
      try {
        const items = parseMenuCsv(text);
        const validationResult = validateMenuItems(items);
        setValidation(validationResult);
      } catch (err) {
        setError(err.message);
      }
    };
    reader.readAsText(selectedFile);
  }

  async function handleImport() {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const text = await file.text();
      const parsed = parseMenuCsv(text);
      const validationResult = validateMenuItems(parsed);
      setValidation(validationResult);

      if (validationResult.hasErrors) {
        throw new Error('Fix the CSV validation errors before importing');
      }

      const items = toImportableMenuItems(parsed);

      if (items.length === 0) {
        throw new Error('No valid menu items found in CSV file');
      }

      // Store parsed items for later use
      setParsedItems(items);

      const existingItems = await fetchMenu();
      const count = Array.isArray(existingItems) ? existingItems.length : 0;
      setExistingItemCount(count);

      if (count > 0) {
        setShowModeConfirmation(true);
      } else {
        await performImport(items, 'add');
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to import menu items');
    } finally {
      setImporting(false);
    }
  }

  async function performImport(items, mode) {
    const totalItems = items.length;
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    setProgress({ current: 0, total: totalItems, percent: 0 });
    setImporting(true);

    try {
      // Call menu import endpoint via apiClient (authenticated, correct URL)
      const result = await apiClient.post('/menu/import', { items, mode });

      successCount = result.data.success;
      errorCount = result.data.failed;

      if (result.data.errors && result.data.errors.length > 0) {
        errors.push(...result.data.errors.slice(0, 5));
      }

      setProgress({ current: totalItems, total: totalItems, percent: 100 });

      if (successCount > 0) {
        const replacedText = result.data.replaced > 0 ? ` (replaced ${result.data.replaced})` : '';
        setSuccess(`Successfully imported ${successCount} menu item${successCount !== 1 ? 's' : ''}${replacedText}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        if (onImportComplete) {
          onImportComplete();
        }
        if (errorCount === 0) {
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      } else {
        setError(`Failed to import all items. Errors: ${errors.join('; ')}`);
      }

      if (errors.length > 0 && errors.length <= 5) {
        console.warn('Import errors:', errors);
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to import menu items');
    } finally {
      setImporting(false);
    }
  }

  function handleModeConfirmation(mode) {
    setShowModeConfirmation(false);
    if (parsedItems) {
      performImport(parsedItems, mode);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="fixed inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative ml-auto h-full w-full max-w-2xl bg-white shadow-xl flex flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">Import Menu Items</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="input-field"
            />
            <p className="text-xs text-gray-500 mt-1">
              CSV format: name, description, price, category, isAvailable, tags
            </p>
          </div>

          {preview && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview ({preview.totalLines} items found)
              </label>
              <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-auto max-h-48">
                {preview.preview}
              </pre>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-md bg-primary-50 border border-primary-200 px-4 py-3 text-sm text-primary-700">
              {success}
            </div>
          )}

          {importing && progress.total > 0 && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-green-900">
                  Importing Menu Items... {progress.current} of {progress.total}
                </h4>
                <span className="text-2xl font-bold text-green-600">{progress.percent}%</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              
              <p className="text-sm text-green-700">
                Processing item {progress.current} of {progress.total}...
              </p>
            </div>
          )}

          {/* Validation Results */}
          {validation && !importing && (
            <div className="space-y-3">
              {/* Summary */}
              <div className={`rounded-xl p-4 border-2 ${
                validation.hasErrors 
                  ? 'bg-red-50 border-red-200' 
                  : validation.hasWarnings 
                  ? 'bg-yellow-50 border-yellow-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`font-bold ${
                    validation.hasErrors ? 'text-red-900' : 
                    validation.hasWarnings ? 'text-yellow-900' : 
                    'text-green-900'
                  }`}>
                    Validation Results
                  </h4>
                  <span className={`text-lg font-bold ${
                    validation.hasErrors ? 'text-red-600' : 
                    validation.hasWarnings ? 'text-yellow-600' : 
                    'text-green-600'
                  }`}>
                    {validation.validCount} / {validation.totalCount} Valid
                  </span>
                </div>
                
                {validation.hasErrors && (
                  <p className="text-sm text-red-700">
                    ⚠️ {validation.errors.length} error(s) found. Please fix required fields before importing.
                  </p>
                )}
                
                {!validation.hasErrors && validation.hasWarnings && (
                  <p className="text-sm text-yellow-700">
                    ⚠️ {validation.warningCount} warning(s). You can proceed, but some items may be incomplete.
                  </p>
                )}
                
                {!validation.hasErrors && !validation.hasWarnings && (
                  <p className="text-sm text-green-700">
                    ✅ All menu items look good! Ready to import.
                  </p>
                )}
              </div>

              {/* Errors */}
              {validation.hasErrors && (
                <div className="bg-white border-2 border-red-200 rounded-lg p-4">
                  <h5 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <span className="text-red-600">❌</span>
                    Errors ({validation.errors.length})
                  </h5>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {validation.errors.map((error, idx) => (
                      <div key={idx} className="text-xs text-red-700 font-mono bg-red-50 px-2 py-1 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {validation.hasWarnings && (
                <div className="bg-white border-2 border-yellow-200 rounded-lg p-4">
                  <h5 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                    <span className="text-yellow-600">⚠️</span>
                    Warnings ({validation.warningCount})
                  </h5>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {validation.warnings.map((warning, idx) => (
                      <div key={idx} className="text-xs text-yellow-700 font-mono bg-yellow-50 px-2 py-1 rounded">
                        {warning}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-yellow-600 mt-2">
                    Showing up to 50 warnings. You can still import, but menu items may be incomplete.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
            <p className="font-medium mb-1">CSV Format:</p>
            <p className="text-xs">
              Required columns: <strong>name, price, category</strong><br />
              Optional columns: <strong>description, isAvailable, tags</strong><br />
              Tags should be separated by semicolons (;)
            </p>
          </div>
        </div>

        <footer className="border-t px-4 py-3 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={onClose}
            disabled={importing}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleImport}
            disabled={!file || importing || (validation && validation.hasErrors)}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            title={validation && validation.hasErrors ? 'Fix errors before importing' : ''}
          >
            {importing ? 'Importing...' : validation && validation.hasErrors ? 'Fix Errors First' : 'Import Menu Items'}
          </button>
        </footer>
      </div>

      {showModeConfirmation && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModeConfirmation(false)}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Choose Import Mode
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  You're about to import {parsedItems?.length || 0} menu items. What would you like to do?
                </p>
                <p className="text-sm text-gray-600 mb-6">
                  The current menu contains {existingItemCount} item{existingItemCount === 1 ? '' : 's'}.
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => handleModeConfirmation('add')}
                    className="w-full text-left p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <div className="font-semibold text-blue-900">➕ Add to Existing Menu</div>
                    <div className="text-sm text-blue-700">Keep existing items and add new ones</div>
                  </button>
                  <button
                    onClick={() => handleModeConfirmation('replace')}
                    className="w-full text-left p-4 border-2 border-red-200 rounded-lg hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <div className="font-semibold text-red-900">🔄 Replace All Items</div>
                    <div className="text-sm text-red-700">Remove all existing items and import these</div>
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowModeConfirmation(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


