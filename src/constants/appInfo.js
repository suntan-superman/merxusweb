// Centralized app information and copyright notices
// Update these values in one place to reflect across the entire app

export const APP_INFO = {
  // App Details
  name: 'Merxus',
  tagline: 'Your AI Assistant',
  version: '1.0.0',
  
  // Company Information
  companyName: 'Workside Software LLC',
  brandName: 'Merxus',
  
  // Copyright Year - UPDATE THIS ANNUALLY
  copyrightYear: 2026,
  
  // Generated Copyright Strings
  get fullCopyright() {
    return `© ${this.copyrightYear} ${this.companyName}. All rights reserved.`;
  },
  
  get brandCopyright() {
    return `© ${this.copyrightYear} ${this.brandName}. All rights reserved.`;
  },
  
  // URLs
  termsUrl: 'https://www.worksidellc.com/terms',
  privacyUrl: 'https://www.worksidellc.com/privacy',
  supportEmail: 'support@merxusllc.com',
};

export default APP_INFO;
