function firstPresentValue(...values) {
  return values.find((value) => (
    typeof value === 'string' ? value.trim().length > 0 : value != null
  )) || '';
}

export function resolveRealEstateCompanyPhones(agentData = {}, settings = {}) {
  const businessPhone = firstPresentValue(
    settings.phoneNumber,
    settings.phonePrimary,
    settings.phone,
    agentData.phoneNumber,
    agentData.phonePrimary,
    agentData.phone,
  );
  const merxusAiPhone = firstPresentValue(
    settings.twilioPhoneNumber,
    agentData.twilioPhoneNumber,
  );

  return {
    businessPhone,
    merxusAiPhone,
  };
}

