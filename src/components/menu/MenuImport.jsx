import { useState } from 'react';
import { createMenuItem } from '../../api/menu';

export default function MenuImport({ onImportComplete, onClose, createItemFn }) {
  // Use provided function or default to restaurant portal API
  const createItem = createItemFn || createMenuItem;
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 });
  const [validation, setValidation] = useState(null); // { errors: [], warnings: [], valid: count }

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
        const items = parseCSV(text);
        const validationResult = validateMenuItems(items);
        setValidation(validationResult);
      } catch (err) {
        setError(err.message);
      }
    };
    reader.readAsText(selectedFile);
  }

  function validateMenuItems(items) {
    const errors = [];
    const warnings = [];
    let validCount = 0;

    items.forEach((item, index) => {
      const rowNum = index + 2; // +2 for header and 0-index

      // Required field errors
      if (!item.name || !item.name.trim()) {
        errors.push(`Row ${rowNum}: Missing required field 'Name'`);
      }
      if (!item.price || item.price === 0) {
        errors.push(`Row ${rowNum}: Missing or invalid 'Price'`);
      }
      if (!item.category || !item.category.trim()) {
        errors.push(`Row ${rowNum}: Missing required field 'Category'`);
      }

      // Warnings for recommended fields
      if (!item.description || !item.description.trim()) {
        warnings.push(`Row ${rowNum}: Missing description for "${item.name || 'item'}"`);
      }

      // Price validation
      if (item.price && item.price < 0) {
        errors.push(`Row ${rowNum}: Price cannot be negative for "${item.name || 'item'}"`);
      }
      if (item.price && item.price > 10000) {
        warnings.push(`Row ${rowNum}: Unusually high price ($${item.price}) for "${item.name || 'item'}"`);
      }

      // Count valid rows (has required fields)
      if (item.name && item.price && item.category) {
        validCount++;
      }
    });

    return {
      errors,
      warnings: warnings.slice(0, 10), // Limit warnings to first 10
      validCount,
      totalCount: items.length,
      hasErrors: errors.length > 0,
      hasWarnings: warnings.length > 0,
    };
  }

  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    result.push(current.trim());
    return result;
  }

  function parseCSV(text) {
    const lines = text.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
    
    // Expected headers: name, description, price, category, isAvailable, tags
    const requiredHeaders = ['name', 'price', 'category'];
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    const items = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < headers.length) continue; // Skip incomplete rows

      const item = {};
      headers.forEach((header, index) => {
        const value = values[index] || '';
        
        switch (header) {
          case 'name':
            item.name = value;
            break;
          case 'description':
            item.description = value;
            break;
          case 'price':
            item.price = parseFloat(value) || 0;
            break;
          case 'category':
            item.category = value;
            break;
          case 'isavailable':
          case 'available':
            item.isAvailable = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes' || value === '1';
            break;
          case 'tags':
            item.tags = value ? value.split(';').map((t) => t.trim()).filter(Boolean) : [];
            break;
        }
      });

      // Validate required fields
      if (item.name && item.price && item.category) {
        // Set defaults
        if (item.isAvailable === undefined) item.isAvailable = true;
        if (!item.description) item.description = '';
        if (!item.tags) item.tags = [];
        
        items.push(item);
      }
    }

    return items;
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
      const items = parseCSV(text);

      if (items.length === 0) {
        throw new Error('No valid menu items found in CSV file');
      }

      // Import items one by one with progress
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      const totalItems = items.length;

      setProgress({ current: 0, total: totalItems, percent: 0 });

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          await createItem(item);
          successCount++;
        } catch (err) {
          errorCount++;
          errors.push(`${item.name}: ${err.message || 'Failed to create'}`);
        }

        // Update progress
        const currentProgress = i + 1;
        const percentComplete = Math.round((currentProgress / totalItems) * 100);
        setProgress({ 
          current: currentProgress, 
          total: totalItems, 
          percent: percentComplete 
        });
      }

      if (successCount > 0) {
        setSuccess(`Successfully imported ${successCount} menu item${successCount !== 1 ? 's' : ''}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        if (onImportComplete) {
          onImportComplete();
        }
        // Close after 2 seconds if all succeeded
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
      setError(err.message || 'Failed to import menu items');
    } finally {
      setImporting(false);
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
                    ⚠️ {validation.warnings.length} warning(s). You can proceed, but some items may be incomplete.
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
                    Warnings ({validation.warnings.length})
                  </h5>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {validation.warnings.map((warning, idx) => (
                      <div key={idx} className="text-xs text-yellow-700 font-mono bg-yellow-50 px-2 py-1 rounded">
                        {warning}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-yellow-600 mt-2">
                    These are optional fields. You can still import, but menu items may be incomplete.
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
    </div>
  );
}


