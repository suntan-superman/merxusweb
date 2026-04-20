import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTenantFeedbackViewModel } from './analyticsTenantFeedback.js';

test('buildTenantFeedbackViewModel shapes funnel, reputation, reply workflow, and source rows', () => {
  const model = buildTenantFeedbackViewModel({
    funnel: {
      responseRate: 42,
      averageRating: 4.3,
      lowRatingRate: 11,
      reviewInviteSendRate: 76,
      reviewInviteConversionRate: 31,
    },
    recovery: {
      open: 3,
      resolved: 5,
    },
    reviews: {
      total: 12,
      byPlatform: [{ platform: 'google', count: 8 }],
      sentimentBreakdown: [{ sentiment: 'positive', count: 7 }],
      responseBreakdown: [{ replyState: 'posted', count: 4 }],
    },
    replyWorkflow: {
      approvalCoverageRate: 67,
      approved: 6,
      posted: 4,
      postingSuccessRate: 80,
      failed: 1,
      draft: 2,
      averageApprovalToPostHours: 5,
      approvedToPostedRate: 66,
    },
    sources: {
      requestBreakdown: [{ sourceType: 'web_form', count: 5 }],
      lowRatingBreakdown: [{ sourceType: 'sms', count: 2 }],
    },
    trends: {
      days: 14,
      daily: [{ label: 'Apr 19', requestsSent: 3 }],
    },
  });

  assert.equal(model.trendDays, 14);
  assert.equal(model.funnelCards[0].value, '42%');
  assert.equal(model.reputationRows[0].label, 'Google');
  assert.equal(model.sentimentRows[0].label, 'Sentiment: Positive');
  assert.equal(model.replyStateRows[0].label, 'Reply: Posted');
  assert.equal(model.replyWorkflowCards[3].value, '5h');
  assert.equal(model.sourceGroups.requests[0].label, 'Web Form');
  assert.equal(model.sourceGroups.lowRatings[0].label, 'Sms');
});

test('buildTenantFeedbackViewModel returns empty arrays and fallback values for sparse payloads', () => {
  const model = buildTenantFeedbackViewModel({});

  assert.equal(model.trendDays, 7);
  assert.equal(model.funnelCards[0].helper, 'Avg private rating —');
  assert.deepEqual(model.reputationRows, []);
  assert.deepEqual(model.sentimentRows, []);
  assert.deepEqual(model.replyStateRows, []);
  assert.equal(model.replyWorkflowCards[3].value, '—');
  assert.deepEqual(model.sourceGroups.requests, []);
  assert.deepEqual(model.sourceGroups.lowRatings, []);
});
