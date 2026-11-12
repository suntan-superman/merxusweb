import React from 'react';
import { Link } from 'react-router-dom';

const canonical = 'https://merxus.ai/articles/cost-of-missed-calls-small-businesses';
const schema = {
  '@context': 'https://schema.org', '@type': 'Article',
  headline: 'The Cost of Missed Calls for Small Businesses',
  description: 'A practical, assumption-based way for small businesses to understand what unanswered calls may cost and decide whether follow-up tools are worthwhile.',
  mainEntityOfPage: canonical, publisher: { '@type': 'Organization', name: 'Merxus AI', url: 'https://merxus.ai' },
};

export default function MissedCallsArticlePage() {
  return <main className="mx-auto max-w-4xl px-5 py-12 text-gray-800 dark:text-slate-100 md:py-20">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary-600">Small business guide</p>
    <h1 className="mb-6 text-4xl font-bold leading-tight md:text-5xl">The Cost of Missed Calls for Small Businesses</h1>
    <p className="mb-10 text-xl leading-relaxed text-gray-600 dark:text-slate-300">An unanswered call can be a missed booking, quote request, order, or a question that never reaches your team. The cost is different for every business. Here is a practical way to estimate your own exposure without relying on industry-wide loss claims.</p>
    <div className="space-y-8 text-base leading-7">
      <section><h2 className="mb-2 text-2xl font-semibold">A missed call is an opportunity, not a guaranteed lost sale</h2><p>Some callers leave voicemail, try again, or use another channel. Others may move on. Count only the calls that represent a genuine buying opportunity, and estimate the share that would have become customers using your own records. Avoid multiplying every missed call by your average sale: that treats uncertain intent and conversion as certain revenue.</p></section>
      <section><h2 className="mb-2 text-2xl font-semibold">Build an estimate from your own numbers</h2><p>A simple monthly estimate is:</p><p className="rounded-lg bg-gray-100 p-4 font-semibold dark:bg-slate-800">missed calls × share that are qualified inquiries × share that convert × average sale value</p><p>This estimates potential revenue associated with those calls under your assumptions. To estimate contribution after variable costs, multiply by your gross margin. Then subtract the monthly cost of any response option you are considering. The result is a planning aid, not a forecast.</p></section>
      <section><h2 className="mb-2 text-2xl font-semibold">Illustrative calculation</h2><p>Suppose a business counts 20 unanswered calls in a month. For illustration only, assume 25% are genuine inquiries, 20% of those would book, and the average booking is $150. That is 20 × 0.25 × 0.20 × $150, or $150 in possible monthly revenue associated with those calls. If the business uses a 50% gross margin assumption, the corresponding contribution would be $75 before the cost of a service.</p><p>These percentages and amounts are placeholders, not benchmark data or a claim about typical results. Replace them with your call logs, booking records, average transaction, and actual margin. If you do not know the inputs, track them for a few weeks before making a purchase decision.</p></section>
      <section><h2 className="mb-2 text-2xl font-semibold">Compare the cost of practical alternatives</h2><p>Options include adjusting staff coverage, using voicemail with a clear callback promise, offering a web booking or quote form, setting up call forwarding, or using an answering service. Compare each option’s total monthly cost and the work it removes or adds. Include setup time and the cases that still need a person.</p><p>Also check the experience: can callers reach a human for urgent or sensitive matters, and does your team receive enough context to follow up? A lower missed-call count is not useful if requests are captured inaccurately or remain unassigned.</p></section>
      <section><h2 className="mb-2 text-2xl font-semibold">Review results before changing your process</h2><p>Track incoming calls, unanswered calls, callbacks completed, qualified inquiries, bookings, and response time. Compare similar days and hours, and note holidays or promotions. Attribute bookings carefully: a caller who was answered may still not have booked, and someone who reached voicemail may still convert later.</p></section>
      <section><h2 className="mb-2 text-2xl font-semibold">Where Merxus may fit</h2><p>Merxus provides AI-assisted call handling and follow-up workflows. Whether it fits depends on your call volume, the requests you receive, the handoffs your staff need, and your available plan. Review current inclusions and pricing before deciding, and listen to the product examples to judge whether the caller experience fits your business.</p><p className="flex flex-wrap gap-5 font-semibold"><Link className="text-primary-600 underline" to="/pricing">See Merxus pricing</Link><Link className="text-primary-600 underline" to="/hear-merxus">Hear Merxus in action</Link></p></section>
    </div>
  </main>;
}
