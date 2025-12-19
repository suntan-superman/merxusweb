import { Download, Upload } from 'lucide-react';

export default function FlyoverImportStep({ fileInputRef, onDownloadTemplate, onFileUpload }) {
  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">Import Your Listings</h3>
        <p className="text-gray-600 text-sm">Add your property listings so your AI can answer questions about them</p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h4 className="font-medium text-gray-900 mb-2">CSV Format</h4>
        <p className="text-sm text-gray-600 mb-3">
          Download our template to see the expected format:
        </p>
        <div className="bg-white rounded-lg p-3 border font-mono text-xs text-gray-700 overflow-x-auto mb-3">
          Address, Price, Beds, Baths, Sqft, Description
        </div>
        <button
          onClick={onDownloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors text-sm"
        >
          <Download size={16} />
          Download Template
        </button>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-400 transition-colors">
        <Upload size={32} className="mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600 mb-3">
          Drag and drop your CSV file here, or
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={onFileUpload}
          className="hidden"
          id="csv-upload"
        />
        <label
          htmlFor="csv-upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors cursor-pointer"
        >
          Browse Files
        </label>
      </div>

      <p className="text-xs text-gray-500 text-center">
        You can also add listings manually from the Listings page later.
      </p>
    </div>
  );
}
