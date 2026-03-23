import VerticalLandingPage from '../components/marketing/VerticalLandingPage';

const content = {
  theme: 'real-estate',
  eyebrow: 'Merxus AI For Real Estate',
  heroTitle: 'The listing lead you miss is the lead another agent wins.',
  heroSubtitle:
    'Merxus helps real estate teams answer inquiries 24/7, capture buyer interest, support showing workflows, and follow up faster from web and mobile.',
  primaryCta: 'Start Real Estate Setup',
  secondaryCta: 'Request Real Estate Demo',
  setupHref: '/setup?type=real_estate',
  demoHref: 'mailto:support@merxusllc.com?subject=Merxus%20Real%20Estate%20Demo%20Request',
  heroBullets: [
    'Captures listing inquiries day and night',
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
  problemTitle: 'Real estate is a speed game.',
  problemBody:
    'If a buyer calls after hours, while you are driving, or during another showing, there is a good chance they move on to the next agent. Slow response does not just hurt conversion. It loses deals.',
  solutionTitle: 'Merxus helps you respond first.',
  solutionBody:
    'Merxus answers listing inquiries, captures buyer intent, supports flyer follow-up, and helps your team keep showing activity moving. It gives agents an operational edge instead of another missed-call log.',
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
  finalTitle: 'Stop leaking leads after hours.',
  finalBody:
    'If speed-to-lead affects your pipeline, Merxus gives you a way to capture more inquiries and create more showing opportunities without being glued to your phone.',
};

export default function RealEstateLandingPage() {
  return <VerticalLandingPage content={content} />;
}

