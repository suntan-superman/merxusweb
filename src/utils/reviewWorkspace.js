export function labelize(value) {
  return String(value || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function normalizeReviewWorkspaceView(value) {
  const normalized = String(value || '').toLowerCase();
  if (
    ['all', 'actionable', 'needs_reply', 'drafts', 'approved', 'failed', 'negative', 'unassigned', 'mine'].includes(
      normalized
    )
  ) {
    return normalized;
  }
  return 'all';
}

export function isReviewOwnedByCurrentUser(review, currentUser) {
  const ownerId = review?.assigneeId || review?.assignee?.uid || '';
  const ownerEmail = String(review?.assignee?.email || '').toLowerCase();
  const currentEmail = String(currentUser?.email || '').toLowerCase();

  if (currentUser?.uid && ownerId === currentUser.uid) return true;
  if (currentEmail && ownerEmail === currentEmail) return true;
  return false;
}

function isNegativeReview(review) {
  return (
    String(review?.aiSentiment || '').toLowerCase() === 'negative' ||
    (Number(review?.rating) || 0) <= 2
  );
}

export function reviewMatchesWorkspaceView(review, activeView, currentUser) {
  const replyState = String(review?.replyState || '').toLowerCase();
  const ownerId = review?.assigneeId || review?.assignee?.uid || '';

  if (activeView === 'actionable') {
    return replyState !== 'posted' || review?.replyVerification !== 'provider_verified';
  }
  if (activeView === 'needs_reply') return replyState === 'none';
  if (activeView === 'drafts') return replyState === 'draft';
  if (activeView === 'approved') return replyState === 'approved';
  if (activeView === 'failed') return replyState === 'failed';
  if (activeView === 'negative') return isNegativeReview(review);
  if (activeView === 'unassigned') {
    return replyState !== 'posted' && !ownerId && !review?.assigneeLabel && !review?.assignee?.email;
  }
  if (activeView === 'mine') {
    if (!currentUser?.uid && !currentUser?.email) return false;
    return isReviewOwnedByCurrentUser(review, currentUser);
  }
  return true;
}

export function buildReviewWorkspaceExportRows(items = []) {
  return (items || []).map((item) => ({
    reviewId: item.id,
    platform: item.platformLabel || item.platform || '',
    location: item.businessLocationLabel || '',
    rating: item.rating ?? '',
    reviewer: item.reviewerName || '',
    replyState: item.replyState || '',
    workflowStage: item.workflowGuidance?.statusLabel || '',
    assignee: item.assigneeLabel || item.assignee?.email || '',
    sentiment: item.aiSentiment || '',
    urgency: item.aiUrgency || '',
    createdAt: item.createdAt || '',
    approvedAt: item.replyApprovedAt || '',
    postedAt: item.replyPostedAt || '',
    replyAttemptCount: item.replyAttemptCount || 0,
    latestFailureReason: item.replyFailureReason || item.latestReplyAttempt?.failureReason || '',
    topics: item.aiTopics || [],
    reviewText: item.reviewText || '',
    latestDraft: item.latestDraft?.body || '',
  }));
}

export function buildPostingProviderOptions({
  selectedPlatform = '',
  postedVia = '',
  availablePlatforms = [],
} = {}) {
  const optionMap = new Map();

  const pushOption = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized || optionMap.has(normalized)) return;
    optionMap.set(normalized, {
      value: normalized,
      label: labelize(normalized),
    });
  };

  pushOption(selectedPlatform);
  pushOption(postedVia);
  (Array.isArray(availablePlatforms) ? availablePlatforms : []).forEach(pushOption);

  return Array.from(optionMap.values());
}

export function buildReviewQueueViews(items = [], queueSummary = {}, currentUser = null) {
  const currentItems = Array.isArray(items) ? items : [];
  const views = [
    { key: 'all', label: 'All', count: currentItems.length },
    {
      key: 'actionable',
      label: 'Actionable',
      count: queueSummary.actionable ?? currentItems.filter((item) => item.replyState !== 'posted').length,
    },
    {
      key: 'needs_reply',
      label: 'Needs Reply',
      count: queueSummary.needsResponse ?? currentItems.filter((item) => item.replyState === 'none').length,
    },
    {
      key: 'drafts',
      label: 'Drafts',
      count: queueSummary.draftsReady ?? currentItems.filter((item) => item.replyState === 'draft').length,
    },
    {
      key: 'approved',
      label: 'Approved',
      count: queueSummary.approved ?? currentItems.filter((item) => item.replyState === 'approved').length,
    },
    {
      key: 'failed',
      label: 'Failed',
      count: queueSummary.failed ?? currentItems.filter((item) => item.replyState === 'failed').length,
    },
    {
      key: 'negative',
      label: 'Negative',
      count: queueSummary.negative ?? currentItems.filter((item) => isNegativeReview(item)).length,
    },
    {
      key: 'unassigned',
      label: 'Unassigned',
      count:
        queueSummary.unassigned ??
        currentItems.filter((item) => item.replyState !== 'posted' && !item.assigneeId && !item.assigneeLabel && !item.assignee?.uid).length,
    },
  ];

  if (currentUser?.uid || currentUser?.email) {
    views.push({
      key: 'mine',
      label: 'My Queue',
      count: currentItems.filter((item) => reviewMatchesWorkspaceView(item, 'mine', currentUser)).length,
    });
  }

  return views;
}
