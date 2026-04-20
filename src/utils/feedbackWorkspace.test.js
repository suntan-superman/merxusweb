import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildFeedbackWorkspacePathWithParams,
  feedbackWorkspaceItemMatchesView,
  formatFeedbackWorkspaceDate,
  getFeedbackWorkspacePriorityTone,
  getFeedbackWorkspaceStatusTone,
  isFeedbackWorkspaceItemOwnedByCurrentUser,
  normalizeFeedbackWorkspaceView,
  previewFeedbackWorkspaceText,
} from './feedbackWorkspace.js';

test('feedback workspace helpers normalize tones, dates, and views', () => {
  assert.equal(getFeedbackWorkspaceStatusTone('new'), 'bg-red-100 text-red-700');
  assert.equal(getFeedbackWorkspacePriorityTone('high'), 'bg-orange-100 text-orange-700');
  assert.equal(formatFeedbackWorkspaceDate(''), '—');
  assert.equal(
    formatFeedbackWorkspaceDate('2026-04-19T12:00:00Z').includes('2026'),
    true
  );
  assert.equal(normalizeFeedbackWorkspaceView('IN_PROGRESS'), 'in_progress');
  assert.equal(normalizeFeedbackWorkspaceView('unknown'), 'all');
  assert.equal(previewFeedbackWorkspaceText('  hello  '), 'hello');
  assert.equal(previewFeedbackWorkspaceText('', 'fallback'), 'fallback');
});

test('feedback workspace ownership and filtering helpers stay deterministic', () => {
  const user = { uid: 'user-1', email: 'owner@example.com' };
  const item = {
    status: 'in_progress',
    priority: 'critical',
    assignee: { uid: 'user-1', email: 'owner@example.com' },
  };

  assert.equal(isFeedbackWorkspaceItemOwnedByCurrentUser(item, user), true);
  assert.equal(feedbackWorkspaceItemMatchesView(item, 'open', user), true);
  assert.equal(feedbackWorkspaceItemMatchesView(item, 'critical', user), true);
  assert.equal(feedbackWorkspaceItemMatchesView(item, 'mine', user), true);
  assert.equal(feedbackWorkspaceItemMatchesView(item, 'resolved', user), false);
});

test('buildFeedbackWorkspacePathWithParams omits empty values', () => {
  assert.equal(
    buildFeedbackWorkspacePathWithParams('/voice/reviews', {
      view: 'negative',
      feedbackId: '',
      platform: 'google',
    }),
    '/voice/reviews?view=negative&platform=google'
  );
});
