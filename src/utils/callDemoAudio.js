export const CALL_DEMO_METADATA_URL = '/audio/demos/merxus-bilingual-demo-transcripts.json';
export const MERXUS_HQ_PHONE = {
  display: '(833) 309-4212',
  tel: '+18333094212',
};

export function clampCallDemoTime(value, duration) {
  const normalizedDuration = Number(duration);
  const normalizedValue = Number(value);
  if (!Number.isFinite(normalizedDuration) || normalizedDuration <= 0) return 0;
  if (!Number.isFinite(normalizedValue)) return 0;
  return Math.min(normalizedDuration, Math.max(0, normalizedValue));
}

export function findActiveTranscriptIndex(transcript = [], currentTime = 0) {
  if (!Array.isArray(transcript) || transcript.length === 0) return -1;
  const normalizedTime = Math.max(0, Number(currentTime) || 0);
  let activeIndex = 0;
  for (let index = 0; index < transcript.length; index += 1) {
    const turn = transcript[index];
    if (normalizedTime >= Number(turn.startSeconds || 0)) activeIndex = index;
    if (normalizedTime <= Number(turn.endSeconds || 0)) break;
  }
  return activeIndex;
}

export function formatCallDemoTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

export function callDemoLanguageLabel(locale) {
  return String(locale || '').toLowerCase().startsWith('es') ? 'ESPAÑOL' : 'ENGLISH';
}

export function callDemoTranscriptText(turn = {}, mode = 'original') {
  if (mode === 'english') return turn.englishTranslation || turn.originalText || '';
  return turn.originalText || turn.englishTranslation || '';
}

export function filterCallDemos(payload, demoIds = []) {
  const demos = Array.isArray(payload?.demos) ? payload.demos : [];
  if (!Array.isArray(demoIds) || demoIds.length === 0) return demos;
  const byId = new Map(demos.map((demo) => [demo.id, demo]));
  return demoIds.map((id) => byId.get(id)).filter(Boolean);
}
