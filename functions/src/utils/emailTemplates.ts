/**
 * SendGrid Dynamic Template IDs
 * These are the template IDs from your SendGrid account
 */

export const SENDGRID_TEMPLATES = {
  // Invitation templates
  RESTAURANT_INVITATION: 'd-5527db39a81a434fb306d0effa87557e',
  OFFICE_INVITATION: 'd-5527db39a81a434fb306d0effa87557e', // TODO: Create separate template for office invitations
  TEAM_INVITATION: 'd-e4858834722741e790aba9e32f9ba634',
  
  // Order templates
  ORDER_CONFIRMATION_CUSTOMER: 'd-2346ccf594c04f68b43e85b2118df3e4',
  ORDER_ALERT_RESTAURANT: 'd-ff965bfab3274dcf936854f628052019',
  
  // Support templates
  SUPPORT_AUTO_RESPONSE: 'd-8f11631964b440d58bef4a7c15c3d2d5',
  
  // Auth templates
  PASSWORD_RESET_MERXUS: 'd-634ccb3b1ac24c7a89f073bfafba192f',
  
  // Other templates
  RESERVATION_SUMMARY: 'd-0879e7e7222748e79f624f2844596a07',
  AI_TRANSCRIPT_SUMMARY: 'd-1112e02ff8294cc780be50ac8235d261',
} as const;

/**
 * Helper function to get template ID from config or use default
 */
export function getTemplateId(
  configKey: string,
  defaultId: string
): string {
  try {
    // Try to import firebase-functions (only works in Cloud Functions environment)
    const functions = require('firebase-functions');
    // Handle both v1 and v2 syntax
    const config = functions.default?.config?.() || functions.config?.();
    return config?.sendgrid?.[configKey] || process.env[`SENDGRID_TEMPLATE_${configKey.toUpperCase()}`] || defaultId;
  } catch {
    // Fallback to environment variable or default
    return process.env[`SENDGRID_TEMPLATE_${configKey.toUpperCase()}`] || defaultId;
  }
}

