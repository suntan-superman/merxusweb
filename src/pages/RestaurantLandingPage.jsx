import VerticalLandingPage from '../components/marketing/VerticalLandingPage';

const content = {
  theme: 'restaurant',
  tenantType: 'restaurant',
  tenantLabel: 'Restaurant',
  businessTypeValue: 'restaurant',
  eyebrow: 'Merxus AI For Restaurants',
  heroTitle: 'Answer calls, capture reservations, and alert your team.',
  heroSubtitle:
    'Merxus helps restaurants handle common questions, reservation requests, after-hours messages, review alerts, manager notifications, and human handoff, with no per-call charges.',
  primaryCta: 'Start Setup',
  secondaryCta: 'Book a 15-minute Demo',
  setupHref: '/setup?type=restaurant',
  demoHref: 'mailto:support@merxusllc.com?subject=Merxus%20Restaurant%20Demo%20Request',
  formTitle: 'See how Merxus would handle your restaurant calls.',
  formIntro: 'Tell us when call volume hits hardest and what requests your team handles most often.',
  formCta: 'Get My Restaurant Demo',
  primaryNeedPlaceholder: 'Example: reservation calls, menu questions, catering requests, after-hours messages, review alerts, or manager notifications',
  formHighlights: [
    'No per-call charges for busy nights',
    'Reservation and menu-question workflows',
    'Review alerts and manager notifications',
    'Human handoff when needed',
  ],
  heroBullets: [
    'Captures reservation intent when the host stand is overloaded',
    'Helps handle takeout demand during rush periods',
    'Supports bilingual callers and after-hours traffic',
    'Keeps staff focused on guests instead of the ringing line',
  ],
  valuePoints: [
    { title: 'Rush-Hour Relief', description: 'Merxus helps restaurants answer when the team is already deep in service.' },
    { title: 'Orders + Reservations', description: 'The story is about revenue capture, not just polite call answering.' },
    { title: 'Operational Visibility', description: 'Alerts and follow-up keep the restaurant informed without adding phone chaos.' },
  ],
  metrics: [
    { value: 'Rush', label: 'Ready' },
    { value: '24/7', label: 'Phone coverage' },
    { value: 'Toast', label: 'Integration story' },
  ],
  problemTitle: 'The phone should not pull your team off the floor.',
  problemBody:
    'During lunch, dinner, and late-day rushes, every phone interruption competes with in-person service. Reservation requests, menu questions, and urgent guest issues need a response path that does not add more chaos to the floor.',
  solutionTitle: 'Merxus keeps the line moving when your staff cannot.',
  solutionBody:
    'Merxus helps answer restaurant calls, supports reservation and order conversations, and gives your team better operational visibility. Your staff stays focused on guests and service while the phone still has a path.',
  solutionSteps: [
    { title: 'Catch the call', description: 'The business stays responsive even during rush periods and after hours.' },
    { title: 'Handle the request', description: 'Reservation and order-related conversations stay in motion instead of dropping into voicemail.' },
    { title: 'Keep staff aligned', description: 'Operational alerts help the team stay informed without forcing someone off the floor to catch up.' },
  ],
  featureCards: [
    { kicker: 'Reservations', title: 'Protect table demand', description: 'Merxus helps capture reservation interest when the host stand is already busy.' },
    { kicker: 'Orders', title: 'Keep takeout revenue flowing', description: 'Phone demand still matters, especially when your online channels are not the full picture.' },
    { kicker: 'Bilingual', title: 'Serve more callers confidently', description: 'Automatic bilingual capability is a real advantage in California and other diverse markets.' },
    { kicker: 'Toast', title: 'A stronger restaurant story', description: 'Toast integration gives Merxus a more operational restaurant position than generic AI receptionist competitors.' },
  ],
  proofTitle: 'Built for the reality of restaurant service',
  proofBody:
    'Merxus is strongest when restaurant demand spikes and the team cannot split attention between guests, kitchen communication, and the phone. That is the real operating problem to solve.',
  proofPoints: [
    'Restaurant-specific flows include reservations, orders, menu intelligence, and staff alerts',
    'Toast integration strengthens the restaurant operations story',
    'Web, mobile, SMS, email, and Slack support help the team stay informed',
    'Merxus is positioned to reduce rush-hour phone loss without adding staff pressure',
  ],
  audienceCards: [
    { kicker: 'Best Fit', title: 'Independent restaurants and small groups', description: 'Especially useful for high-call-volume teams where every missed reservation or order matters.' },
    { kicker: 'Pain Point', title: 'Rush-hour overload', description: 'Perfect when staff regularly have to choose between serving guests and catching the phone.' },
    { kicker: 'Why It Wins', title: 'Revenue capture', description: 'Merxus helps turn phone demand into booked tables and orders instead of dead air and missed opportunity.' },
  ],
  finalTitle: 'Keep service moving while the phone keeps working.',
  finalBody:
    'If your restaurant gets call spikes during rushes or after hours, Merxus gives you a better way to keep the phone working while your team stays focused on service.',
};

export default function RestaurantLandingPage() {
  return <VerticalLandingPage content={content} />;
}
