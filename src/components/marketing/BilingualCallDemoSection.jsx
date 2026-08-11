import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Home, Pause, PhoneCall, Play, RotateCcw } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import {
  CALL_DEMO_METADATA_URL,
  MERXUS_HQ_PHONE,
  callDemoLanguageLabel,
  callDemoTranscriptScrollTarget,
  callDemoTranscriptText,
  clampCallDemoTime,
  filterCallDemos,
  findActiveTranscriptIndex,
  formatCallDemoTime,
} from '../../utils/callDemoAudio';
import { trackMetaCustomEvent, trackMetaEvent } from '../../utils/metaPixel';

const DEMO_MARKETING = {
  'real-estate': {
    eyebrow: 'Real Estate',
    title: 'You were showing another house. Merxus just captured your next buyer.',
    subtitle: 'A bilingual buyer becomes a showing request.',
    flow: ['Spanish inquiry', 'Property information', 'Showing request', 'English confirmation', 'Lead captured'],
    icon: Home,
  },
  office: {
    eyebrow: 'Business / Office',
    title: 'Two customers. Two languages. One call.',
    subtitle: 'Merxus keeps both appointment requests moving without a transfer or restart.',
    flow: ['Appointment change', 'Spanish-speaking family member', 'New appointment', 'English follow-up'],
    icon: Building2,
  },
};

const FALLBACK_WAVEFORM = Array.from({ length: 64 }, (_, index) => (
  Number((0.22 + Math.abs(Math.sin(index * 0.61)) * 0.58 + (index % 7) * 0.025).toFixed(3))
));

