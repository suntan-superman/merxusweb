import { useState } from 'react';
import { createListing } from '../../api/estate';
import * as XLSX from 'xlsx';

export default function ListingImport({ onImportComplete, onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [fileType, setFileType] = useState(null);

  function handleFileSelect(e) {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const fileName = selectedFile.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isCSV && !isExcel) {
      setError('Please select a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }

    setFile(selectedFile);
    setFileType(isCSV ? 'csv' : 'excel');
    setError(null);
    setSuccess(null);

    // Preview the file
    if (isCSV) {
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
    } else {
      // Excel preview
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          
          if (jsonData.length > 0) {
            const previewLines = jsonData.slice(0, 5).map(row => row.join(','));
            setPreview({
              totalLines: jsonData.length - 1,
              preview: previewLines.join('\n'),
            });
          }
        } catch (err) {
          setError('Failed to read Excel file: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
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
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  function parseCSV(text) {
    const lines = text.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
    
    // Map column names (flexible matching)
    const columnMap = {
      address: ['address', 'street', 'street address'],
      city: ['city'],
      state: ['state'],
      zipCode: ['zip', 'zipcode', 'zip code', 'postal code', 'postal'],
      price: ['price', 'list price', 'asking price'],
      sqft: ['sqft', 'sq ft', 'square feet', 'square footage', 'sqfeet'],
      bedrooms: ['beds', 'bedrooms', 'bed', 'br'],
      bathrooms: ['baths', 'bathrooms', 'bath', 'ba'],
      propertyType: ['property type', 'type', 'property_type', 'propertytype'],
      status: ['status', 'listing status'],
      lotSize: ['lotsize', 'lot size', 'lot sq ft', 'lot sqft', 'acreage', 'acres'],
      mlsNumber: ['mls', 'mls number', 'mls#', 'mlsnumber', 'mls_number'],
      yearBuilt: ['year built', 'yearbuilt', 'year_built', 'built'],
      description: ['description', 'notes', 'remarks', 'features', 'comments'],
    };

    // Find column indices
    const columnIndices = {};
    Object.keys(columnMap).forEach((key) => {
      const found = headers.findIndex((h) => 
        columnMap[key].some((alias) => h.includes(alias))
      );
      if (found !== -1) {
        columnIndices[key] = found;
      }
    });

    // Required fields
    if (columnIndices.address === undefined || columnIndices.city === undefined) {
      throw new Error('Missing required columns: Address and City are required');
    }

    const listings = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < headers.length) continue;

      const address = values[columnIndices.address]?.trim();
      const city = values[columnIndices.city]?.trim();
      
      if (!address || !city) continue; // Skip rows without required fields

      // Get property type, normalize to match mobile app format
      let propertyType = values[columnIndices.propertyType]?.trim().toLowerCase() || '';
      const typeMap = {
        'single family': 'Single Family',
        'single_family': 'Single Family',
        'singlefamily': 'Single Family',
        'sfh': 'Single Family',
        'condo': 'Condo',
        'condominium': 'Condo',
        'townhouse': 'Townhouse',
        'townhome': 'Townhouse',
        'multi family': 'Multi-Family',
        'multi-family': 'Multi-Family',
        'multifamily': 'Multi-Family',
      };
      propertyType = typeMap[propertyType] || 'Single Family'; // Default

      // Get status, normalize
      let status = values[columnIndices.status]?.trim().toLowerCase() || 'active';
      const statusMap = {
        'active': 'active',
        'for sale': 'active',
        'pending': 'pending',
        'under contract': 'pending',
        'sold': 'sold',
        'closed': 'sold',
      };
      status = statusMap[status] || 'active';

      const listing = {
        address,
        city,
        state: values[columnIndices.state]?.trim() || '',
        zipCode: values[columnIndices.zipCode]?.trim() || '',
        price: parseFloat(values[columnIndices.price]?.replace(/[^0-9.]/g, '') || '0') || 0,
        sqft: parseInt(values[columnIndices.sqft]?.replace(/[^0-9]/g, '') || '0', 10) || 0,
        bedrooms: parseInt(values[columnIndices.bedrooms]?.replace(/[^0-9]/g, '') || '0', 10) || 0,
        bathrooms: parseFloat(values[columnIndices.bathrooms]?.replace(/[^0-9.]/g, '') || '0') || 0,
        propertyType,
        status,
        mlsNumber: values[columnIndices.mlsNumber]?.trim() || '',
        yearBuilt: values[columnIndices.yearBuilt]?.trim() || '',
        description: values[columnIndices.description]?.trim() || '',
      };

      // Handle lot size (could be in sq ft or acres)
      const lotSizeRaw = values[columnIndices.lotSize]?.trim() || '';
      if (lotSizeRaw) {
        if (lotSizeRaw.toLowerCase().includes('acre')) {
          const acres = parseFloat(lotSizeRaw.replace(/[^0-9.]/g, ''));
          if (acres) {
            listing.lotSize = `${acres} acres`;
          }
        } else {
          const sqft = parseInt(lotSizeRaw.replace(/[^0-9]/g, ''), 10);
          if (sqft) {
            listing.lotSize = `${sqft} sqft`;
          }
        }
      }

      listings.push(listing);
    }

    return listings;
  }

  function parseExcel(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

          if (jsonData.length < 2) {
            throw new Error('Excel file must have at least a header row and one data row');
          }

          const headers = jsonData[0].map((h) => String(h || '').trim().toLowerCase());
          
          // Same column mapping as CSV
          const columnMap = {
            address: ['address', 'street', 'street address'],
            city: ['city'],
            state: ['state'],
            zipCode: ['zip', 'zipcode', 'zip code', 'postal code', 'postal'],
            price: ['price', 'list price', 'asking price'],
            sqft: ['sqft', 'sq ft', 'square feet', 'square footage', 'sqfeet'],
            bedrooms: ['beds', 'bedrooms', 'bed', 'br'],
            bathrooms: ['baths', 'bathrooms', 'bath', 'ba'],
            propertyType: ['property type', 'type', 'property_type', 'propertytype'],
            status: ['status', 'listing status'],
            lotSize: ['lotsize', 'lot size', 'lot sq ft', 'lot sqft', 'acreage', 'acres'],
            mlsNumber: ['mls', 'mls number', 'mls#', 'mlsnumber', 'mls_number'],
            yearBuilt: ['year built', 'yearbuilt', 'year_built', 'built'],
            description: ['description', 'notes', 'remarks', 'features', 'comments'],
          };

          const columnIndices = {};
          Object.keys(columnMap).forEach((key) => {
            const found = headers.findIndex((h) => 
              columnMap[key].some((alias) => h.includes(alias))
            );
            if (found !== -1) {
              columnIndices[key] = found;
            }
          });

          if (columnIndices.address === undefined || columnIndices.city === undefined) {
            throw new Error('Missing required columns: Address and City are required');
          }

          const listings = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            const address = String(row[columnIndices.address] || '').trim();
            const city = String(row[columnIndices.city] || '').trim();
            
            if (!address || !city) continue;

            // Get property type, normalize to match mobile app format
            let propertyType = String(row[columnIndices.propertyType] || '').trim().toLowerCase();
            const typeMap = {
              'single family': 'Single Family',
              'single_family': 'Single Family',
              'singlefamily': 'Single Family',
              'sfh': 'Single Family',
              'condo': 'Condo',
              'condominium': 'Condo',
              'townhouse': 'Townhouse',
              'townhome': 'Townhouse',
              'multi family': 'Multi-Family',
              'multi-family': 'Multi-Family',
              'multifamily': 'Multi-Family',
            };
            propertyType = typeMap[propertyType] || 'Single Family'; // Default

            // Get status, normalize
            let status = String(row[columnIndices.status] || '').trim().toLowerCase() || 'active';
            const statusMap = {
              'active': 'active',
              'for sale': 'active',
              'pending': 'pending',
              'under contract': 'pending',
              'sold': 'sold',
              'closed': 'sold',
            };
            status = statusMap[status] || 'active';

            const listing = {
              address,
              city,
              state: String(row[columnIndices.state] || '').trim() || '',
              zipCode: String(row[columnIndices.zipCode] || '').trim() || '',
              price: parseFloat(String(row[columnIndices.price] || '0').replace(/[^0-9.]/g, '')) || 0,
              sqft: parseInt(String(row[columnIndices.sqft] || '0').replace(/[^0-9]/g, ''), 10) || 0,
              bedrooms: parseInt(String(row[columnIndices.bedrooms] || '0').replace(/[^0-9]/g, ''), 10) || 0,
              bathrooms: parseFloat(String(row[columnIndices.bathrooms] || '0').replace(/[^0-9.]/g, '')) || 0,
              propertyType,
              status,
              mlsNumber: String(row[columnIndices.mlsNumber] || '').trim() || '',
              yearBuilt: String(row[columnIndices.yearBuilt] || '').trim() || '',
              description: String(row[columnIndices.description] || '').trim() || '',
            };

            // Handle lot size (could be in sq ft or acres)
            const lotSizeRaw = String(row[columnIndices.lotSize] || '').trim();
            if (lotSizeRaw) {
              if (lotSizeRaw.toLowerCase().includes('acre')) {
                const acres = parseFloat(lotSizeRaw.replace(/[^0-9.]/g, ''));
                if (acres) {
                  listing.lotSize = `${acres} acres`;
                }
              } else {
                const sqft = parseInt(lotSizeRaw.replace(/[^0-9]/g, ''), 10);
                if (sqft) {
                  listing.lotSize = `${sqft} sqft`;
                }
              }
            }

            listings.push(listing);
          }

          resolve(listings);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read Excel file'));
      reader.readAsArrayBuffer(file);
    });
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
      let listings;

      if (fileType === 'csv') {
        const text = await file.text();
        listings = parseCSV(text);
      } else {
        listings = await parseExcel(file);
      }

      if (listings.length === 0) {
        throw new Error('No valid listings found in file');
      }

      // Import listings one by one
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const listing of listings) {
        try {
          await createListing(listing);
          successCount++;
        } catch (err) {
          errorCount++;
          errors.push(`${listing.address}: ${err.message || 'Failed to create'}`);
        }
      }

      if (successCount > 0) {
        setSuccess(`Successfully imported ${successCount} listing${successCount !== 1 ? 's' : ''}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        if (onImportComplete) {
          onImportComplete();
        }
        if (errorCount === 0) {
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      } else {
        setError(`Failed to import all listings. Errors: ${errors.slice(0, 5).join('; ')}${errors.length > 5 ? '...' : ''}`);
      }

      if (errors.length > 0 && errors.length <= 5) {
        console.warn('Import errors:', errors);
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err.message || 'Failed to import listings');
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
          <h2 className="text-lg font-semibold text-gray-900">Import Listings</h2>
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
              Select CSV or Excel File
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="input-field"
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: CSV (.csv), Excel (.xlsx, .xls)
            </p>
          </div>

          {preview && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview ({preview.totalLines} listings found)
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
            <p className="font-medium mb-1">File Format:</p>
            <p className="text-xs mb-2">
              <strong>Required columns:</strong> Address, City<br />
              <strong>Optional columns:</strong> State, Zip/ZipCode, Price, SqFt, Bedrooms, Bathrooms, PropertyType, Status, LotSize, MLSNumber, YearBuilt, Description
            </p>
            <p className="text-xs">
              <strong>Column names are flexible:</strong> "SqFt", "Square Feet", "Sq Ft" all work.<br />
              <strong>Property Types:</strong> Single Family, Condo, Townhouse, Multi-Family (default: Single Family)<br />
              <strong>Status:</strong> active, pending, sold (default: active)<br />
              <strong>Lot size:</strong> Can be in square feet or acres (e.g., "0.34 acres" or "14810 sqft").
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
            {importing ? 'Importing...' : 'Import Listings'}
          </button>
        </footer>
      </div>
    </div>
  );
}

