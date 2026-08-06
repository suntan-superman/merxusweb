import { useSearchParams } from 'react-router-dom';

const FEATURE_SETS = {
  voice: {
    title: 'Powerful Features for Busy Offices',
    subtitle: 'A responsive front desk and follow-up workflow for offices that cannot pause their work to catch every call.',
    features: [
      ['AI Front Desk', 'Give inbound callers a professional first response with your business context.', '📞'],
      ['Appointments And Quotes', 'Capture appointment, estimate, and service-request details for the right follow-up.', '📅'],
      ['Routing And Human Takeover', 'Route urgent conversations or let the right person step in when needed.', '↗️'],
      ['English And Spanish', 'Respond in either language while preserving the original conversation and English visibility.', '🌐'],
      ['SMS And Email Alerts', 'Keep owners and staff aware of what needs attention next.', '📱'],
      ['Mobile Control', 'Review calls, messages, and work items from the field or office.', '📲'],
      ['Review And Team Alerts', 'Bring customer signals and team notifications into the same operating view.', '🔔'],
      ['Custom Call Rules', 'Shape greetings, routing, business details, and escalation rules around your operation.', '⚙️'],
    ],
    benefits: [
      'Designed for service-heavy offices where a call often becomes an appointment, quote, or work item.',
      'Keeps routine intake moving while people remain in control of sensitive or high-value conversations.',
      'Works across calls, SMS, web chat, team alerts, and mobile follow-up.',
      'Gives every customer conversation a usable next step instead of another voicemail.',
    ],
  },
  real_estate: {
    title: 'Powerful Features for Real Estate Teams',
    subtitle: 'Listing-aware communication tools for agents and teams who need to stay responsive while staying in motion.',
    features: [
      ['Listing Inquiry Capture', 'Answer common property questions and preserve buyer or seller context for follow-up.', '🏠'],
      ['Showing Requests', 'Capture showing interest and keep the next action visible to the right agent.', '📅'],
      ['Flyer Follow-Up', 'Support flyer requests with listing-aware workflows rather than a generic callback list.', '📄'],
      ['Buyer And Seller Leads', 'Collect key lead details and interest signals without losing momentum.', '🤝'],
      ['English And Spanish', 'Handle callers in either language with original transcript and English visibility.', '🌐'],
      ['Mobile Alerts', 'Keep agents informed when they are in a showing, driving, or away from a desk.', '📲'],
      ['Listing And Showing Visibility', 'Keep listings, leads, requests, and showing activity connected in one workflow.', '🗺️'],
      ['Human Handoff', 'Escalate warm prospects to an agent when a live conversation is the right next step.', '↗️'],
    ],
    benefits: [
      'Built for the after-hours and between-showing moments when listing interest can cool off quickly.',
      'Pairs AI response with listing context, flyer follow-up, showing workflows, and human action.',
      'Gives agents a mobile-ready operating view instead of another disconnected call log.',
      'Helps teams respond fast without pretending every buyer conversation should be automated end to end.',
    ],
  },
  restaurant: {
    title: 'Powerful Features for Restaurants',
    subtitle: 'Customer-call workflows for restaurant teams handling orders, reservations, and guest questions.',
    features: [
      ['Instant Call Answering', 'Give inbound calls a faster response path with AI-assisted answering and routing.', '📞'],
      ['Reservation Management', 'Support reservations and waitlist management workflows.', '📅'],
      ['Order Taking', 'Capture takeout and pickup orders with menu knowledge.', '🍽️'],
      ['Menu Questions', 'Answer menu and dietary questions using configured restaurant information.', '📋'],
      ['Catering And Events', 'Handle catering and event inquiries professionally.', '🎉'],
      ['After-Hours Support', 'Handle after-hours calls and voicemail messages.', '🌙'],
      ['SMS Summaries', 'Send SMS and email summaries to owners and managers.', '📱'],
      ['Customizable', 'Customize voice, tone, and call-handling rules to match your brand.', '⚙️'],
    ],
    benefits: [
      'Designed for independent and small-chain restaurants.',
      'Works with your existing phone number and operating workflow.',
      'Supports a restaurant profile, menu knowledge, and service-specific setup.',
      'Keeps staff focused on in-person guests while calls still receive a response path.',
    ],
  },
};

export default function Features() {
  const [searchParams] = useSearchParams();
  const requestedType = searchParams.get('type');
  const featureSet = FEATURE_SETS[requestedType] || FEATURE_SETS.voice;

  return (
    <div className="w-full px-4 py-16 dark:bg-slate-950">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h1 className="mb-6 text-4xl font-bold text-gray-900 md:text-5xl dark:text-slate-100">
            {featureSet.title}
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-gray-700 dark:text-slate-300">
            {featureSet.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {featureSet.features.map(([title, description, icon]) => (
            <div key={title} className="card transition-shadow hover:shadow-lg">
              <div className="mb-4 text-4xl">{icon}</div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
              <p className="text-gray-600 dark:text-slate-300">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-lg bg-primary-50 p-8 dark:bg-slate-800 dark:ring-1 dark:ring-slate-700">
          <h2 className="mb-4 text-center text-2xl font-bold text-gray-900 dark:text-slate-100">
            Why Choose Merxus?
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {featureSet.benefits.map((benefit) => (
              <div key={benefit} className="flex items-start">
                <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">✓</div>
                <p className="ml-3 text-gray-700 dark:text-slate-300">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
