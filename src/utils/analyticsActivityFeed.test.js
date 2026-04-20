import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAnalyticsActivityFeedModel,
  formatAnalyticsActivityDateTime,
  getAnalyticsActivityTone,
} from './analyticsActivityFeed.js';

test('analytics activity helpers normalize tone and timestamp fallbacks', () => {
  assert.equal(getAnalyticsActivityTone('review_sync'), 'bg-sky-100 text-sky-700');
  assert.equal(getAnalyticsActivityTone('unknown'), 'bg-slate-100 text-slate-700');
  assert.equal(formatAnalyticsActivityDateTime('invalid-date'), 'Pending timestamp');
});

test('buildAnalyticsActivityFeedModel slices activity feed and builds count label', () => {
  const model = buildAnalyticsActivityFeedModel(
    {
      activityFeed: [
        { type: 'review_sync' },
        { type: 'notification_job' },
        { type: 'automation_alert' },
      ],
    },
    2
  );

  assert.equal(model.hasItems, true);
  assert.equal(model.items.length, 2);
  assert.equal(model.countLabel, '2 recent items');
});

test('buildAnalyticsActivityFeedModel returns singular label for one item', () => {
  const model = buildAnalyticsActivityFeedModel(
    {
      activityFeed: [{ type: 'restaurant' }],
    },
    8
  );

  assert.equal(model.countLabel, '1 recent item');
});
