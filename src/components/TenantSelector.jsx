import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBillingPricing } from '../api/billing';
import { formatBillingAmount, getPlanPricing } from '../utils/billingPricing';

const TENANT_OPTIONS = [
  {
    type: 'voice',
    label: 'Office',
    headline: 'AI front desk for service businesses',
    icon: '📞',
    intro: 'Best for offices and small businesses that need a smart receptionist and call routing.',
    audience: 'Home services, clinics, law offices, contractors, and local businesses',
    bullets: [
      'Smart routing, voicemail, and receptionist coverage',
      'Appointment, quote, and service-request capture',
      'Speech operations, work items, and notifications',
      'Slack Command Center and operator workflows',
    ],
  },
  {
    type: 'real_estate',
    label: 'Real Estate',
    headline: 'AI assistant for agents and brokerages',
    icon: '🏡',
    intro: 'Best for real-estate teams that need listing inquiries, showing requests, and lead qualification.',
    audience: 'Individual agents, broker teams, and real-estate offices',
    bullets: [
      'Listing inquiries, showing requests, and lead capture',
      'Property-aware follow-up and customer memory',
      'Customer 360, intelligence review, and notifications',
      'Workflow visibility for showings and property activity',
    ],
  },
  {
    type: 'restaurant',
    label: 'Restaurant',
    headline: 'Restaurant AI receptionist',
    icon: '🍽️',
    intro: 'Best for restaurants that need orders, reservations, and after-hours call coverage.',
    audience: 'Quick-service, full-service, multi-location, and hospitality groups',
    bullets: [
      'Menu questions, reservations, and order capture',
      '24/7 call answering with staff alerts',
      'SMS follow-up, confirmations, and digests',
      'Customer CRM and restaurant workflow visibility',
    ],
  },
];

function buildOnboardingLink(type, queryParams = {}) {
  const params = new URLSearchParams();
  params.set('type', type);

  const hasProvidedPlan = Boolean(queryParams?.plan && String(queryParams.plan).trim().length > 0);
  if (!hasProvidedPlan) {
    params.set('plan', 'basic');
  }

  Object.entries(queryParams).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const normalized = String(value).trim();
    if (!normalized) return;
    params.set(key, normalized);
  });

  return `/onboarding?${params.toString()}`;
}

export default function TenantSelector({ queryParams = {} }) {
  const defaultType = queryParams?.type && TENANT_OPTIONS.some((option) => option.type === queryParams.type)
    ? queryParams.type
    : TENANT_OPTIONS[0].type;
  const [selectedType, setSelectedType] = useState(defaultType);
  const [pricingData, setPricingData] = useState(null);
  const [pricingError, setPricingError] = useState(false);

  useEffect(() => {
    let active = true;
    getBillingPricing()
      .then((data) => { if (active) setPricingData(data); })
      .catch((error) => {
        console.error('Failed to load tenant pricing:', error);
        if (active) setPricingError(true);
      });
    return () => { active = false; };
  }, []);

  const selectedOption = useMemo(
    () => TENANT_OPTIONS.find((option) => option.type === selectedType) || TENANT_OPTIONS[0],
    [selectedType]
  );
  const selectedPlan = getPlanPricing(pricingData, selectedType, queryParams?.plan || 'basic');
  const selectedPrice = formatBillingAmount(selectedPlan?.subscriptionUnitAmount, selectedPlan?.currency);

  return (
    <div className="px-4 pb-16 pt-10">
      <div className="container mx-auto max-w-5xl">
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {TENANT_OPTIONS.map((option) => {
            const active = option.type === selectedType;
            return (
              <button
                key={option.type}
                type="button"
                onClick={() => setSelectedType(option.type)}
                className={`min-w-[150px] rounded-full border px-5 py-3 text-sm font-semibold transition-all ${
                  active
                    ? 'border-primary-600 bg-primary-600 text-white shadow-md'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-primary-500 dark:hover:text-primary-300'
                }`}
              >
                <span className="mr-2" aria-hidden="true">{option.icon}</span>
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-3xl border border-primary-100 bg-white shadow-[0_30px_70px_-45px_rgba(22,163,74,0.45)] dark:border-slate-700 dark:bg-slate-900">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="p-8 lg:p-10">
              <div className="inline-flex items-center rounded-full bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700">
                <span className="mr-2 text-lg" aria-hidden="true">{selectedOption.icon}</span>
                {selectedOption.label}
              </div>

              <h3 className="mt-5 text-3xl font-bold text-gray-900 dark:text-slate-100">
                {selectedOption.headline}
              </h3>

              <p className="mt-4 text-lg text-gray-700 dark:text-slate-300">
                {selectedOption.intro}
              </p>

              <div className="mt-6 rounded-2xl bg-gray-50 px-5 py-4 dark:bg-slate-950">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">
                  Ideal for
                </p>
                <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
                  {selectedOption.audience}
                </p>
              </div>

              <ul className="mt-8 space-y-3">
                {selectedOption.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start text-sm text-gray-700 dark:text-slate-300">
                    <span className="mr-3 mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                      ✓
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-primary-100 bg-gradient-to-br from-primary-50 via-white to-primary-100/60 p-8 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 lg:border-l lg:border-t-0 lg:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-700">
                Plan Snapshot
              </p>
              <p className="mt-4 text-3xl font-bold text-gray-900 dark:text-slate-100">
                {selectedPrice ? `Starts at ${selectedPrice}/month` : 'Pricing unavailable'}
              </p>
              <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">
                You can review exact features and pricing before checkout, and you can compare all plans if you need more detail.
              </p>

              <div className="mt-8 space-y-3">
                <Link
                  to={buildOnboardingLink(selectedOption.type, queryParams)}
                  aria-disabled={!selectedPrice}
                  onClick={(event) => { if (!selectedPrice) event.preventDefault(); }}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  Continue with {selectedOption.label}
                </Link>
                <Link
                  to={`/pricing${selectedOption.type ? `?type=${encodeURIComponent(selectedOption.type)}` : ''}`}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-primary-500 dark:hover:text-primary-300"
                >
                  Compare plans
                </Link>
              </div>

              {pricingError && (
                <p className="mt-3 text-sm font-semibold text-amber-700">
                  Current Stripe pricing could not be verified. Reload before continuing.
                </p>
              )}

              <div className="mt-8 rounded-2xl border border-white/80 bg-white/80 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/80">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  What happens next?
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
                  We’ll route you into the correct onboarding path, pre-load the right labels and plan defaults, and keep the rest of the setup specific to your tenant type.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
