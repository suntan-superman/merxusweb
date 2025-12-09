/**
 * Phone Number Formatting Utilities
 * Provides consistent phone number formatting across the entire app
 */

/**
 * Format a phone number as user types (US format)
 * Accepts various inputs and formats to (XXX) XXX-XXXX
 * @param {string} value - The input value
 * @returns {string} - Formatted phone number
 */
export function formatPhoneInput(value) {
  if (!value) return '';
  
  // Remove all non-digits
  const numbers = value.replace(/\D/g, '');
  
  // Limit to 10 digits
  const limited = numbers.slice(0, 10);
  
  // Format as (XXX) XXX-XXXX
  if (limited.length <= 3) {
    return limited;
  } else if (limited.length <= 6) {
    return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  } else {
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
  }
}

/**
 * Format a phone number for display (adds +1 for US numbers)
 * @param {string} phone - Raw phone number
 * @returns {string} - Formatted display number like +1 (661) 234-5678
 */
export function formatPhoneDisplay(phone) {
  if (!phone) return '';
  
  // Remove all non-digits
  const numbers = phone.replace(/\D/g, '');
  
  // Handle 10-digit US numbers
  if (numbers.length === 10) {
    return `+1 (${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`;
  }
  
  // Handle 11-digit numbers starting with 1
  if (numbers.length === 11 && numbers.startsWith('1')) {
    return `+1 (${numbers.slice(1, 4)}) ${numbers.slice(4, 7)}-${numbers.slice(7)}`;
  }
  
  // Handle international or non-standard
  if (numbers.length > 10) {
    return `+${numbers}`;
  }
  
  // Fallback: return as-is if can't format
  return phone;
}

/**
 * Get the raw phone number (digits only)
 * @param {string} phone - Formatted phone number
 * @returns {string} - Raw digits
 */
export function getRawPhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Validate if phone number is valid (10 digits for US)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
export function isValidPhone(phone) {
  const numbers = phone.replace(/\D/g, '');
  return numbers.length === 10;
}

/**
 * Format phone to E.164 format for Twilio (+1XXXXXXXXXX)
 * @param {string} phone - Phone number
 * @returns {string} - E.164 formatted number
 */
export function toE164(phone) {
  if (!phone) return '';
  const numbers = phone.replace(/\D/g, '');
  
  // Add +1 for US numbers
  if (numbers.length === 10) {
    return `+1${numbers}`;
  }
  
  // Already has country code
  if (numbers.length === 11 && numbers.startsWith('1')) {
    return `+${numbers}`;
  }
  
  // International or already formatted
  if (phone.startsWith('+')) {
    return phone;
  }
  
  return `+${numbers}`;
}

/**
 * React hook for phone input handling
 * Returns formatted value and onChange handler
 * @param {string} initialValue - Initial phone value
 * @param {function} onChangeCallback - Callback when value changes
 * @returns {object} - { value, onChange, rawValue, isValid }
 */
export function usePhoneInput(initialValue = '', onChangeCallback) {
  const [value, setValue] = React.useState(formatPhoneInput(initialValue));
  
  const onChange = (e) => {
    const formatted = formatPhoneInput(e.target.value);
    setValue(formatted);
    
    if (onChangeCallback) {
      onChangeCallback({
        formatted,
        raw: getRawPhone(formatted),
        e164: toE164(formatted),
        isValid: isValidPhone(formatted),
      });
    }
  };
  
  return {
    value,
    onChange,
    rawValue: getRawPhone(value),
    isValid: isValidPhone(value),
  };
}
