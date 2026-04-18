import { Link } from 'react-router-dom';
import PlanTierBadge from '../billing/PlanTierBadge';

const TENANT_COPY = {
  restaurant: {
    label: 'Restaurant',
    commandCenterPath: '/restaurant/command-center',
    intelligencePath: '/restaurant/intelligence',
    notificationsPath: '/restaurant/notifications',
    billingPath: '/restaurant/billing',
  },
  real_estate: {
    label: 'Real Estate',
    commandCenterPath: '/estate/command-center',
    intelligencePath: '/estate/intelligence',
    notificationsPath: '/estate/notifications',
    billingPath: '/estate/billing',
  },
  voice: {
    label: 'Voice',
    commandCenterPath: '/voice/command-center',
    intelligencePath: '/voice/intelligence',
    notificationsPath: '/voice/notifications',
    billingPath: '/voice/billing',
  },
};

const FEATURE_COPY = {
  feedback: {
    eyebrow: 'Elite Feedback',
    title: 'Private Feedback Recovery',
    summary:
      'Capture customer sentiment before it becomes a public issue, route urgent recovery cases, and coordinate closed-loop follow-up from one workspace.',
    now: [
      'Route exists and is Elite-gated',
      'Plan-aware navigation is live across tenant shells',
      'Billing upgrade handoff is wired for non-Elite tenants',
    ],
    next: [
      'Private feedback intake and source connections',
      'Case assignment and recovery workflows',
      'Negative-sentiment escalation triggers',
    ],
  },
  reviews: {
    eyebrow: 'Elite Reviews',
    title: 'Public Review Operations',
    summary:
      'Manage public-review ingestion, moderation, AI-assisted reply drafting, and queue triage for reputation-sensitive customer moments.',
    now: [
      'Elite route scaffolding is in place',
      'Tenant-aware shell and navigation are ready',
      'Upgrade gating is enforced before entry',
    ],
    next: [
      'Platform review feeds and moderation states',
      'AI-generated public reply drafts',
      'Publishing and approval workflows',
    ],
  },
  automations: {
    eyebrow: 'Elite Automations',
    title: 'Reputation Automation Rules',
    summary:
      'Define higher-order customer experience automations for review invites, recovery triggers, escalations, and reputation workflows.',
    now: [
      'Dedicated Elite surface is available by tenant',
      'Plan-based routing and sidebar exposure are live',
      'Billing redirect context explains why access is restricted',
    ],
    next: [
      'Automation rule builder and trigger history',
      'Event-based review and survey journeys',
      'Escalation policies for feedback spikes',
    ],
  },
  'cx-analytics': {
    eyebrow: 'Elite CX Analytics',
    title: 'Customer Experience Analytics',
    summary:
      'Track complaint themes, sentiment patterns, scorecards, and location-level reputation trends that extend beyond the base operational dashboards.',
    now: [
      'Elite analytics route is available',
      'Navigation and access control are connected to plan state',
      'Operators can still pivot to existing intelligence and notifications surfaces',
    ],
    next: [
      'Sentiment and topic trend analysis',
      'Location and team comparison scorecards',
      'Executive reputation reporting and exports',
    ],
  },
};

export default function EliteFeatureWorkspace({ tenantType, featureKey }) {
  const tenant = TENANT_COPY[tenantType] || TENANT_COPY.voice;
  const feature = FEATURE_COPY[featureKey] || FEATURE_COPY.reviews;

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-8 text-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.75)]">
        <div className="flex flex-wrap items-center gap-3">
          <PlanTierBadge tier="elite" label="Elite" className="bg-white/10 text-white border-white/15" />
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
            {tenant.label} Workspace
          </span>
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.25em] text-sky-300">{feature.eyebrow}</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white">
          {feature.title}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
          {feature.summary}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to={tenant.commandCenterPath}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Open Command Center
          </Link>
          <Link
            to={tenant.intelligencePath}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Open Intelligence
          </Link>
          <Link
            to={tenant.notificationsPath}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Open Notifications
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Implementation Status</h3>
          <p className="mt-2 text-sm text-slate-600">
            This Elite workspace is now part of the tenant routing and plan-gating layer. The route is usable,
            but the full data and workflow integrations are still being built.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Live Now</p>
              <ul className="mt-3 space-y-2 text-sm text-emerald-950">
                {feature.now.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="font-semibold text-emerald-700">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Next Build Targets</p>
              <ul className="mt-3 space-y-2 text-sm text-sky-950">
                {feature.next.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="font-semibold text-sky-700">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Operator Handoff</h3>
          <p className="mt-2 text-sm text-slate-600">
            Until the dedicated Elite data sources land, teams can continue working from the existing operational
            surfaces and return here as these modules come online.
          </p>
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Command Center</p>
              <p className="mt-1 text-sm text-slate-600">
                Keep using the live operations feed, action queue, and watchlist as the anchor for customer events.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Intelligence</p>
              <p className="mt-1 text-sm text-slate-600">
                Use structured interaction review to validate event quality and prep downstream CX workflows.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Billing</p>
              <p className="mt-1 text-sm text-slate-600">
                Elite entitlement messaging and routing are already enforced if a non-Elite tenant attempts access.
              </p>
              <Link
                to={tenant.billingPath}
                className="mt-3 inline-flex rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Open Billing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
