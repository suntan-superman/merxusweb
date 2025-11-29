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

    // Preview the file
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter((line) => line.trim());
      const previewLines = lines.slice(0, 5); // Show first 5 lines
      setPreview({
        totalLines: lines.length - 1, // Subtract header
        preview: previewLines.join('\n'),
      });
    };
    reader.readAsText(selectedFile);
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

      // Import items one by one
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const item of items) {
        try {
          await createItem(item);
          successCount++;
        } catch (err) {
          errorCount++;
          errors.push(`${item.name}: ${err.message || 'Failed to create'}`);
        }
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
            disabled={!file || importing}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? 'Importing...' : 'Import Menu Items'}
          </button>
        </footer>
      </div>
    </div>
  );
}


