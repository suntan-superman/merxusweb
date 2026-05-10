import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createPublicChatSession,
  publicChatErrorMessage,
  requestPublicDemo,
  requestPublicChatHuman,
} from '../../api/publicChat';
import {
  getCampaignAttribution,
  trackMetaCustomEvent,
  trackMetaEvent,
  trackMetaLeadOnce,
} from '../../utils/metaPixel';
import { formatPhoneInput, getRawPhone } from '../../utils/phoneFormatter';

const BUSINESS_TYPE_OPTIONS = [
  { value: 'office', label: 'Office / Professional Services' },
  { value: 'real_estate_agent', label: 'Real Estate Agent' },
  { value: 'real_estate_team', label: 'Real Estate Broker / Team' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'home_services', label: 'Home Services' },
  { value: 'other', label: 'Other' },
];

const CONTACT_METHOD_OPTIONS = [
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
];

function normalizePhone(value) {
  return getRawPhone(value);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || '').trim());
}

function createInitialLead(content) {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    businessType: content.businessTypeValue || content.theme || 'office',
    teamSize: '',
    primaryNeed: content.defaultPrimaryNeed || '',
    preferredContactMethod: 'phone',
  };
}

function getThemeClasses(theme) {
  switch (theme) {
    case 'restaurant':
      return {
        pageBg: 'bg-gradient-to-b from-orange-50 via-white to-rose-50',
        heroPanel: 'bg-gradient-to-br from-orange-600 via-orange-500 to-rose-500 text-white',
        accentText: 'text-orange-600',
        accentSoftText: 'text-orange-100',
        accentBg: 'bg-orange-500',
        accentBorder: 'border-orange-200',
        accentCard: 'bg-orange-50',
        accentPill: 'bg-orange-100 text-orange-800',
        accentRing: 'ring-orange-200',
        accentButton: 'bg-orange-500 hover:bg-orange-400 text-white',
        secondaryButton: 'border-orange-200 text-orange-700 hover:bg-orange-50',
        sectionHighlight: 'bg-gradient-to-r from-orange-50 to-rose-50 border-orange-100',
      };
    case 'real-estate':
      return {
        pageBg: 'bg-gradient-to-b from-stone-50 via-white to-sky-50',
        heroPanel: 'bg-gradient-to-br from-slate-900 via-slate-800 to-sky-700 text-white',
        accentText: 'text-sky-700',
        accentSoftText: 'text-sky-100',
        accentBg: 'bg-sky-600',
        accentBorder: 'border-sky-200',
        accentCard: 'bg-sky-50',
        accentPill: 'bg-sky-100 text-sky-800',
        accentRing: 'ring-sky-200',
        accentButton: 'bg-sky-600 hover:bg-sky-500 text-white',
        secondaryButton: 'border-sky-200 text-sky-700 hover:bg-sky-50',
        sectionHighlight: 'bg-gradient-to-r from-sky-50 to-stone-50 border-sky-100',
      };
    case 'office':
    default:
      return {
        pageBg: 'bg-gradient-to-b from-emerald-50 via-white to-teal-50',
        heroPanel: 'bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 text-white',
        accentText: 'text-emerald-700',
        accentSoftText: 'text-emerald-100',
        accentBg: 'bg-emerald-500',
        accentBorder: 'border-emerald-200',
        accentCard: 'bg-emerald-50',
        accentPill: 'bg-emerald-100 text-emerald-800',
        accentRing: 'ring-emerald-200',
        accentButton: 'bg-emerald-500 hover:bg-emerald-400 text-black',
        secondaryButton: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
        sectionHighlight: 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100',
      };
  }
}

