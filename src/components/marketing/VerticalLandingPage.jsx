import { Link } from 'react-router-dom';

function getThemeClasses(theme) {
  switch (theme) {
    case 'restaurant':
      return {
        pageBg: 'bg-gradient-to-b from-orange-50 via-white to-rose-50',
        heroPanel: 'bg-gradient-to-br from-orange-600 via-orange-500 to-rose-500 text-white',
        accentText: 'text-orange-600',
        accentSoftText: 'text-orange-100',
        accentBg: 'bg-orange-500',
        accentBorder: 'border-orange-200',
        accentCard: 'bg-orange-50',
        accentPill: 'bg-orange-100 text-orange-800',
        accentRing: 'ring-orange-200',
        accentButton: 'bg-orange-500 hover:bg-orange-400 text-white',
        secondaryButton: 'border-orange-200 text-orange-700 hover:bg-orange-50',
        sectionHighlight: 'bg-gradient-to-r from-orange-50 to-rose-50 border-orange-100',
      };
    case 'real-estate':
      return {
        pageBg: 'bg-gradient-to-b from-stone-50 via-white to-sky-50',
        heroPanel: 'bg-gradient-to-br from-slate-900 via-slate-800 to-sky-700 text-white',
        accentText: 'text-sky-700',
        accentSoftText: 'text-sky-100',
        accentBg: 'bg-sky-600',
        accentBorder: 'border-sky-200',
        accentCard: 'bg-sky-50',
        accentPill: 'bg-sky-100 text-sky-800',
        accentRing: 'ring-sky-200',
        accentButton: 'bg-sky-600 hover:bg-sky-500 text-white',
        secondaryButton: 'border-sky-200 text-sky-700 hover:bg-sky-50',
        sectionHighlight: 'bg-gradient-to-r from-sky-50 to-stone-50 border-sky-100',
      };
    case 'office':
    default:
      return {
        pageBg: 'bg-gradient-to-b from-emerald-50 via-white to-teal-50',
        heroPanel: 'bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 text-white',
        accentText: 'text-emerald-700',
        accentSoftText: 'text-emerald-100',
        accentBg: 'bg-emerald-500',
        accentBorder: 'border-emerald-200',
        accentCard: 'bg-emerald-50',
        accentPill: 'bg-emerald-100 text-emerald-800',
        accentRing: 'ring-emerald-200',
        accentButton: 'bg-emerald-500 hover:bg-emerald-400 text-black',
        secondaryButton: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
        sectionHighlight: 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100',
      };
  }
}

export default function VerticalLandingPage({ content }) {
  const theme = getThemeClasses(content.theme);

  return (
    <div className={`min-h-screen ${theme.pageBg}`}>
      <section className="px-4 pb-12 pt-12">
        <div className="mx-auto max-w-6xl">
          <div className={`overflow-hidden rounded-[32px] shadow-2xl ${theme.heroPanel}`}>
            <div className="grid gap-10 px-6 py-10 md:grid-cols-[1.2fr,0.8fr] md:px-10 md:py-14">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/75">
                  {content.eyebrow}
                </p>
                <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight md:text-6xl">
                  {content.heroTitle}
                </h1>
                <p className={`mt-5 max-w-2xl text-base md:text-lg ${theme.accentSoftText}`}>
                  {content.heroSubtitle}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to={content.setupHref}
                    className={`inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold shadow-lg transition ${theme.accentButton}`}
                  >
                    {content.primaryCta}
                  </Link>
                  <a
                    href={content.demoHref}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                  >
                    {content.secondaryCta}
                  </a>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {content.heroBullets.map((bullet) => (
                    <div key={bullet} className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                      <span className="mt-0.5 text-lg">✓</span>
                      <span className="text-sm text-white/90">{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-[28px] bg-black/15 p-6 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/65">Why teams switch</p>
                  <div className="mt-4 grid gap-3">
                    {content.valuePoints.map((item) => (
                      <div key={item.title} className="rounded-2xl bg-white/10 px-4 py-4">
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-1 text-sm text-white/75">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {content.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-2xl bg-white/10 px-4 py-4 text-center backdrop-blur-sm">
                      <p className="text-2xl font-black text-white md:text-3xl">{metric.value}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/65">{metric.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-6">
        <div className="mx-auto max-w-6xl">
          <div className={`rounded-[28px] border px-6 py-6 md:px-8 ${theme.sectionHighlight}`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${theme.accentText}`}>The Core Problem</p>
            <h2 className="mt-3 text-3xl font-black text-gray-900 md:text-4xl">{content.problemTitle}</h2>
            <p className="mt-4 max-w-4xl text-base leading-7 text-gray-700 md:text-lg">
              {content.problemBody}
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-gray-200 md:p-8">
              <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${theme.accentText}`}>How Merxus Helps</p>
              <h2 className="mt-3 text-3xl font-black text-gray-900">{content.solutionTitle}</h2>
              <p className="mt-4 text-base leading-7 text-gray-700">{content.solutionBody}</p>

              <div className="mt-8 space-y-4">
                {content.solutionSteps.map((step, index) => (
                  <div key={step.title} className="flex gap-4">
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white ${theme.accentBg}`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{step.title}</p>
                      <p className="mt-1 text-sm leading-6 text-gray-600">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {content.featureCards.map((feature) => (
                <div key={feature.title} className={`rounded-[28px] border p-6 shadow-sm ${theme.accentCard} ${theme.accentBorder}`}>
                  <p className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${theme.accentPill}`}>
                    {feature.kicker}
                  </p>
                  <h3 className="mt-4 text-xl font-bold text-gray-900">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-700">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-6">
        <div className="mx-auto max-w-6xl rounded-[28px] bg-gray-950 px-6 py-8 text-white md:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">Operational Proof</p>
              <h2 className="mt-3 text-3xl font-black">{content.proofTitle}</h2>
              <p className="mt-4 text-base leading-7 text-white/75">{content.proofBody}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {content.proofPoints.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-sm text-white/90">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 md:grid-cols-3">
            {content.audienceCards.map((item) => (
              <div key={item.title} className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${theme.accentText}`}>{item.kicker}</p>
                <h3 className="mt-3 text-xl font-bold text-gray-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10">
        <div className="mx-auto max-w-6xl rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-gray-200 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${theme.accentText}`}>Call To Action</p>
              <h2 className="mt-3 text-3xl font-black text-gray-900 md:text-4xl">{content.finalTitle}</h2>
              <p className="mt-4 text-base leading-7 text-gray-700 md:text-lg">{content.finalBody}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to={content.setupHref}
                className={`inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold shadow-lg transition ${theme.accentButton}`}
              >
                {content.primaryCta}
              </Link>
              <a
                href={content.demoHref}
                className={`inline-flex items-center justify-center rounded-2xl border px-6 py-3 text-sm font-semibold transition ${theme.secondaryButton}`}
              >
                {content.secondaryCta}
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl gap-3">
          <Link
            to={content.setupHref}
            className={`flex-1 rounded-2xl px-4 py-3 text-center text-sm font-semibold shadow-lg transition ${theme.accentButton}`}
          >
            {content.primaryCta}
          </Link>
          <a
            href={content.demoHref}
            className={`flex-1 rounded-2xl border px-4 py-3 text-center text-sm font-semibold transition ${theme.secondaryButton}`}
          >
            {content.secondaryCta}
          </a>
        </div>
      </div>
    </div>
  );
}

