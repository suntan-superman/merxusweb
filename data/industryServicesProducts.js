/**
 * Industry Services & Products Library
 * Provides industry-specific service and product lists for auto-population
 * Based on merxus_voice_75_industry_services_products.json
 */

import industryData from './merxus_voice_75_industry_services_products.json';

/**
 * Get services for a specific industry
 * @param {string} category - Business category (e.g., "Professional Services")
 * @param {string} industry - Industry name (e.g., "Law Office")
 * @returns {Array<string>} Array of service names
 */
export function getServicesForIndustry(category, industry) {
  if (!category || !industry) return [];
  
  const categoryData = industryData[category];
  if (!categoryData) return [];
  
  const services = categoryData[industry];
  return services || [];
}

/**
 * Get all categories
 * @returns {Array<string>} Array of category names
 */
export function getCategories() {
  return Object.keys(industryData);
}

/**
 * Get all industries for a category
 * @param {string} category - Business category
 * @returns {Array<string>} Array of industry names
 */
export function getIndustriesForCategory(category) {
  if (!category) return [];
  const categoryData = industryData[category];
  if (!categoryData) return [];
  return Object.keys(categoryData);
}

/**
 * Convert service names to service objects with available flag
 * @param {Array<string>} serviceNames - Array of service names
 * @returns {Array<{name: string, available: boolean}>} Array of service objects
 */
export function convertServicesToObjects(serviceNames) {
  return serviceNames.map(name => ({
    name: name.trim(),
    available: true, // Default to available
  }));
}

