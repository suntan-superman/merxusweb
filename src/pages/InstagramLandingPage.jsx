import VerticalLandingPage from '../components/marketing/VerticalLandingPage';

const content = {
  theme: 'office',
  tenantType: 'office',
  tenantLabel: 'General',
  businessTypeValue: 'office',
  eyebrow: 'Merxus AI',
  heroTitle: 'Never miss another customer call.',
  heroSubtitle:
    'Merxus helps small teams answer calls, capture leads, route requests, alert staff, and keep follow-up moving even when everyone is busy.',
  primaryCta: 'Start Setup',
  secondaryCta: 'Book a 15-minute Demo',
  setupHref: '/setup?type=voice',
  demoHref: 'mailto:support@merxusllc.com?subject=Merxus%20Demo%20Request',
  formTitle: 'See how Merxus would handle your customer calls.',
  formIntro: 'Tell us what your team needs to capture first, and we will route you to the right setup path.',
  formCta: 'Get My Demo',
  defaultPrimaryNeed: 'Capture missed calls and route customer requests.',
  primaryNeedPlaceholder: 'Example: missed calls, after-hours requests, appointments, quotes, reservations, or lead capture',
  formHighlights: [
    'No per-call charges',
    'Lead capture and routing',
    'Mobile app and team alerts',
    'Human takeover when needed',
  ],
  heroBullets: [
    'Answers when your team is busy or closed',
    'Captures caller details and the reason they reached out',
    'Routes follow-up to the right person',
    'Works across calls, SMS, chat, reviews, and team alerts',
  ],
  valuePoints: [
    { title: 'Every inquiry gets a path', description: 'Merxus helps prevent interested customers from disappearing into voicemail.' },
    { title: 'Built for busy teams', description: 'Your staff can stay focused while customer requests still get captured.' },
    { title: 'Follow-up stays visible', description: 'Web, mobile, and alerts keep the next step easy to find.' },
  ],
  metrics: [
    { value: '24/7', label: 'Coverage' },
    { value: 'No', label: 'Per-call fees' },
    { value: '1', label: 'Command center' },
  ],
  problemTitle: 'Missed calls turn into missed revenue.',
  problemBody:
    'Customers call when they are ready to act. If the line is busy, the office is closed, or your team is already helping someone else, that opportunity needs a better response path than voicemail.',
  solutionTitle: 'Merxus captures the request and keeps the next step moving.',
  solutionBody:
    'Merxus gives callers a professional first response, captures what they need, and helps route the follow-up so your team can act from web or mobile.',
  solutionSteps: [
    { title: 'Answer quickly', description: 'Customers get a response when your team cannot pick up immediately.' },
    { title: 'Capture the need', description: 'Names, contact details, and intent become usable follow-up.' },
    { title: 'Route action', description: 'Your team can review, take over, and move the conversation forward.' },
  ],
  featureCards: [
    { kicker: 'Calls', title: 'Reduce missed opportunities', description: 'Give inbound calls a response path before customers move on.' },
    { kicker: 'Leads', title: 'Capture useful context', description: 'Merxus helps collect the details your team needs for follow-up.' },
    { kicker: 'Alerts', title: 'Notify the right people', description: 'SMS, email, Slack, web, and mobile visibility keep requests from getting buried.' },
    { kicker: 'Control', title: 'Human takeover when needed', description: 'Your team can step in when a request needs judgment or personal attention.' },
  ],
  proofTitle: 'One Merxus workflow for calls, chats, and follow-up',
  proofBody:
    'Merxus is more than a phone bot. It connects intake, routing, team notifications, mobile visibility, and human takeover so customer requests become operational work.',
  proofPoints: [
    'Voice, SMS, website chat, reviews, and alerts in one platform',
    'Lead and work-item capture for appointments, quotes, reservations, and service needs',
    'Mobile app support for owners, managers, and staff',
    'Bilingual caller handling and team visibility',
  ],
  audienceCards: [
    { kicker: 'Best Fit', title: 'Busy local businesses', description: 'Ideal when every missed call can become a lost appointment, quote, order, reservation, or lead.' },
    { kicker: 'Pain Point', title: 'After-hours demand', description: 'Useful when customers keep reaching out outside normal staffed hours.' },
    { kicker: 'Why It Wins', title: 'Capture before callback', description: 'Merxus preserves intent before the follow-up window goes cold.' },
  ],
  finalTitle: 'Give every customer call a better next step.',
  finalBody:
    'If your business depends on inbound calls, Merxus helps answer, capture, route, and follow up without adding pressure to your team.',
};

export default function InstagramLandingPage() {
  return <VerticalLandingPage content={content} />;
}
