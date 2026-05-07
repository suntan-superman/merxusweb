import VerticalLandingPage from '../components/marketing/VerticalLandingPage';

const content = {
  theme: 'real-estate',
  tenantType: 'real_estate',
  tenantLabel: 'Real Estate',
  businessTypeValue: 'real_estate_agent',
  eyebrow: 'Merxus AI For Real Estate',
  heroTitle: 'Real estate AI that captures the lead before momentum fades.',
  heroSubtitle:
    'Merxus helps real estate teams answer listing questions, capture buyer and seller inquiries, route showing requests, send mobile and Slack alerts, and keep human handoff close.',
  primaryCta: 'Start Real Estate Setup',
  secondaryCta: 'Request Real Estate Demo',
  setupHref: '/setup?type=real_estate',
  demoHref: 'mailto:support@merxusllc.com?subject=Merxus%20Real%20Estate%20Demo%20Request',
  formTitle: 'See how Merxus would handle your listing inquiries.',
  formIntro: 'Tell us how leads reach you today, and we will map the right real estate response workflow.',
  formCta: 'Get My Real Estate Demo',
  primaryNeedPlaceholder: 'Example: after-hours listing questions, showing requests, buyer qualification, seller leads, or mobile alerts',
  formHighlights: [
    'After-hours lead capture',
    'Mobile and Slack alerts',
    'Human handoff for hot inquiries',
    'No per-call charges',
  ],
  heroBullets: [
    'Captures listing inquiries across calls, SMS, and chat',
    'Helps move leads toward showing activity',
    'Supports flyer follow-up and buyer interest flow',
    'Keeps agents responsive from mobile while in the field',
  ],
  valuePoints: [
    { title: 'Speed-To-Lead Advantage', description: 'Merxus helps you respond when you are in a showing, driving, or off the clock.' },
    { title: 'Showing Workflow Support', description: 'The product already supports showing visibility, updates, and mobile action.' },
    { title: 'Field-Ready Operations', description: 'Built for agents who do not live at a desk.' },
  ],
  metrics: [
    { value: '24/7', label: 'Lead capture' },
    { value: 'Mobile', label: 'Field workflow' },
    { value: 'Faster', label: 'Response model' },
  ],
  problemTitle: 'Real estate rewards fast, organized response.',
  problemBody:
    'If a buyer reaches out after hours, while you are driving, or during another showing, the opportunity can cool off quickly. Fast intake and clean routing keep the next step from getting buried.',
  solutionTitle: 'Merxus helps you respond first.',
  solutionBody:
    'Merxus helps answer listing inquiries, capture buyer intent, support flyer follow-up, and keep showing activity moving. It gives agents an operating layer instead of another missed-call log.',
  solutionSteps: [
    { title: 'Capture the inquiry', description: 'Buyers get a response immediately instead of waiting on your next callback window.' },
    { title: 'Preserve the momentum', description: 'Interest, context, and next-step signals stay attached to the lead.' },
    { title: 'Move into follow-up', description: 'Agents can react from web or mobile while staying in motion.' },
  ],
  featureCards: [
    { kicker: 'Listings', title: 'Protect inbound interest', description: 'Merxus helps keep listing inquiries from slipping away after hours or during busy periods.' },
    { kicker: 'Showings', title: 'Support the next step', description: 'The real estate experience is tied to showing workflows, not just call transcription.' },
    { kicker: 'Flyers', title: 'Keep warm leads moving', description: 'Flyer follow-up is a memorable differentiator compared with generic AI phone systems.' },
    { kicker: 'Mobile', title: 'Built for agents on the move', description: 'Showings, maps, calendars, and follow-up matter when your day happens in the field.' },
  ],
  proofTitle: 'Built for real estate operations, not generic call handling',
  proofBody:
    'Merxus already goes deeper than a generic receptionist pitch. The product supports listings, leads, showings, alerts, and field visibility in ways that map directly to agent behavior.',
  proofPoints: [
    'Real estate calls, listings, leads, and showing flows exist across web and mobile',
    'Showings mobile experience includes map visibility, updates, and calendar support',
    'Flyer automation is a standout angle for listing follow-up',
    'Slack, SMS, email, and web notifications support real team coordination',
  ],
  audienceCards: [
    { kicker: 'Best Fit', title: 'Independent agents and small teams', description: 'Ideal for agents who cannot afford to miss listing inquiries but also cannot answer every call instantly.' },
    { kicker: 'Pain Point', title: 'After-hours lead leakage', description: 'A strong fit when buyers often call outside normal response windows.' },
    { kicker: 'Why It Wins', title: 'Operational responsiveness', description: 'Merxus helps agents stay fast, organized, and mobile-ready instead of reactive.' },
  ],
  finalTitle: 'Give every listing inquiry a response path.',
  finalBody:
    'If speed-to-lead affects your pipeline, Merxus gives you a way to capture more inquiries and create showing opportunities without being glued to your phone.',
};

export default function RealEstateLandingPage() {
  return <VerticalLandingPage content={content} />;
}
