import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAnalyticsSummaryViewModel,
  getAnalyticsSummaryStatusLabel,
  getAnalyticsSummaryToneClass,
} from './analyticsSummary.js';

test('analytics summary tone and status helpers normalize values', () => {
  assert.equal(getAnalyticsSummaryToneClass('attention'), 'bg-red-100 text-red-700 border-red-200');
  assert.equal(getAnalyticsSummaryStatusLabel('warning'), 'Warning');
  assert.equal(getAnalyticsSummaryStatusLabel('other'), 'Healthy');
});

test('buildAnalyticsSummaryViewModel exposes summary state flags and pill copy', () => {
  const model = buildAnalyticsSummaryViewModel({
    dashboardSummary: {
      status: 'attention',
      attentionCount: 4,
      operatorFocus: [{ key: 'focus_1' }],
      highlights: [{ key: 'highlight_1' }],
    },
  });

  assert.equal(model.hasSummary, true);
  assert.equal(model.hasHighlights, true);
  assert.equal(model.hasOperatorFocus, true);
  assert.equal(model.statusPill, 'Attention • 4 active signals');
});

test('buildAnalyticsSummaryViewModel returns empty-state defaults without summary', () => {
  const model = buildAnalyticsSummaryViewModel(null);

  assert.equal(model.hasSummary, false);
  assert.equal(model.hasHighlights, false);
  assert.equal(model.hasOperatorFocus, false);
  assert.equal(model.statusPill, null);
});