export default function VerticalLandingPage({ content }) {
  const theme = getThemeClasses(content.theme);
  const [lead, setLead] = useState(() => createInitialLead(content));
  const [leadStatus, setLeadStatus] = useState({ state: 'idle', message: '', sessionId: '' });
  const attribution = useMemo(() => getCampaignAttribution(), []);
  const leadName = `${lead.firstName} ${lead.lastName}`.trim();
  const canSubmit =
    lead.firstName.trim().length >= 2 &&
    lead.lastName.trim().length >= 2 &&
    isValidEmail(lead.email) &&
    normalizePhone(lead.phone).length >= 10 &&
    lead.companyName.trim().length >= 2;

  function updateLead(field, value) {
    const nextValue = field === 'phone' ? formatPhoneInput(value) : value;
    setLead((current) => ({ ...current, [field]: nextValue }));
    if (leadStatus.state === 'error') {
      setLeadStatus({ state: 'idle', message: '', sessionId: '' });
    }
  }

  function buildLeadMessage() {
    return [
      `Paid social lead for ${content.tenantLabel || content.eyebrow}.`,
      `Name: ${leadName}`,
      `Email: ${lead.email.trim()}`,
      `Phone: ${lead.phone.trim()}`,
      `Company: ${lead.companyName.trim()}`,
      `Business type: ${lead.businessType}`,
      `Team/locations: ${lead.teamSize || 'Not provided'}`,
      `Primary need: ${lead.primaryNeed || 'Not provided'}`,
      `Preferred contact: ${lead.preferredContactMethod}`,
    ].join('\n');
  }

  async function handleLeadSubmit(event) {
    event.preventDefault();
    if (!canSubmit || leadStatus.state === 'submitting') return;

    setLeadStatus({ state: 'submitting', message: 'Sending your request...', sessionId: '' });
    const payload = {
      product: 'merxus',
      tenantId: 'merxus-platform',
      tenantType: content.tenantType || content.theme || 'office',
      source: 'meta_ads',
      sourceUrl: window.location.href,
      visitorId: attribution.fbclid || `landing_${Date.now()}`,
      initialIntent: 'sales',
      initialMessage: buildLeadMessage(),
      leadName,
      leadEmail: lead.email.trim(),
      leadPhone: lead.phone.trim(),
      leadCompany: lead.companyName.trim(),
      businessType: lead.businessType,
      preferredContactMethod: lead.preferredContactMethod,
      inquiryCaptured: Boolean(lead.primaryNeed),
      leadCaptured: true,
      marketingLead: {
        ...lead,
        fullName: leadName,
        source: 'meta_ads',
        tenantType: content.tenantType || content.theme || 'office',
      },
      campaign: attribution,
      appBaseUrl: window.location.origin,
    };

    try {
      const result = await createPublicChatSession(payload);
      const sessionId = result.session?.id || '';
      trackMetaLeadOnce(`${content.theme}:${lead.email.trim().toLowerCase()}`, {
        product: 'merxus',
        industry: content.tenantType || content.theme,
        source: 'meta_ads',
        ...attribution,
      });
      setLeadStatus({
        state: 'submitted',
        message: 'Thanks. We captured your request and can route you to the next step.',
        sessionId,
      });
    } catch (error) {
      setLeadStatus({
        state: 'error',
        message: publicChatErrorMessage(error),
        sessionId: '',
      });
    }
  }

  async function handleChatWithPerson() {
    if (!leadStatus.sessionId) return;
    setLeadStatus((current) => ({ ...current, state: 'submitting', message: 'Notifying the team...' }));
    try {
      await requestPublicChatHuman(leadStatus.sessionId, {
        visitorId: attribution.fbclid || `landing_${Date.now()}`,
        leadName,
        leadEmail: lead.email.trim(),
        message: 'I would like to chat with a person about booking a demo.',
        reason: 'demo_chat_requested',
        appBaseUrl: window.location.origin,
      });
      window.dispatchEvent(new CustomEvent('merxus:open-public-chat', {
        detail: {
          action: 'open',
          sessionId: leadStatus.sessionId,
          visitorId: attribution.fbclid || `landing_${Date.now()}`,
          leadName,
          leadEmail: lead.email.trim(),
          humanRequested: true,
          teamNotice: true,
        },
      }));
      trackMetaCustomEvent('MerxusChatOpened', {
        product: 'merxus',
        industry: content.tenantType || content.theme,
        source: 'meta_ads_lead_form',
        ...attribution,
      });
      setLeadStatus((current) => ({
        ...current,
        state: 'submitted',
        message: 'The team has been notified and the chat window is open.',
      }));
    } catch (error) {
      setLeadStatus((current) => ({
        ...current,
        state: 'error',
        message: publicChatErrorMessage(error),
      }));
    }
  }

  async function handleBookDemo() {
    if (!leadStatus.sessionId || leadStatus.state === 'submitting') return;
    setLeadStatus((current) => ({ ...current, state: 'submitting', message: 'Sending your demo request...' }));
    try {
      await requestPublicDemo({
        product: 'merxus',
        tenantType: content.tenantType || content.theme || 'office',
        vertical: content.tenantLabel || content.eyebrow || content.theme,
        source: 'meta_ads',
        sourceUrl: window.location.href,
        sessionId: leadStatus.sessionId,
        visitorId: attribution.fbclid || `landing_${Date.now()}`,
        leadName,
        leadEmail: lead.email.trim(),
        leadPhone: lead.phone.trim(),
        leadCompany: lead.companyName.trim(),
        businessType: lead.businessType,
        teamSize: lead.teamSize,
        primaryNeed: lead.primaryNeed,
        preferredContactMethod: lead.preferredContactMethod,
        campaign: attribution,
      });
      trackMetaEvent('Schedule', {
        product: 'merxus',
        industry: content.tenantType || content.theme,
        source: 'meta_ads_lead_form',
        ...attribution,
      });
      setLeadStatus((current) => ({
        ...current,
        state: 'submitted',
        message: 'Demo request sent. We will follow up using your preferred contact method.',
      }));
    } catch (error) {
      setLeadStatus((current) => ({
        ...current,
        state: 'error',
        message: publicChatErrorMessage(error),
      }));
    }
  }

  return (
    <div className={`min-h-screen ${theme.pageBg}`}>
      <section className="px-4 pb-12 pt-12">
        <div className="mx-auto max-w-6xl">
          <div className={`overflow-hidden rounded-[32px] shadow-2xl ${theme.heroPanel}`}>
            <div className="grid gap-10 px-6 py-10 md:grid-cols-[1.2fr,0.8fr] md:px-10 md:py-14">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/75">
                  {content.eyebrow}
                </p>
                <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight md:text-6xl">
                  {content.heroTitle}
                </h1>
                <p className={`mt-5 max-w-2xl text-base md:text-lg ${theme.accentSoftText}`}>
                  {content.heroSubtitle}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to={content.setupHref}
                    onClick={() => trackMetaCustomEvent('MerxusOnboardingStarted', {
                      product: 'merxus',
                      industry: content.tenantType || content.theme,
                      source: 'paid_social_landing',
                      ...attribution,
                    })}
                    className={`inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold shadow-lg transition ${theme.accentButton}`}
                  >
                    {content.primaryCta}
                  </Link>
                <a
                  href="#lead-form"
                  onClick={() => trackMetaEvent('Schedule', {
                    product: 'merxus',
                    industry: content.tenantType || content.theme,
                    source: 'paid_social_landing',
                    ...attribution,
                    })}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                  >
                    {content.secondaryCta}
                  </a>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {content.heroBullets.map((bullet) => (
                    <div key={bullet} className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                      <span className="mt-0.5 text-lg">✓</span>
                      <span className="text-sm text-white/90">{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-[28px] bg-black/15 p-6 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/65">Why teams switch</p>
                  <div className="mt-4 grid gap-3">
                    {content.valuePoints.map((item) => (
                      <div key={item.title} className="rounded-2xl bg-white/10 px-4 py-4">
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-1 text-sm text-white/75">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {content.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-2xl bg-white/10 px-4 py-4 text-center backdrop-blur-sm">
                      <p className="text-2xl font-black text-white md:text-3xl">{metric.value}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/65">{metric.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="lead-form" className="px-4 py-6">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr,1.1fr]">
          <div className={`rounded-[28px] border px-6 py-8 md:px-8 ${theme.sectionHighlight}`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${theme.accentText}`}>See Merxus In Action</p>
            <h2 className="mt-3 text-3xl font-black text-gray-900 md:text-4xl">{content.formTitle || 'Get a workflow-specific demo'}</h2>
            <p className="mt-4 text-base leading-7 text-gray-700">
              {content.formIntro || 'Tell us how your team handles customer requests today. We will use this to route the right Merxus setup path.'}
            </p>
            <div className="mt-6 grid gap-3">
              {(content.formHighlights || [
                'No per-call charges',
                'Fast onboarding path',
                'Mobile app and team alerts',
                'Human takeover when needed',
              ]).map((item) => (
                <div key={item} className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-medium text-gray-800 ring-1 ring-black/5">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleLeadSubmit} className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-gray-200 md:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-gray-800">
                First name
                <input
                  value={lead.firstName}
                  onChange={(event) => updateLead('firstName', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-normal outline-none transition focus:border-gray-900"
                  autoComplete="given-name"
                  required
                />
              </label>
              <label className="text-sm font-semibold text-gray-800">
                Last name
                <input
                  value={lead.lastName}
                  onChange={(event) => updateLead('lastName', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-normal outline-none transition focus:border-gray-900"
                  autoComplete="family-name"
                  required
                />
              </label>
              <label className="text-sm font-semibold text-gray-800">
                Email
                <input
                  value={lead.email}
                  onChange={(event) => updateLead('email', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-normal outline-none transition focus:border-gray-900"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="text-sm font-semibold text-gray-800">
                Phone
                <input
                  value={lead.phone}
                  onChange={(event) => updateLead('phone', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-normal outline-none transition focus:border-gray-900"
                  type="tel"
                  autoComplete="tel"
                  placeholder="(555) 555-5555"
                  required
                />
              </label>
              <label className="text-sm font-semibold text-gray-800 sm:col-span-2">
                Company name
                <input
                  value={lead.companyName}
                  onChange={(event) => updateLead('companyName', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-normal outline-none transition focus:border-gray-900"
                  autoComplete="organization"
                  required
                />
              </label>
              <label className="text-sm font-semibold text-gray-800">
                Business type
                <select
                  value={lead.businessType}
                  onChange={(event) => updateLead('businessType', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-gray-900"
                >
                  {BUSINESS_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-800">
                Employees or locations
                <input
                  value={lead.teamSize}
                  onChange={(event) => updateLead('teamSize', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-normal outline-none transition focus:border-gray-900"
                  placeholder="e.g. 8 employees or 2 locations"
                />
              </label>
              <label className="text-sm font-semibold text-gray-800 sm:col-span-2">
                Primary need
                <textarea
                  value={lead.primaryNeed}
                  onChange={(event) => updateLead('primaryNeed', event.target.value)}
                  className="mt-1 min-h-24 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-normal outline-none transition focus:border-gray-900"
                  placeholder={content.primaryNeedPlaceholder || 'What should Merxus help you handle first?'}
                />
              </label>
              <label className="text-sm font-semibold text-gray-800 sm:col-span-2">
                Preferred contact
                <select
                  value={lead.preferredContactMethod}
                  onChange={(event) => updateLead('preferredContactMethod', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-gray-900"
                >
                  {CONTACT_METHOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <p className="mt-4 text-xs leading-5 text-gray-500">
              By submitting, you agree Merxus may contact you about your request by phone, email, or SMS.
              Message and data rates may apply. You can opt out anytime. See our{' '}
              <Link to="/privacy-policy" className="font-semibold text-gray-700 underline">Privacy Policy</Link>
              {' '}and{' '}
              <Link to="/terms-of-service" className="font-semibold text-gray-700 underline">Terms of Service</Link>.
            </p>

            {leadStatus.message ? (
              <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                leadStatus.state === 'error'
                  ? 'bg-red-50 text-red-700 ring-1 ring-red-100'
                  : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100'
              }`}>
                {leadStatus.message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit || leadStatus.state === 'submitting'}
              className={`mt-5 w-full rounded-2xl px-6 py-3 text-sm font-semibold shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${theme.accentButton}`}
            >
              {leadStatus.state === 'submitting' ? 'Sending...' : content.formCta || 'Get My Demo'}
            </button>

            {leadStatus.sessionId ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Link
                  to={content.setupHref}
                  onClick={() => trackMetaCustomEvent('MerxusOnboardingStarted', {
                    product: 'merxus',
                    industry: content.tenantType || content.theme,
                    source: 'meta_ads_lead_form',
                    ...attribution,
                  })}
                  className="rounded-xl bg-gray-950 px-4 py-3 text-center text-xs font-semibold text-white transition hover:bg-gray-800"
                >
                  Continue onboarding
                </Link>
                <button
                  type="button"
                  onClick={handleBookDemo}
                  disabled={leadStatus.state === 'submitting'}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-center text-xs font-semibold text-gray-800 transition hover:bg-gray-50"
                >
                  Book demo
                </button>
                <button
                  type="button"
                  onClick={handleChatWithPerson}
                  disabled={leadStatus.state === 'submitting'}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-xs font-semibold text-gray-800 transition hover:bg-gray-50"
                >
                  Chat with a person
                </button>
              </div>
            ) : null}
          </form>
        </div>
      </section>

      <section className="px-4 pb-6">
        <div className="mx-auto max-w-6xl">
          <div className={`rounded-[28px] border px-6 py-6 md:px-8 ${theme.sectionHighlight}`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${theme.accentText}`}>The Core Problem</p>
            <h2 className="mt-3 text-3xl font-black text-gray-900 md:text-4xl">{content.problemTitle}</h2>
            <p className="mt-4 max-w-4xl text-base leading-7 text-gray-700 md:text-lg">
              {content.problemBody}
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-gray-200 md:p-8">
              <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${theme.accentText}`}>How Merxus Helps</p>
              <h2 className="mt-3 text-3xl font-black text-gray-900">{content.solutionTitle}</h2>
              <p className="mt-4 text-base leading-7 text-gray-700">{content.solutionBody}</p>

              <div className="mt-8 space-y-4">
                {content.solutionSteps.map((step, index) => (
                  <div key={step.title} className="flex gap-4">
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white ${theme.accentBg}`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{step.title}</p>
                      <p className="mt-1 text-sm leading-6 text-gray-600">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {content.featureCards.map((feature) => (
                <div key={feature.title} className={`rounded-[28px] border p-6 shadow-sm ${theme.accentCard} ${theme.accentBorder}`}>
                  <p className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${theme.accentPill}`}>
                    {feature.kicker}
                  </p>
                  <h3 className="mt-4 text-xl font-bold text-gray-900">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-700">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-6">
        <div className="mx-auto max-w-6xl rounded-[28px] bg-gray-950 px-6 py-8 text-white md:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">Operational Proof</p>
              <h2 className="mt-3 text-3xl font-black">{content.proofTitle}</h2>
              <p className="mt-4 text-base leading-7 text-white/75">{content.proofBody}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {content.proofPoints.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-sm text-white/90">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 md:grid-cols-3">
            {content.audienceCards.map((item) => (
              <div key={item.title} className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${theme.accentText}`}>{item.kicker}</p>
                <h3 className="mt-3 text-xl font-bold text-gray-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10">
        <div className="mx-auto max-w-6xl rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-gray-200 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${theme.accentText}`}>Call To Action</p>
              <h2 className="mt-3 text-3xl font-black text-gray-900 md:text-4xl">{content.finalTitle}</h2>
              <p className="mt-4 text-base leading-7 text-gray-700 md:text-lg">{content.finalBody}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to={content.setupHref}
                onClick={() => trackMetaCustomEvent('MerxusOnboardingStarted', {
                  product: 'merxus',
                  industry: content.tenantType || content.theme,
                  source: 'paid_social_landing',
                  ...attribution,
                })}
                className={`inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold shadow-lg transition ${theme.accentButton}`}
              >
                {content.primaryCta}
              </Link>
              <a
                href="#lead-form"
                onClick={() => trackMetaEvent('Schedule', {
                  product: 'merxus',
                  industry: content.tenantType || content.theme,
                  source: 'paid_social_landing',
                  ...attribution,
                })}
                className={`inline-flex items-center justify-center rounded-2xl border px-6 py-3 text-sm font-semibold transition ${theme.secondaryButton}`}
              >
                {content.secondaryCta}
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl gap-3">
          <Link
            to={content.setupHref}
            onClick={() => trackMetaCustomEvent('MerxusOnboardingStarted', {
              product: 'merxus',
              industry: content.tenantType || content.theme,
              source: 'paid_social_landing_mobile_sticky',
              ...attribution,
            })}
            className={`flex-1 rounded-2xl px-4 py-3 text-center text-sm font-semibold shadow-lg transition ${theme.accentButton}`}
          >
            {content.primaryCta}
          </Link>
          <a
            href="#lead-form"
            onClick={() => trackMetaEvent('Schedule', {
              product: 'merxus',
              industry: content.tenantType || content.theme,
              source: 'paid_social_landing_mobile_sticky',
              ...attribution,
            })}
            className={`flex-1 rounded-2xl border px-4 py-3 text-center text-sm font-semibold transition ${theme.secondaryButton}`}
          >
            {content.secondaryCta}
          </a>
        </div>
      </div>
    </div>
  );
}
