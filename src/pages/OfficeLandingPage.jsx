import VerticalLandingPage from '../components/marketing/VerticalLandingPage';

const content = {
  theme: 'office',
  tenantType: 'office',
  tenantLabel: 'Office',
  businessTypeValue: 'office',
  eyebrow: 'Merxus AI For Offices',
  heroTitle: 'Stop letting voicemail become your front desk.',
  heroSubtitle:
    'Merxus helps offices handle calls, SMS, website chat, review alerts, Slack notifications, routing, and mobile follow-up, with human takeover whenever your team needs control.',
  primaryCta: 'Start Setup',
  secondaryCta: 'Book a 15-minute Demo',
  setupHref: '/setup?type=voice',
  demoHref: 'mailto:support@merxusllc.com?subject=Merxus%20Office%20Demo%20Request',
  formTitle: 'See how Merxus would handle your office front desk.',
  formIntro: 'Tell us where requests come in today, and we will route you to the right setup path.',
  formCta: 'Get My Office Demo',
  primaryNeedPlaceholder: 'Example: after-hours calls, appointment requests, quote requests, review alerts, Slack routing, or staff interruptions',
  formHighlights: [
    'No per-call charges',
    'Mobile app included',
    'Slack alerts and review monitoring',
    'Human takeover when needed',
  ],
  heroBullets: [
    'Helps answer calls without forcing every inquiry to voicemail',
    'Captures appointments, quote requests, and service needs',
    'Supports calls, SMS, website chat, reviews, and Slack alerts',
    'Keeps owners, managers, and staff aligned',
  ],
  valuePoints: [
    { title: 'AI Front Desk', description: 'Your business can stay responsive when the team is already maxed out.' },
    { title: 'Routing + Work Capture', description: 'Appointments, quotes, and service requests become usable follow-up instead of missed opportunities.' },
    { title: 'Web + Mobile Visibility', description: 'Teams can act from the dashboard or on the go.' },
  ],
  metrics: [
    { value: 'No', label: 'Per-call fees' },
    { value: '5+', label: 'Response channels' },
    { value: '1', label: 'Command center' },
  ],
  problemTitle: 'Your team is busy. The phone does not care.',
  problemBody:
    'When the front desk is helping a client, already on another line, or tied up in admin work, new requests still keep coming in. Calls, texts, chats, and reviews need a response path that does not depend on one person catching every interruption.',
  solutionTitle: 'Merxus turns office calls into organized follow-up.',
  solutionBody:
    'Merxus handles routine intake, captures what the customer needs, and helps route the next step to the right person. Your team stays focused on the work while still keeping response quality high.',
  solutionSteps: [
    { title: 'Respond quickly', description: 'Customers get a professional first response instead of waiting on a callback window.' },
    { title: 'Capture intent', description: 'Appointments, quotes, and service needs are recognized as real work, not just call history.' },
    { title: 'Route the next step', description: 'Owners and staff can review and respond from web or mobile.' },
  ],
  featureCards: [
    { kicker: 'Appointments', title: 'Capture inbound demand', description: 'Merxus helps turn office calls into booked next steps instead of forgotten callbacks.' },
    { kicker: 'Quotes', title: 'Protect high-value requests', description: 'When a caller is ready for pricing or service, Merxus helps preserve the opportunity.' },
    { kicker: 'Routing', title: 'Keep callers moving', description: 'Direct the right kind of call to the right team path instead of relying on whoever happens to pick up.' },
    { kicker: 'Mobile', title: 'Stay responsive anywhere', description: 'Office work does not only happen at a desk. Merxus keeps the workflow visible on the move.' },
  ],
  proofTitle: 'Built for real office operations',
  proofBody:
    'Merxus already supports the kinds of office workflows generic AI receptionist ads usually hand-wave past. This is about real business follow-up, not novelty.',
  proofPoints: [
    'Voice dashboard with calls, SMS, work items, routing, voicemail, and team access',
    'Work-item flow for appointments, quotes, and service requests',
    'Team roles and access controls for owners, managers, and staff',
    'Bilingual caller handling with translated dashboard visibility',
  ],
  audienceCards: [
    { kicker: 'Best Fit', title: 'Service-heavy offices', description: 'Great for local offices where inbound calls often become appointments, estimates, or service coordination.' },
    { kicker: 'Pain Point', title: 'Front-desk overload', description: 'Especially useful when the business already has demand but the staff cannot catch every call.' },
    { kicker: 'Why It Wins', title: 'More than voicemail', description: 'Merxus helps capture actual work instead of leaving owners to piece it together later.' },
  ],
  finalTitle: 'Stop making voicemail your default front desk.',
  finalBody:
    'If your office loses business when the line goes unanswered, Merxus gives you a better operating model: answer, capture, route, and follow up.',
};

export default function OfficeLandingPage() {
  return <VerticalLandingPage content={content} />;
}
