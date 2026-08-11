import test from 'node:test';
import assert from 'node:assert/strict';

import {
  callDemoLanguageLabel,
  callDemoTranscriptText,
  clampCallDemoTime,
  filterCallDemos,
  findActiveTranscriptIndex,
  formatCallDemoTime,
} from './callDemoAudio.js';

const transcript = [
  { startSeconds: 0, endSeconds: 2.5 },
  { startSeconds: 2.8, endSeconds: 5.2 },
  { startSeconds: 5.5, endSeconds: 8 },
];

test('call demo timing helpers clamp seeking and identify active transcript turns', () => {
  assert.equal(clampCallDemoTime(-4, 50), 0);
  assert.equal(clampCallDemoTime(18.5, 50), 18.5);
  assert.equal(clampCallDemoTime(75, 50), 50);
  assert.equal(findActiveTranscriptIndex(transcript, 0), 0);
  assert.equal(findActiveTranscriptIndex(transcript, 3.4), 1);
  assert.equal(findActiveTranscriptIndex(transcript, 8.2), 2);
  assert.equal(findActiveTranscriptIndex([], 2), -1);
});

test('call demo presentation helpers preserve language context while translating text', () => {
  const turn = {
    originalText: 'Buenos días.',
    englishTranslation: 'Good morning.',
  };
  assert.equal(formatCallDemoTime(0), '0:00');
  assert.equal(formatCallDemoTime(65.8), '1:05');
  assert.equal(callDemoLanguageLabel('es-MX'), 'ESPAÑOL');
  assert.equal(callDemoLanguageLabel('en-US'), 'ENGLISH');
  assert.equal(callDemoTranscriptText(turn, 'original'), 'Buenos días.');
  assert.equal(callDemoTranscriptText(turn, 'english'), 'Good morning.');
});

test('call demo filtering follows the requested marketing-card order', () => {
  const payload = { demos: [{ id: 'office' }, { id: 'real-estate' }] };
  assert.deepEqual(filterCallDemos(payload, ['real-estate', 'office']).map((demo) => demo.id), ['real-estate', 'office']);
  assert.deepEqual(filterCallDemos(payload, ['missing', 'office']).map((demo) => demo.id), ['office']);
});
