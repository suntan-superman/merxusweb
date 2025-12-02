/**
 * Industry Services & Products Library with Multilingual Synonyms
 * Provides industry-specific service lists with English/Spanish names and synonyms
 * Based on merxus_voice_75_industry_services_products_multilingual_synonyms.json
 */

import multilingualData from './merxus_voice_75_industry_services_products_multilingual_synonyms.json';

/**
 * Get services for a specific industry
 * @param {string} category - Business category (e.g., "Professional Services")
 * @param {string} industry - Industry name (e.g., "Law Office")
 * @returns {Array<{name_en: string, name_es: string, synonyms_en: Array, synonyms_es: Array, available: boolean}>} Array of service objects
 */
export function getServicesForIndustry(category, industry) {
  if (!category || !industry) return [];
  
  const categoryData = multilingualData.categories[category];
  if (!categoryData) return [];
  
  // Find the industry object
  const industryObj = categoryData.find(ind => ind.industry === industry);
  if (!industryObj || !industryObj.services) return [];
  
  return industryObj.services || [];
}

/**
 * Get all categories
 * @returns {Array<string>} Array of category names
 */
export function getCategories() {
  return Object.keys(multilingualData.categories || {});
}

/**
 * Get all industries for a category
 * @param {string} category - Business category
 * @returns {Array<string>} Array of industry names
 */
export function getIndustriesForCategory(category) {
  if (!category) return [];
  const categoryData = multilingualData.categories[category];
  if (!categoryData) return [];
  return categoryData.map(ind => ind.industry);
}

/**
 * Convert multilingual service objects to simplified service objects for storage
 * Uses name_en as the primary name, preserves synonyms and other metadata
 * @param {Array} serviceObjects - Array of service objects from the multilingual data
 * @returns {Array<{name: string, name_en: string, name_es: string, synonyms_en: Array, synonyms_es: Array, available: boolean}>} Array of service objects
 */
export function convertServicesToObjects(serviceObjects) {
  return serviceObjects.map(service => ({
    name: service.name_en || service.name || '', // Primary name for display
    name_en: service.name_en || '',
    name_es: service.name_es || '',
    synonyms_en: service.synonyms_en || [],
    synonyms_es: service.synonyms_es || [],
    available: service.available !== false, // Default to true if not specified
  }));
}

/**
 * Get all synonyms for a service (both languages)
 * @param {Object} service - Service object with synonyms
 * @returns {Array<string>} Combined array of all synonyms
 */
export function getAllSynonyms(service) {
  const synonyms = [];
  if (service.synonyms_en) synonyms.push(...service.synonyms_en);
  if (service.synonyms_es) synonyms.push(...service.synonyms_es);
  return synonyms;
}

/**
 * Find a service by matching query against name or synonyms
 * @param {Array} services - Array of service objects
 * @param {string} query - Query string to match
 * @param {string} language - Language preference ('en' or 'es')
 * @returns {Object|null} Matching service object or null
 */
export function findServiceByQuery(services, query, language = 'en') {
  if (!services || !query) return null;
  
  const normalizedQuery = query.toLowerCase().trim();
  
  for (const service of services) {
    // Check primary name
    const primaryName = language === 'es' ? service.name_es : service.name_en;
    if (primaryName && primaryName.toLowerCase().includes(normalizedQuery)) {
      return service;
    }
    
    // Check synonyms
    const synonyms = language === 'es' ? service.synonyms_es : service.synonyms_en;
    if (synonyms && synonyms.some(syn => syn.toLowerCase().includes(normalizedQuery))) {
      return service;
    }
    
    // Also check the display name
    if (service.name && service.name.toLowerCase().includes(normalizedQuery)) {
      return service;
    }
  }
  
  return null;
}

