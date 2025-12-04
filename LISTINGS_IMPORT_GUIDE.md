# Listings Import Guide

This guide explains how to import property listings via CSV or Excel files.

## Quick Start

1. Navigate to **Listings** page in the Real Estate portal
2. Click **"📥 Import CSV/Excel"** button
3. Select your CSV or Excel file
4. Review the preview
5. Click **"Import Listings"**

## Standardized Data Structure

The system now uses a standardized data structure across both **web** and **mobile** platforms:

### Core Fields (Used by both Web & Mobile)

| Field Name | Type | Required | Description | Example |
|------------|------|----------|-------------|---------|
| `address` | string | ✅ Yes | Street address | "123 Main Street" |
| `city` | string | ✅ Yes | City name | "Los Angeles" |
| `state` | string | No | State (2-letter code) | "CA" |
| `zipCode` | string | No | ZIP/Postal code | "90001" |
| `price` | number | No | Listing price | 850000 |
| `bedrooms` | integer | No | Number of bedrooms | 4 |
| `bathrooms` | decimal | No | Number of bathrooms | 2.5 |
| `sqft` | integer | No | Square footage | 2400 |
| `propertyType` | string | No | Property type | "Single Family", "Condo", "Townhouse", "Multi-Family" |
| `status` | string | No | Listing status | "active", "pending", "sold" |
| `lotSize` | string | No | Lot size | "0.25 acres" or "10890 sqft" |
| `mlsNumber` | string | No | MLS listing number | "MLS123456" |
| `yearBuilt` | string | No | Year property was built | "2018" |
| `description` | text | No | Property description | "Beautiful home with..." |

### Advanced Fields (Web Only - Optional)

| Field Name | Type | Description |
|------------|------|-------------|
| `has_pool` | boolean | Property has a pool |
| `has_garage` | boolean | Property has a garage |
| `parking_spaces` | integer | Number of parking spaces |
| `features` | array | List of property features |
| `highlights_en` | text | English highlights |
| `highlights_es` | text | Spanish highlights |
| `remarks_en` | text | English remarks |
| `remarks_es` | text | Spanish remarks |
| `photos` | array | Photo URLs |
| `virtual_tour_url` | string | Virtual tour URL |
| `showing_instructions` | text | Instructions for showing |
| `open_house` | object | Open house schedule |

## CSV File Format

### Required Columns
- **Address** (required)
- **City** (required)

### Optional Columns
All other fields are optional but recommended for complete listings.

### Column Name Flexibility

The import system recognizes multiple column name variations:

- **ZIP Code**: `zip`, `zipcode`, `zip code`, `postal code`, `postal`
- **Square Feet**: `sqft`, `sq ft`, `square feet`, `square footage`
- **Bedrooms**: `beds`, `bedrooms`, `bed`, `br`
- **Bathrooms**: `baths`, `bathrooms`, `bath`, `ba`
- **Property Type**: `property type`, `type`, `propertytype`
- **MLS Number**: `mls`, `mls number`, `mls#`, `mlsnumber`
- **Year Built**: `year built`, `yearbuilt`, `built`
- **Lot Size**: `lotsize`, `lot size`, `acreage`, `acres`
- **Description**: `description`, `notes`, `remarks`, `features`, `comments`

### Property Types

Supported property types (case-insensitive):
- **Single Family**: `single family`, `single_family`, `singlefamily`, `sfh`
- **Condo**: `condo`, `condominium`
- **Townhouse**: `townhouse`, `townhome`
- **Multi-Family**: `multi family`, `multi-family`, `multifamily`

Default: `Single Family`

### Listing Status

Supported statuses (case-insensitive):
- **active**: `active`, `for sale`
- **pending**: `pending`, `under contract`
- **sold**: `sold`, `closed`

Default: `active`

### Lot Size Format

Lot size can be specified in two ways:
- **Acres**: `0.25 acres`, `0.34 acres` (will be stored as "0.25 acres")
- **Square Feet**: `10890`, `10890 sqft` (will be stored as "10890 sqft")

## Sample CSV File

A sample CSV file is included at: `web/sample-listings-import-template.csv`

### Sample CSV Content:

```csv
Address,City,State,ZipCode,Price,Bedrooms,Bathrooms,SqFt,PropertyType,Status,LotSize,MLSNumber,YearBuilt,Description
123 Main Street,Los Angeles,CA,90001,850000,4,2.5,2400,Single Family,active,0.25 acres,MLS123456,2018,Beautiful single family home with modern kitchen and spacious backyard.
456 Oak Avenue,San Diego,CA,92101,625000,3,2,1800,Condo,active,,,2020,Stunning condo in downtown with city views.
```

## Import Process

1. **File Selection**: Choose a CSV (.csv) or Excel (.xlsx, .xls) file
2. **Preview**: System shows first 5 rows and total count
3. **Validation**: Checks for required columns (Address, City)
4. **Import**: Creates listings one by one
5. **Results**: Shows success/error count

### Error Handling

- Missing required fields (Address, City) → Row skipped
- Invalid data formats → Row skipped with error message
- Partial imports → Successful listings are created, errors are reported

## Data Migration Notes

### Legacy Field Names

The system automatically handles legacy field names for backward compatibility:

| Old Name | New Name |
|----------|----------|
| `zip` | `zipCode` |
| `beds` | `bedrooms` |
| `baths` | `bathrooms` |
| `sq_ft` | `sqft` |
| `lot_sq_ft` | `lotSize` |
| `property_type` | `propertyType` |
| `year_built` | `yearBuilt` |
| `mls_id` | `mlsNumber` |

When editing existing listings, the system will automatically map old field names to new ones.

## Best Practices

1. **Use consistent naming**: Stick to the new standardized field names
2. **Include core details**: Always include bedrooms, bathrooms, and sqft for better mobile app display
3. **Property descriptions**: Add detailed descriptions for better AI responses
4. **MLS Numbers**: Include MLS numbers for easy reference
5. **Property status**: Keep status updated (active, pending, sold)
6. **Lot size format**: Use clear formats like "0.25 acres" or "10890 sqft"

## Troubleshooting

### "Missing required columns" error
- Ensure your file has both `Address` and `City` columns
- Check column name spelling

### "No valid listings found" error
- Check that rows have data in required columns
- Verify file format (CSV/Excel)

### Partial import success
- Review error messages for specific rows
- Common issues: missing address, missing city, invalid data formats

## Need Help?

If you encounter issues during import:
1. Check the browser console for detailed error messages
2. Verify your CSV file format matches the sample template
3. Ensure required columns (Address, City) are present
4. Contact support with the error message and sample data

---

**Last Updated**: December 4, 2025
