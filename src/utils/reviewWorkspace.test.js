import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPostingProviderOptions,
  buildReviewQueueViews,
  buildReviewWorkspaceExportRows,
  isReviewOwnedByCurrentUser,
  normalizeReviewWorkspaceView,
  reviewMatchesWorkspaceView,
} from './reviewWorkspace.js';

test('normalizeReviewWorkspaceView keeps supported queue filters and falls back to all', () => {
  assert.equal(normalizeReviewWorkspaceView('approved'), 'approved');
  assert.equal(normalizeReviewWorkspaceView('MINE'), 'mine');
  assert.equal(normalizeReviewWorkspaceView('unknown_view'), 'all');
});

test('isReviewOwnedByCurrentUser matches by uid or email', () => {
  assert.equal(
    isReviewOwnedByCurrentUser(
      { assigneeId: 'user-1', assignee: { email: 'owner@merxus.ai' } },
      { uid: 'user-1', email: 'elsewhere@merxus.ai' }
    ),
    true
  );
  assert.equal(
    isReviewOwnedByCurrentUser(
      { assignee: { email: 'owner@merxus.ai' } },
      { email: 'OWNER@merxus.ai' }
    ),
    true
  );
});

test('reviewMatchesWorkspaceView applies actionable, negative, and mine filters', () => {
  const review = {
    replyState: 'approved',
    aiSentiment: 'negative',
    rating: 2,
    assignee: { uid: 'user-1', email: 'owner@merxus.ai' },
  };

  assert.equal(reviewMatchesWorkspaceView(review, 'actionable', null), true);
  assert.equal(reviewMatchesWorkspaceView(review, 'negative', null), true);
  assert.equal(
    reviewMatchesWorkspaceView(review, 'mine', { uid: 'user-1', email: 'owner@merxus.ai' }),
    true
  );
  assert.equal(reviewMatchesWorkspaceView({ replyState: 'posted' }, 'actionable', null), false);
});

test('buildReviewWorkspaceExportRows keeps review workflow fields in CSV-ready form', () => {
  assert.deepEqual(
    buildReviewWorkspaceExportRows([
      {
        id: 'rev-1',
        platformLabel: 'Google',
        businessLocationLabel: 'Main',
        rating: 5,
        reviewerName: 'Taylor',
        replyState: 'posted',
        workflowGuidance: { statusLabel: 'Completed' },
        assigneeLabel: 'Alex',
        aiSentiment: 'positive',
        aiUrgency: 'low',
        createdAt: '2026-04-18T00:00:00Z',
        replyAttemptCount: 1,
        aiTopics: ['speed'],
        latestDraft: { body: 'Thanks for the visit!' },
      },
    ]),
    [
      {
        reviewId: 'rev-1',
        platform: 'Google',
        location: 'Main',
        rating: 5,
        reviewer: 'Taylor',
        replyState: 'posted',
        workflowStage: 'Completed',
        assignee: 'Alex',
        sentiment: 'positive',
        urgency: 'low',
        createdAt: '2026-04-18T00:00:00Z',
        approvedAt: '',
        postedAt: '',
        replyAttemptCount: 1,
        latestFailureReason: '',
        topics: ['speed'],
        reviewText: '',
        latestDraft: 'Thanks for the visit!',
      },
    ]
  );
});

test('buildPostingProviderOptions deduplicates and humanizes review providers', () => {
  assert.deepEqual(
    buildPostingProviderOptions({
      selectedPlatform: 'google',
      postedVia: 'facebook',
      availablePlatforms: ['google', 'trustpilot'],
    }),
    [
      { value: 'google', label: 'Google' },
      { value: 'facebook', label: 'Facebook' },
      { value: 'trustpilot', label: 'Trustpilot' },
    ]
  );
});

test('buildReviewQueueViews uses queue summary fallbacks and includes my queue when possible', () => {
  const views = buildReviewQueueViews(
    [
      { replyState: 'none', assignee: { uid: 'user-1', email: 'owner@merxus.ai' }, rating: 5 },
      { replyState: 'failed', aiSentiment: 'negative', rating: 1 },
    ],
    {},
    { uid: 'user-1', email: 'owner@merxus.ai' }
  );

  assert.equal(views.find((item) => item.key === 'all')?.count, 2);
  assert.equal(views.find((item) => item.key === 'needs_reply')?.count, 1);
  assert.equal(views.find((item) => item.key === 'failed')?.count, 1);
  assert.equal(views.find((item) => item.key === 'negative')?.count, 1);
  assert.equal(views.find((item) => item.key === 'mine')?.count, 1);
});
