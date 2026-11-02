function compactString(value) {
  return typeof value === 'string' ? value.trim() : value;
}

export function parseOnboardingMarkets(value) {
  if (Array.isArray(value)) {
    return value.map(compactString).filter(Boolean);
  }

  if (typeof value !== 'string') return [];
  return value
    .split(/[,\n]/)
    .map((market) => market.trim())
    .filter(Boolean);
}

function commonBusinessFields(wizardData) {
  const websiteUrl = compactString(wizardData.website) || '';

  return {
    email: compactString(wizardData.email),
    address: compactString(wizardData.address) || '',
    city: compactString(wizardData.city) || '',
    state: compactString(wizardData.state) || '',
    zip: compactString(wizardData.zip) || '',
    timezone: wizardData.timezone || 'America/Los_Angeles',
    website: websiteUrl,
    websiteUrl,
    twilioPhoneNumber: wizardData.twilioPhoneNumber || '',
    twilioPhoneSid: wizardData.twilioPhoneSid || '',
    twilioAccountSid: wizardData.twilioAccountSid || '',
    twilioAuthToken: wizardData.twilioAuthToken || '',
    aiVoice: wizardData.aiVoice || 'alloy',
  };
}

/**
 * Build the canonical request body used by both public and admin onboarding.
 * The backend still accepts legacy aliases, but new clients send both the
 * canonical profile fields and compatibility aliases during migration.
 */
export function buildOnboardingPayload(wizardData, options = {}) {
  const email = compactString(options.email || wizardData.email);
  const owner = {
    displayName: compactString(wizardData.ownerName),
    email,
    ...(options.authPayload || {}),
  };
  const common = {
    ...commonBusinessFields({ ...wizardData, email }),
  };
  const industryData = wizardData.industryData || {};
  const businessName = compactString(wizardData.businessName) || '';
  const phoneNumber = compactString(wizardData.phone) || '';

  if (wizardData.tenantType === 'restaurant') {
    return {
      restaurant: {
        ...common,
        name: businessName,
        businessName,
        phoneNumber,
        cuisineType: compactString(industryData.cuisineType) || '',
        description: compactString(industryData.description) || '',
        dineIn: industryData.dineIn !== 'no',
        delivery: industryData.delivery !== 'no',
      },
      manager: owner,
    };
  }

  if (wizardData.tenantType === 'voice' || wizardData.tenantType === 'general') {
    const businessType = compactString(industryData.businessType || industryData.industry) || '';
    const services = compactString(industryData.services || industryData.aiPurpose) || '';

    return {
      office: {
        ...common,
        name: businessName,
        businessName,
        organizationName: businessName,
        phoneNumber,
        businessType,
        services,
        description: services,
      },
      owner,
    };
  }

  if (wizardData.tenantType === 'real_estate') {
    const ownerName = compactString(wizardData.ownerName) || '';
    const brandName = compactString(industryData.brandName) || ownerName;

    return {
      agent: {
        ...common,
        name: ownerName,
        agentName: brandName,
        brandName,
        businessName,
        organizationName: businessName || compactString(industryData.brokerage) || brandName,
        phone: phoneNumber,
        phoneNumber,
        phonePrimary: phoneNumber,
        brokerage: compactString(industryData.brokerage) || '',
        licenseNumber: compactString(industryData.licenseNumber) || '',
        markets: parseOnboardingMarkets(industryData.markets),
      },
      owner,
    };
  }

  throw new Error(`Unsupported tenant type: ${wizardData.tenantType || 'missing'}`);
}
