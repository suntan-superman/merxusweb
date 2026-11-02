import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOnboardingPayload } from './onboardingPayload.js';

const base = {
  businessName: 'Sell My Kern Home',
  ownerName: 'Adam Teagarden',
  email: 'owner@example.com',
  phone: '(661) 555-5407',
  address: '8612 Mainsail Drive',
  city: 'Bakersfield',
  state: 'CA',
  zip: '93312',
  timezone: 'America/Los_Angeles',
  website: 'https://sellmykernhome.com',
  aiVoice: 'alloy',
  industryData: {},
};

test('real estate onboarding preserves business, team, phone, website, location, and timezone', () => {
  const payload = buildOnboardingPayload({
    ...base,
    tenantType: 'real_estate',
    industryData: {
      brandName: 'The Sell My Kern Home Team',
      brokerage: 'SMKH Realty',
      licenseNumber: 'DRE 1234',
      markets: 'Bakersfield, Kern County',
    },
  });

  assert.equal(payload.agent.brandName, 'The Sell My Kern Home Team');
  assert.equal(payload.agent.agentName, 'The Sell My Kern Home Team');
  assert.equal(payload.agent.organizationName, 'Sell My Kern Home');
  assert.equal(payload.agent.phoneNumber, '(661) 555-5407');
  assert.equal(payload.agent.phonePrimary, '(661) 555-5407');
  assert.equal(payload.agent.websiteUrl, 'https://sellmykernhome.com');
  assert.equal(payload.agent.timezone, 'America/Los_Angeles');
  assert.deepEqual(payload.agent.markets, ['Bakersfield', 'Kern County']);
});

test('office and general onboarding preserve services and industry fields', () => {
  const payload = buildOnboardingPayload({
    ...base,
    tenantType: 'general',
    industryData: { industry: 'Home Services', aiPurpose: 'Schedule estimates' },
  });

  assert.equal(payload.office.organizationName, 'Sell My Kern Home');
  assert.equal(payload.office.businessType, 'Home Services');
  assert.equal(payload.office.services, 'Schedule estimates');
  assert.equal(payload.office.websiteUrl, 'https://sellmykernhome.com');
});

test('restaurant defaults match the visible yes selections', () => {
  const payload = buildOnboardingPayload({
    ...base,
    tenantType: 'restaurant',
    industryData: { cuisineType: 'Italian', description: 'Neighborhood restaurant' },
  });

  assert.equal(payload.restaurant.dineIn, true);
  assert.equal(payload.restaurant.delivery, true);
  assert.equal(payload.restaurant.timezone, 'America/Los_Angeles');
  assert.equal(payload.restaurant.websiteUrl, 'https://sellmykernhome.com');
});
