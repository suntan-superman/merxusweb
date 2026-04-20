import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatFeedbackIntegrationDate,
  getFeedbackIntegrationHealthTone,
  getFeedbackIntegrationIssueTone,
  getFeedbackIntegrationRemediationTone,
  getFeedbackIntegrationStatusTone,
  getFeedbackIntegrationValidationTone,
  labelFeedbackHistoryAction,
} from './feedbackIntegrationsPresentation.js';

test('web feedback integrations presentation helpers normalize tone classes and dates', () => {
  assert.equal(
    getFeedbackIntegrationStatusTone('needs_attention'),
    'border-red-200 bg-red-50 text-red-800'
  );
  assert.equal(
    getFeedbackIntegrationHealthTone('healthy'),
    'bg-emerald-100 text-emerald-700'
  );
  assert.equal(
    getFeedbackIntegrationValidationTone('attention'),
    'border-amber-200 bg-amber-50 text-amber-800'
  );
  assert.equal(
    getFeedbackIntegrationIssueTone('critical'),
    'border-red-200 bg-red-50 text-red-700'
  );
  assert.equal(
    getFeedbackIntegrationRemediationTone('warning'),
    'border-amber-200 bg-amber-50 text-amber-800'
  );
  assert.equal(labelFeedbackHistoryAction('sync_confirmed'), 'Sync confirmed');
  assert.equal(formatFeedbackIntegrationDate(''), '—');
  assert.equal(
    formatFeedbackIntegrationDate('2026-04-19T12:00:00Z').includes('2026'),
    true
  );
});
