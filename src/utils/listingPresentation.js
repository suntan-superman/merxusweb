export function getListingValue(listing, ...keys) {
  for (const key of keys) {
    const value = listing?.[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return null;
}

function formatNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toLocaleString() : String(value);
}

export function formatListingDetails(listing) {
  const bedrooms = getListingValue(listing, 'bedrooms', 'beds');
  const bathrooms = getListingValue(listing, 'bathrooms', 'baths');
  const squareFeet = getListingValue(listing, 'sqft', 'sqFt', 'sq_ft');
  const zipCode = getListingValue(listing, 'zipCode', 'zip');

  return [
    `${bedrooms ?? 'N/A'} bed`,
    `${bathrooms ?? 'N/A'} bath`,
    squareFeet === null ? 'N/A' : `${formatNumber(squareFeet)} sq ft`,
    zipCode ? `ZIP ${zipCode}` : null,
  ]
    .filter(Boolean)
    .join(' • ');
}

