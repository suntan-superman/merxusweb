const REQUIRED_HEADERS = ['name', 'price', 'category'];
const KNOWN_HEADERS = new Set([
  'name',
  'description',
  'price',
  'category',
  'isavailable',
  'available',
  'tags',
  'includedsides',
  'extrachargesides',
]);

function parseCsvRows(text = '') {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let rowNumber = 1;
  let rowStart = 1;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      row.push(field.trim());
      field = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field.trim());
      if (row.some((value) => value !== '')) rows.push({ values: row, rowNumber: rowStart });
      row = [];
      field = '';
      rowNumber += 1;
      rowStart = rowNumber;
      continue;
    }
    if (char === '\n') rowNumber += 1;
    field += char;
  }

  if (inQuotes) throw new Error(`Unclosed quoted field beginning on row ${rowStart}`);

  row.push(field.trim());
  if (row.some((value) => value !== '')) rows.push({ values: row, rowNumber: rowStart });
  return rows;
}

function splitList(value = '') {
  return String(value).split(';').map((entry) => entry.trim()).filter(Boolean);
}

function parseExtraChargeSides(value = '') {
  const sides = {};
  for (const pair of splitList(value)) {
    const separator = pair.lastIndexOf(':');
    if (separator < 1) continue;
    const sideName = pair.slice(0, separator).trim();
    const parsedPrice = Number(pair.slice(separator + 1).replace('$', '').trim());
    if (sideName && Number.isFinite(parsedPrice)) sides[sideName] = parsedPrice;
  }
  return sides;
}

function parseAvailability(value = '') {
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return true;
  return ['true', 'yes', '1'].includes(normalized);
}

export function normalizeMenuItemKey(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function parseMenuCsv(text = '') {
  const rows = parseCsvRows(String(text).replace(/^\uFEFF/, ''));
  if (rows.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  const headers = rows[0].values.map((header) => header.trim().toLowerCase());
  const meaningfulHeaders = headers.filter(Boolean);
  const duplicateHeaders = meaningfulHeaders.filter(
    (header, index) => meaningfulHeaders.indexOf(header) !== index
  );
  if (duplicateHeaders.length > 0) {
    throw new Error(`Duplicate CSV columns: ${[...new Set(duplicateHeaders)].join(', ')}`);
  }

  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
  }

  const unknownHeaders = meaningfulHeaders.filter((header) => !KNOWN_HEADERS.has(header));
  if (unknownHeaders.length > 0) {
    throw new Error(`Unsupported CSV columns: ${unknownHeaders.join(', ')}`);
  }

  return rows.slice(1).map(({ values, rowNumber }) => {
    const item = {
      name: '',
      description: '',
      price: Number.NaN,
      category: '',
      isAvailable: true,
      tags: [],
      includedSides: [],
      extraChargeSides: {},
      sourceRow: rowNumber,
      columnCount: values.length,
      expectedColumnCount: headers.length,
    };

    headers.forEach((header, index) => {
      const value = values[index] || '';
      switch (header) {
        case 'name': item.name = value; break;
        case 'description': item.description = value; break;
        case 'price': item.price = value === '' ? Number.NaN : Number(value); break;
        case 'category': item.category = value; break;
        case 'isavailable':
        case 'available': item.isAvailable = parseAvailability(value); break;
        case 'tags': item.tags = splitList(value); break;
        case 'includedsides': item.includedSides = splitList(value); break;
        case 'extrachargesides': item.extraChargeSides = parseExtraChargeSides(value); break;
        default: break;
      }
    });

    const sideCountTag = item.tags.find((tag) => /^(one|two|three|1|2|3)\s+sides?$/i.test(tag));
    if (sideCountTag) {
      const count = sideCountTag.match(/^(one|two|three|1|2|3)/i)?.[1]?.toLowerCase();
      item.sideCount = { one: 1, two: 2, three: 3 }[count] || Number(count);
    }
    return item;
  });
}

export function validateMenuItems(items = []) {
  const errors = [];
  const warnings = [];
  const identityRows = new Map();
  const nameRows = new Map();
  let validCount = 0;

  for (const item of items) {
    const rowNumber = item.sourceRow || '?';
    let valid = true;

    if (item.columnCount !== item.expectedColumnCount) {
      errors.push(`Row ${rowNumber}: Expected ${item.expectedColumnCount} columns but found ${item.columnCount}`);
      valid = false;
    }
    if (!item.name?.trim()) {
      errors.push(`Row ${rowNumber}: Missing required field 'Name'`);
      valid = false;
    }
    if (!Number.isFinite(item.price) || item.price <= 0) {
      errors.push(`Row ${rowNumber}: Missing or invalid 'Price'`);
      valid = false;
    }
    if (!item.category?.trim()) {
      errors.push(`Row ${rowNumber}: Missing required field 'Category'`);
      valid = false;
    }

    const nameKey = normalizeMenuItemKey(item.name);
    const categoryKey = normalizeMenuItemKey(item.category);
    const identityKey = `${nameKey}::${categoryKey}`;
    if (nameKey && categoryKey) {
      if (identityRows.has(identityKey)) {
        errors.push(`Row ${rowNumber}: Duplicate item and category; first appears on row ${identityRows.get(identityKey)}`);
        valid = false;
      } else {
        identityRows.set(identityKey, rowNumber);
      }
      if (!nameRows.has(nameKey)) nameRows.set(nameKey, []);
      nameRows.get(nameKey).push({ category: item.category, rowNumber });
    }

    if (!item.description?.trim()) {
      warnings.push(`Row ${rowNumber}: Missing description for "${item.name || 'item'}"`);
    } else if (/^need description:/i.test(item.description.trim())) {
      warnings.push(`Row ${rowNumber}: Placeholder description for "${item.name}"`);
    }
    if (item.description?.trim().endsWith('...')) {
      warnings.push(`Row ${rowNumber}: Description appears truncated for "${item.name}"`);
    }
    if (/^\d+$/.test(item.name?.trim())) {
      warnings.push(`Row ${rowNumber}: Numeric-only item name "${item.name}" may be a modifier`);
    }
    if (item.includedSides.length > 0 && !item.sideCount) {
      warnings.push(`Row ${rowNumber}: "${item.name}" has included sides but no side-count tag`);
    }
    for (const [sideName, price] of Object.entries(item.extraChargeSides)) {
      if (!Number.isFinite(price) || price < 0) {
        errors.push(`Row ${rowNumber}: Invalid price for upcharge side "${sideName}"`);
        valid = false;
      }
    }
    if (Number.isFinite(item.price) && item.price > 500) {
      warnings.push(`Row ${rowNumber}: Unusually high price ($${item.price}) for "${item.name}"`);
    }
    if (valid) validCount += 1;
  }

  for (const rows of nameRows.values()) {
    if (rows.length > 1) {
      warnings.push(`Rows ${rows.map((entry) => entry.rowNumber).join(', ')}: Same item name appears in different categories (${rows.map((entry) => entry.category).join(', ')})`);
    }
  }

  return {
    errors,
    warnings: warnings.slice(0, 50),
    warningCount: warnings.length,
    validCount,
    totalCount: items.length,
    hasErrors: errors.length > 0,
    hasWarnings: warnings.length > 0,
  };
}

export function toImportableMenuItems(items = []) {
  return items.map(({ sourceRow, columnCount, expectedColumnCount, ...item }) => item);
}
