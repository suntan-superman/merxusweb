import VerticalLandingPage from '../components/marketing/VerticalLandingPage';

const content = {
  theme: 'office',
  eyebrow: 'Merxus AI For Offices',
  heroTitle: 'Stop losing appointments, quotes, and service requests to missed calls.',
  heroSubtitle:
    'Merxus gives your office an AI front desk that answers 24/7, captures caller intent, and routes the work to your team on web and mobile.',
  primaryCta: 'Start Office Setup',
  secondaryCta: 'Request Office Demo',
  setupHref: '/setup?type=voice',
  demoHref: 'mailto:support@merxusllc.com?subject=Merxus%20Office%20Demo%20Request',
  heroBullets: [
    'Answers every call without sending people to voicemail',
    'Captures appointments, quote requests, and service needs',
    'Supports bilingual callers and translated follow-up',
    'Keeps owners, managers, and staff aligned',
  ],
  valuePoints: [
    { title: '24/7 AI Front Desk', description: 'Your business stays responsive even when the team is already maxed out.' },
    { title: 'Routing + Work Capture', description: 'Appointments, quotes, and service requests become usable follow-up instead of missed opportunities.' },
    { title: 'Web + Mobile Visibility', description: 'Teams can act from the dashboard or on the go.' },
  ],
  metrics: [
    { value: '24/7', label: 'Answering' },
    { value: '2', label: 'Surfaces: Web + Mobile' },
    { value: '3', label: 'Core office workflows' },
  ],
  problemTitle: 'Your team is busy. The phone does not care.',
  problemBody:
    'When the front desk is helping a client, already on another line, or tied up in admin work, new opportunities still keep coming in. Missed office calls quickly become missed appointments, missed quotes, and lost revenue.',
  solutionTitle: 'Merxus turns office calls into organized follow-up.',
  solutionBody:
    'Merxus answers around the clock, captures what the caller needs, and helps route the next step to the right person. Your team stays focused on the work instead of scrambling to catch every ringing phone.',
  solutionSteps: [
    { title: 'Answer immediately', description: 'Callers get a professional response instead of a missed-call moment or voicemail dead-end.' },
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
  finalTitle: 'Stop relying on voicemail as your front desk.',
  finalBody:
    'If your office loses business when the line goes unanswered, Merxus gives you a better operating model: answer, capture, route, and follow up.',
};

export default function OfficeLandingPage() {
  return <VerticalLandingPage content={content} />;
}

