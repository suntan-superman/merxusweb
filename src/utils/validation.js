/**
 * Zod Validation Schemas
 * 
 * Centralized validation schemas for forms across the application.
 * Used in flyovers, settings pages, and onboarding forms.
 * 
 * @module utils/validation
 */

import { z } from 'zod';

// ============================================================
// Common Field Schemas (Reusable)
// ============================================================

/**
 * Phone number validation (US format)
 * Accepts: (123) 456-7890, 123-456-7890, 1234567890, +1 123 456 7890
 */
export const phoneSchema = z
  .string()
  .transform((val) => val.replace(/\D/g, '')) // Strip non-digits
  .refine((val) => val.length === 0 || val.length === 10 || val.length === 11, {
    message: 'Phone number must be 10 digits (or 11 with country code)',
  });

/**
 * Required phone number
 */
export const requiredPhoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .transform((val) => val.replace(/\D/g, ''))
  .refine((val) => val.length === 10 || val.length === 11, {
    message: 'Phone number must be 10 digits',
  });

/**
 * Email validation
 */
export const emailSchema = z
  .string()
  .email('Please enter a valid email address');

/**
 * Optional email
 */
export const optionalEmailSchema = z
  .string()
  .email('Please enter a valid email address')
  .or(z.literal(''))
  .optional();

/**
 * URL validation
 */
export const urlSchema = z
  .string()
  .url('Please enter a valid URL')
  .or(z.literal(''))
  .optional();

/**
 * Business hours schema for a single day
 */
export const dayHoursSchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  close: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  closed: z.boolean(),
});

/**
 * Full week business hours
 */
export const businessHoursSchema = z.object({
  monday: dayHoursSchema,
  tuesday: dayHoursSchema,
  wednesday: dayHoursSchema,
  thursday: dayHoursSchema,
  friday: dayHoursSchema,
  saturday: dayHoursSchema,
  sunday: dayHoursSchema,
});

// ============================================================
// Estate (Real Estate) Schemas
// ============================================================

/**
 * Estate flyover - Brand step
 */
export const estateBrandSchema = z.object({
  agentName: z.string().min(2, 'Name must be at least 2 characters'),
  brokerageName: z.string().optional(),
  licenseNumber: z.string().optional(),
});

/**
 * Estate flyover - Contact step
 */
export const estateContactSchema = z.object({
  email: emailSchema,
  phoneNumber: phoneSchema.optional(),
  websiteUrl: urlSchema,
});

/**
 * Estate flyover - Phone setup step (Twilio)
 */
export const estatePhoneSetupSchema = z.object({
  twilioPhoneNumber: z.string().optional(),
  twilioAccountSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
});

/**
 * Estate flyover - Voice selection step
 */
export const estateVoiceSchema = z.object({
  voiceName: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'ballad', 'coral']),
  promptTemplate: z.string().optional(),
  customInstructions: z.string().max(2000, 'Instructions must be under 2000 characters').optional(),
});

/**
 * Estate flyover - Complete form
 */
export const estateSettingsSchema = z.object({
  agentName: z.string().min(2, 'Agent name is required'),
  brokerageName: z.string().optional(),
  licenseNumber: z.string().optional(),
  email: emailSchema,
  phoneNumber: phoneSchema.optional(),
  websiteUrl: urlSchema,
  twilioPhoneNumber: z.string().optional(),
  twilioAccountSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
  voiceName: z.string().default('alloy'),
  systemPrompt: z.string().optional(),
  businessHours: businessHoursSchema.optional(),
});

// ============================================================
// Voice/Office Schemas
// ============================================================

/**
 * Voice flyover - Business step
 */
export const voiceBusinessSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  businessType: z.string().optional(),
});

/**
 * Voice flyover - Contact step
 */
export const voiceContactSchema = z.object({
  email: emailSchema,
  phoneNumber: phoneSchema.optional(),
  address: z.string().optional(),
  websiteUrl: urlSchema,
});

/**
 * Voice flyover - Industry step
 */
export const voiceIndustrySchema = z.object({
  category: z.string().min(1, 'Please select a category'),
  industry: z.string().min(1, 'Please select an industry'),
});

/**
 * Voice flyover - Services step
 */
export const voiceServicesSchema = z.object({
  servicesDescription: z.string().max(2000, 'Description must be under 2000 characters').optional(),
});

/**
 * Voice flyover - Phone setup step (Twilio)
 */
export const voicePhoneSetupSchema = z.object({
  twilioPhoneNumber: z.string().optional(),
  twilioAccountSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
});

/**
 * Voice flyover - Voice selection step
 */
export const voiceVoiceSchema = z.object({
  voiceName: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'ballad', 'coral']),
});

/**
 * Voice settings - Complete form
 */
export const voiceSettingsSchema = z.object({
  name: z.string().min(2, 'Business name is required'),
  email: emailSchema,
  phoneNumber: phoneSchema.optional(),
  address: z.string().optional(),
  websiteUrl: urlSchema,
  businessType: z.string().optional(),
  twilioPhoneNumber: z.string().optional(),
  twilioAccountSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
  aiConfig: z.object({
    voiceName: z.string().default('alloy'),
    systemPrompt: z.string().optional(),
  }).optional(),
  businessHours: businessHoursSchema.optional(),
});

// ============================================================
// Restaurant Schemas
// ============================================================

/**
 * Restaurant settings schema
 */
export const restaurantSettingsSchema = z.object({
  name: z.string().min(2, 'Restaurant name is required'),
  email: emailSchema,
  phoneNumber: phoneSchema.optional(),
  address: z.string().optional(),
  websiteUrl: urlSchema,
  cuisineType: z.string().optional(),
  twilioPhoneNumber: z.string().optional(),
  businessHours: businessHoursSchema.optional(),
});

// ============================================================
// User/Auth Schemas
// ============================================================

/**
 * User invitation schema
 */
export const inviteUserSchema = z.object({
  email: emailSchema,
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['owner', 'manager', 'staff', 'viewer']),
});

/**
 * Password validation
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// ============================================================
// Helper Functions
// ============================================================

/**
 * Validate data against a schema and return formatted errors
 * 
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {any} data - Data to validate
 * @returns {{ success: boolean, data?: any, errors?: Record<string, string> }}
 * 
 * @example
 * const result = validateForm(estateBrandSchema, { agentName: 'John' });
 * if (!result.success) {
 *   setErrors(result.errors);
 * }
 */
export function validateForm(schema, data) {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  // Convert Zod errors to a simple field -> message map
  const errors = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  });
  
  return { success: false, errors };
}

/**
 * Validate a single field
 * 
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {string} field - Field name
 * @param {any} value - Value to validate
 * @returns {string | null} - Error message or null if valid
 */
export function validateField(schema, field, value) {
  try {
    // Create a partial object with just this field
    const partialSchema = schema.pick({ [field]: true });
    partialSchema.parse({ [field]: value });
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues[0]?.message || 'Invalid value';
    }
    return 'Validation error';
  }
}

/**
 * Create a hook-friendly validation function
 * Returns errors object compatible with form state
 */
export function createValidator(schema) {
  return (data) => validateForm(schema, data);
}
