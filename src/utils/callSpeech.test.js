import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SLOW_RESPONSE_THRESHOLD_MS,
  buildSpeechOperationsSummary,
  formatLatency,
  getSpeechFilterCount,
  getSpeechProviderName,
  getSpeechRuntimeSettingsPath,
  matchesSpeechFilter,
} from './callSpeech.js';

test('speech filter helpers classify fallback, health-gated, realtime, and slow calls', () => {
  const fallbackCall = {
    speechSession: {
      fallbackTriggered: true,
      healthGated: false,
      effectiveStrategy: 'standard',
      metrics: { firstResponseLatencyMs: 6100 },
    },
  };
  const realtimeCall = {
    speechSession: {
      fallbackTriggered: false,
      healthGated: false,
      effectiveStrategy: 'realtime',
      metrics: { firstResponseLatencyMs: 900 },
    },
  };
  const healthGatedCall = {
    speechSession: {
      fallbackTriggered: false,
      healthGated: true,
      effectiveStrategy: 'standard',
      metrics: { firstResponseLatencyMs: 2400 },
    },
  };

  assert.equal(matchesSpeechFilter(fallbackCall, 'fallback'), true);
  assert.equal(matchesSpeechFilter(fallbackCall, 'slow_response'), true);
  assert.equal(matchesSpeechFilter(realtimeCall, 'realtime'), true);
  assert.equal(matchesSpeechFilter(realtimeCall, 'standard'), false);
  assert.equal(matchesSpeechFilter(healthGatedCall, 'health_gated'), true);
  assert.equal(matchesSpeechFilter({ id: 'no-speech' }, 'standard'), false);
});

test('speech helper accessors expose stable counts, formatting, and settings routes', () => {
  const calls = [
    { speechSession: { effectiveStrategy: 'standard', metrics: { firstResponseLatencyMs: 1000 } } },
    { speechSession: { effectiveStrategy: 'realtime', metrics: { firstResponseLatencyMs: SLOW_RESPONSE_THRESHOLD_MS } } },
  ];

  assert.equal(getSpeechFilterCount(calls, 'all'), 2);
  assert.equal(getSpeechFilterCount(calls, 'slow_response'), 1);
  assert.equal(getSpeechFilterCount([], 'fallback'), 0);
  assert.equal(getSpeechRuntimeSettingsPath('restaurant'), '/restaurant/settings?tab=ai&panel=speech-runtime');
  assert.equal(getSpeechRuntimeSettingsPath('real_estate'), '/estate/settings?tab=ai&panel=speech-runtime');
  assert.equal(getSpeechRuntimeSettingsPath('voice'), '/voice/settings?tab=ai&panel=speech-runtime');
  assert.equal(formatLatency(850), '850ms');
  assert.equal(formatLatency(2500), '2.5s');
  assert.equal(formatLatency(0), '—');
  assert.equal(getSpeechProviderName({}), 'No telemetry');
  assert.equal(getSpeechProviderName({ speechSession: { effectiveProvider: 'OpenAI Realtime' } }), 'OpenAI Realtime');
});

test('buildSpeechOperationsSummary derives stable provider and latency breakdowns', () => {
  const summary = buildSpeechOperationsSummary([
    {
      speechSession: {
        effectiveProvider: 'Twilio',
        fallbackTriggered: true,
        healthGated: false,
        effectiveStrategy: 'standard',
        metrics: { firstResponseLatencyMs: 6100 },
      },
    },
    {
      speechSession: {
        effectiveProvider: 'Azure',
        fallbackTriggered: false,
        healthGated: true,
        effectiveStrategy: 'standard',
        metrics: { firstResponseLatencyMs: 2200 },
      },
    },
    {
      speechSession: {
        realtimeProvider: 'OpenAI',
        fallbackTriggered: false,
        healthGated: false,
        effectiveStrategy: 'realtime',
        metrics: { firstResponseLatencyMs: 800 },
      },
    },
    {
      speechSession: {
        effectiveProvider: 'Azure',
        fallbackTriggered: false,
        healthGated: false,
        effectiveStrategy: 'realtime',
        metrics: {},
      },
    },
    {},
  ]);

  assert.equal(summary.totalCalls, 5);
  assert.equal(summary.telemetryCalls, 4);
  assert.equal(summary.fallbackCount, 1);
  assert.equal(summary.healthGatedCount, 1);
  assert.equal(summary.standardCount, 2);
  assert.equal(summary.realtimeCount, 2);
  assert.equal(summary.slowResponseCount, 1);
  assert.equal(Math.round(summary.averageFirstResponseLatencyMs), 3033);
  assert.deepEqual(
    summary.providerBreakdown,
    [
      { provider: 'Azure', count: 2 },
      { provider: 'OpenAI', count: 1 },
      { provider: 'Twilio', count: 1 },
    ],
  );
  assert.deepEqual(
    summary.latencyBreakdown.map(({ key, count }) => ({ key, count })),
    [
      { key: 'fast', count: 1 },
      { key: 'watch', count: 1 },
      { key: 'slow', count: 1 },
      { key: 'no_data', count: 2 },
    ],
  );
});