function DemoAudioCard({ demo, activeDemoId, onRequestPlay }) {
  const audioRef = useRef(null);
  const trackedPlayRef = useRef(false);
  const transcriptRef = useRef(null);
  const lineRefs = useRef([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(Number(demo.durationSeconds) || 0);
  const [transcriptMode, setTranscriptMode] = useState('original');
  const [audioError, setAudioError] = useState('');
  const marketing = DEMO_MARKETING[demo.id] || {
    eyebrow: demo.title,
    title: demo.summary,
    subtitle: demo.summary,
    flow: [],
    icon: Building2,
  };
  const Icon = marketing.icon;
  const waveform = Array.isArray(demo.waveform) && demo.waveform.length ? demo.waveform : FALLBACK_WAVEFORM;
  const activeTranscriptIndex = findActiveTranscriptIndex(demo.transcript, currentTime);
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  useEffect(() => {
    if (activeDemoId && activeDemoId !== demo.id && audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, [activeDemoId, demo.id]);

  useEffect(() => {
    const container = transcriptRef.current;
    const activeLine = lineRefs.current[activeTranscriptIndex];
    if (!container || !activeLine || !isPlaying) return;
    const containerBounds = container.getBoundingClientRect();
    const lineBounds = activeLine.getBoundingClientRect();
    const scrollTarget = callDemoTranscriptScrollTarget({
      containerScrollTop: container.scrollTop,
      containerTop: containerBounds.top,
      containerHeight: containerBounds.height,
      lineTop: lineBounds.top,
      lineHeight: lineBounds.height,
    });
    if (scrollTarget !== null) {
      container.scrollTo({
        top: scrollTarget,
        behavior: 'smooth',
      });
    }
  }, [activeTranscriptIndex, isPlaying]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    setAudioError('');
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (duration > 0 && audio.currentTime >= duration - 0.15) audio.currentTime = 0;
    onRequestPlay(demo.id);
    try {
      await audio.play();
      if (!trackedPlayRef.current) {
        trackedPlayRef.current = true;
        trackMetaCustomEvent('MerxusCallDemoPlayed', {
          demo_id: demo.id,
          tenant_type: demo.tenantType,
          duration_seconds: Math.round(duration || demo.durationSeconds || 0),
          page_path: window.location.pathname,
        });
      }
    } catch {
      setAudioError('Playback could not start. Please try again.');
    }
  }

  function seekTo(value) {
    const nextTime = clampCallDemoTime(value, duration);
    if (audioRef.current) audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  return (
    <article className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/90 shadow-2xl shadow-black/20">
      <div className="border-b border-white/10 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-300/20">
            <Icon aria-hidden="true" className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">{marketing.eyebrow}</p>
            <h3 className="mt-2 text-xl font-black leading-tight text-white sm:text-2xl">{marketing.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{marketing.subtitle}</p>
          </div>
        </div>

        {marketing.flow.length ? (
          <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
            {marketing.flow.map((step, index) => (
              <div key={step} className="flex items-center gap-2">
                <span className="rounded-full bg-white/5 px-3 py-1.5 ring-1 ring-white/10">{step}</span>
                {index < marketing.flow.length - 1 ? <span aria-hidden="true" className="text-emerald-400">→</span> : null}
              </div>
            ))}
          </div>
        ) : null}

        <audio
          ref={audioRef}
          src={demo.audioUrl}
          preload="metadata"
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || Number(demo.durationSeconds) || 0)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={() => setAudioError('This demonstration is temporarily unavailable.')}
        />

        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/80 p-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={togglePlayback}
              className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-300/25"
              aria-label={isPlaying ? `Pause ${marketing.eyebrow} demonstration` : `Play ${marketing.eyebrow} demonstration`}
            >
              {isPlaying ? <Pause aria-hidden="true" className="h-5 w-5 fill-current" /> : currentTime >= duration - 0.15 && duration > 0 ? <RotateCcw aria-hidden="true" className="h-5 w-5" /> : <Play aria-hidden="true" className="ml-0.5 h-5 w-5 fill-current" />}
            </button>

            <div className="min-w-0 flex-1">
              <div className="relative h-16 rounded-lg focus-within:ring-2 focus-within:ring-emerald-300/60">
                <div aria-hidden="true" className="flex h-full items-center gap-[2px] overflow-hidden">
                  {waveform.map((peak, index) => {
                    const isPlayed = (index + 0.5) / waveform.length <= progress;
                    return (
                      <span
                        key={`${demo.id}-wave-${index}`}
                        className={`min-w-[2px] flex-1 rounded-full transition-colors ${isPlayed ? 'bg-emerald-300' : 'bg-slate-600'}`}
                        style={{ height: `${Math.max(10, Math.min(60, Number(peak) * 60))}px` }}
                      />
                    );
                  })}
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.05"
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(event) => seekTo(event.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label={`Seek through ${marketing.eyebrow} demonstration`}
                  aria-valuetext={`${formatCallDemoTime(currentTime)} of ${formatCallDemoTime(duration)}`}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs font-medium tabular-nums text-slate-400">
                <span>{formatCallDemoTime(currentTime)}</span>
                <span>{formatCallDemoTime(duration)}</span>
              </div>
            </div>
          </div>
          {audioError ? <p className="mt-3 text-sm text-amber-300" role="status">{audioError}</p> : null}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-white">Follow the conversation</p>
            <p className="mt-1 text-xs text-slate-400">The active line follows audio playback.</p>
          </div>
          <div className="inline-flex w-fit rounded-xl bg-slate-950 p-1 ring-1 ring-white/10" role="group" aria-label="Transcript display language">
            {[
              { id: 'original', label: 'Original' },
              { id: 'english', label: 'English Translation' },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTranscriptMode(option.id)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  transcriptMode === option.id ? 'bg-emerald-400 text-slate-950' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
                aria-pressed={transcriptMode === option.id}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div ref={transcriptRef} className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1" role="region" aria-label={`${marketing.eyebrow} transcript`}>
          {demo.transcript.map((turn, index) => {
            const isActive = index === activeTranscriptIndex;
            const isTranslatedSpanish = transcriptMode === 'english' && callDemoLanguageLabel(turn.language) === 'ESPAÑOL';
            return (
              <button
                key={`${turn.startSeconds}-${turn.speaker}-${index}`}
                ref={(node) => { lineRefs.current[index] = node; }}
                type="button"
                onClick={() => seekTo(turn.startSeconds)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  isActive
                    ? 'border-emerald-300/50 bg-emerald-300/10 shadow-inner'
                    : 'border-transparent bg-white/[0.035] hover:border-white/10 hover:bg-white/[0.06]'
                }`}
                aria-current={isActive ? 'true' : undefined}
              >
                <span className={`flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] ${isActive ? 'text-emerald-300' : 'text-slate-400'}`}>
                  <span>{turn.role === 'assistant' ? 'MERXUS' : turn.speaker}</span>
                  <span aria-hidden="true">·</span>
                  <span>{callDemoLanguageLabel(turn.language)}</span>
                  {isTranslatedSpanish ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] text-slate-300">Translated</span> : null}
                </span>
                <span className="mt-1.5 block text-sm leading-6 text-slate-100">{callDemoTranscriptText(turn, transcriptMode)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export default function BilingualCallDemoSection({
  demoIds = ['real-estate', 'office'],
  setupHref = '/onboarding',
  sectionId = 'hear-merxus',
}) {
  const location = useLocation();
  const [payload, setPayload] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [activeDemoId, setActiveDemoId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError('');
    fetch(CALL_DEMO_METADATA_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Transcript request failed with ${response.status}`);
        return response.json();
      })
      .then(setPayload)
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadError('The call demonstrations could not be loaded. Please try again shortly.');
      });
    return () => controller.abort();
  }, []);

  const demos = useMemo(() => filterCallDemos(payload, demoIds), [demoIds, payload]);

  function trackCallClick() {
    trackMetaEvent('Contact', {
      contact_method: 'phone',
      source: 'bilingual_call_demo',
      page_path: location.pathname,
    });
  }

  return (
    <section id={sectionId} className="scroll-mt-24 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">Hear Merxus In Action</p>
          <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
            Your customers don&apos;t always speak one language. Now your phone system doesn&apos;t have to either.
          </h2>
          <p className="mt-5 text-xl font-bold text-slate-100">English. Español. Even both in the same call.</p>
          <p className="mx-auto mt-3 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
            Merxus follows the customer when the conversation changes languages—without transferring the call or starting over.
          </p>
        </div>

        {loadError ? (
          <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-amber-300/20 bg-amber-300/10 px-5 py-4 text-center text-sm text-amber-100" role="alert">
            {loadError}
          </div>
        ) : null}

        {!payload && !loadError ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-2" aria-label="Loading call demonstrations">
            {demoIds.map((id) => <div key={id} className="h-[540px] animate-pulse rounded-[28px] bg-white/5 ring-1 ring-white/10" />)}
          </div>
        ) : null}

        {demos.length ? (
          <div className={`mt-10 grid gap-6 ${demos.length > 1 ? 'lg:grid-cols-2' : 'mx-auto max-w-4xl'}`}>
            {demos.map((demo) => (
              <DemoAudioCard
                key={demo.id}
                demo={demo}
                activeDemoId={activeDemoId}
                onRequestPlay={setActiveDemoId}
              />
            ))}
          </div>
        ) : null}

        <div className="mx-auto mt-10 max-w-4xl rounded-[28px] border border-emerald-300/20 bg-emerald-300/[0.07] p-6 text-center sm:p-8">
          <p className="text-2xl font-black text-white">Think that sounded good? Try Merxus yourself.</p>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Call the Merxus AI line, or start setting up a response workflow for your business.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={`tel:${MERXUS_HQ_PHONE.tel}`}
              onClick={trackCallClick}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-6 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-300/25"
            >
              <PhoneCall aria-hidden="true" className="h-5 w-5" />
              Call Merxus Now · {MERXUS_HQ_PHONE.display}
            </a>
            <Link
              to={setupHref}
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-6 py-3.5 text-sm font-bold text-white transition hover:border-white/40 hover:bg-white/5"
            >
              Start Setup
            </Link>
          </div>
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          Real Merxus capabilities. Simulated customer conversations. Names, businesses, listings, phone numbers, and appointments are fictional.
        </p>
      </div>
    </section>
  );
}
