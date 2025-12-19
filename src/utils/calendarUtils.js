/**
 * Calendar Utilities for Web
 * Generate ICS files and provide calendar integration for callbacks
 */

/**
 * Format date to ICS format (YYYYMMDDTHHMMSS)
 * @param {Date} date - Date to format
 * @returns {string} ICS formatted date
 */
function formatICSDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/**
 * Generate a unique UID for ICS event
 * @returns {string} Unique identifier
 */
function generateUID() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@merxus.app`;
}

/**
 * Escape special characters for ICS format
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeICS(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Parse Firestore timestamp to Date
 * @param {any} timestamp - Firestore timestamp or date string
 * @returns {Date} Parsed date
 */
function parseTimestamp(timestamp) {
  if (!timestamp) return new Date();
  
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  } else if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  } else if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000);
  } else {
    return new Date(timestamp);
  }
}

/**
 * Generate ICS file content for a callback/message
 * @param {Object} data - Callback or message data
 * @param {Object} options - Optional settings
 * @returns {string} ICS file content
 */
export function generateICSContent(data, options = {}) {
  const callerName = data.callerName || data.customerName || data.name || 'Unknown Caller';
  const callerPhone = data.callerPhone || data.phoneNumber || data.phone || '';
  const message = data.notes || data.summary || data.message || data.reason || '';
  
  // Parse the timestamp
  const eventDate = parseTimestamp(data.createdAt || data.timestamp);
  
  // Set event start time (use callback time or next business hour if after hours)
  const startDate = new Date(eventDate);
  const hour = startDate.getHours();
  
  // If call came in outside business hours (before 8am or after 6pm), set to next 9am
  if (hour < 8 || hour >= 18) {
    startDate.setHours(9, 0, 0, 0);
    if (hour >= 18) {
      startDate.setDate(startDate.getDate() + 1);
    }
  }
  
  // Event duration - 15 minutes for callback reminder
  const endDate = new Date(startDate.getTime() + 15 * 60 * 1000);
  
  // Build description
  const description = [
    `Callback requested from ${callerName}`,
    callerPhone ? `Phone: ${callerPhone}` : '',
    message ? `Message: ${message}` : '',
    '',
    'Call was received: ' + eventDate.toLocaleString(),
  ].filter(Boolean).join('\\n');
  
  // Generate ICS content
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Merxus//Callback Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${generateUID()}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:📞 Callback: ${escapeICS(callerName)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    callerPhone ? `LOCATION:tel:${callerPhone.replace(/\D/g, '')}` : '',
    // Reminder alarm - triggers at event time
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Callback reminder for ${escapeICS(callerName)}`,
    'END:VALARM',
    // Second alarm - 5 minutes before
    'BEGIN:VALARM',
    'TRIGGER:-PT5M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Callback reminder for ${escapeICS(callerName)} in 5 minutes`,
    'END:VALARM',
    'STATUS:CONFIRMED',
    'PRIORITY:1',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  
  return icsContent;
}

/**
 * Download ICS file for a callback
 * @param {Object} data - Callback or message data
 */
export function downloadICSFile(data) {
  const icsContent = generateICSContent(data);
  const callerName = data.callerName || data.customerName || data.name || 'callback';
  const fileName = `callback_${callerName.replace(/\s+/g, '_')}_${Date.now()}.ics`;
  
  // Create blob and download
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Generate Google Calendar URL for adding event
 * @param {Object} data - Callback or message data
 * @returns {string} Google Calendar URL
 */
export function getGoogleCalendarUrl(data) {
  const callerName = data.callerName || data.customerName || data.name || 'Unknown Caller';
  const callerPhone = data.callerPhone || data.phoneNumber || data.phone || '';
  const message = data.notes || data.summary || data.message || data.reason || '';
  
  const eventDate = parseTimestamp(data.createdAt || data.timestamp);
  
  const startDate = new Date(eventDate);
  const hour = startDate.getHours();
  if (hour < 8 || hour >= 18) {
    startDate.setHours(9, 0, 0, 0);
    if (hour >= 18) {
      startDate.setDate(startDate.getDate() + 1);
    }
  }
  
  const endDate = new Date(startDate.getTime() + 15 * 60 * 1000);
  
  // Format dates for Google Calendar (YYYYMMDDTHHMMSS format)
  const formatGoogleDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  
  const title = encodeURIComponent(`📞 Callback: ${callerName}`);
  const details = encodeURIComponent([
    `Callback requested from ${callerName}`,
    callerPhone ? `Phone: ${callerPhone}` : '',
    message ? `Message: ${message}` : '',
    '',
    'Call was received: ' + eventDate.toLocaleString(),
  ].filter(Boolean).join('\n'));
  
  const location = callerPhone ? encodeURIComponent(`tel:${callerPhone.replace(/\D/g, '')}`) : '';
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}&details=${details}&location=${location}`;
}

/**
 * Generate Outlook.com calendar URL for adding event
 * @param {Object} data - Callback or message data
 * @returns {string} Outlook calendar URL
 */
export function getOutlookCalendarUrl(data) {
  const callerName = data.callerName || data.customerName || data.name || 'Unknown Caller';
  const callerPhone = data.callerPhone || data.phoneNumber || data.phone || '';
  const message = data.notes || data.summary || data.message || data.reason || '';
  
  const eventDate = parseTimestamp(data.createdAt || data.timestamp);
  
  const startDate = new Date(eventDate);
  const hour = startDate.getHours();
  if (hour < 8 || hour >= 18) {
    startDate.setHours(9, 0, 0, 0);
    if (hour >= 18) {
      startDate.setDate(startDate.getDate() + 1);
    }
  }
  
  const endDate = new Date(startDate.getTime() + 15 * 60 * 1000);
  
  const title = encodeURIComponent(`📞 Callback: ${callerName}`);
  const body = encodeURIComponent([
    `Callback requested from ${callerName}`,
    callerPhone ? `Phone: ${callerPhone}` : '',
    message ? `Message: ${message}` : '',
    '',
    'Call was received: ' + eventDate.toLocaleString(),
  ].filter(Boolean).join('\n'));
  
  const location = callerPhone ? encodeURIComponent(`tel:${callerPhone.replace(/\D/g, '')}`) : '';
  
  // Outlook.com URL format
  return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&body=${body}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&location=${location}&path=/calendar/action/compose&rru=addevent`;
}

/**
 * Open calendar selection modal/dropdown
 * This is a utility object that components can use
 */
export const CalendarOptions = {
  GOOGLE: 'google',
  OUTLOOK: 'outlook',
  APPLE: 'apple',  // Uses ICS download
  DOWNLOAD: 'download', // Generic ICS download
};

/**
 * Add to calendar based on selected option
 * @param {Object} data - Callback or message data
 * @param {string} option - Calendar option (google, outlook, apple, download)
 */
export function addToCalendar(data, option) {
  switch (option) {
    case CalendarOptions.GOOGLE:
      window.open(getGoogleCalendarUrl(data), '_blank');
      break;
    case CalendarOptions.OUTLOOK:
      window.open(getOutlookCalendarUrl(data), '_blank');
      break;
    case CalendarOptions.APPLE:
    case CalendarOptions.DOWNLOAD:
    default:
      downloadICSFile(data);
      break;
  }
}
