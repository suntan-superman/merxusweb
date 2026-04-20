export function getFeedbackWorkspaceStatusTone(status) {
  if (status === 'connected') return 'bg-emerald-100 text-emerald-700';
  if (status === 'needs_attention' || status === 'attention_required') {
    return 'bg-red-100 text-red-700';
  }
  if (status === 'new') return 'bg-red-100 text-red-700';
  if (status === 'in_progress') return 'bg-amber-100 text-amber-700';
  if (status === 'resolved') return 'bg-emerald-100 text-emerald-700';
  if (status === 'dismissed') return 'bg-slate-100 text-slate-600';
  if (status === 'detected') return 'bg-sky-100 text-sky-700';
  return 'bg-slate-100 text-slate-700';
}

export function getFeedbackWorkspacePriorityTone(priority) {
  if (priority === 'critical') return 'bg-red-100 text-red-700';
  if (priority === 'high') return 'bg-orange-100 text-orange-700';
  if (priority === 'medium') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

export function formatFeedbackWorkspaceDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString();
}

export function normalizeFeedbackWorkspaceView(value) {
  const normalized = String(value || '').toLowerCase();
  if (
    ['all', 'open', 'new', 'in_progress', 'critical', 'unassigned', 'mine', 'resolved'].includes(
      normalized
    )
  ) {
    return normalized;
  }
  return 'all';
}

export function previewFeedbackWorkspaceText(value, fallback = '') {
  const safeValue = String(value || '').trim();
  return safeValue || fallback;
}

export function isFeedbackWorkspaceItemOwnedByCurrentUser(item, currentUser) {
  const ownerId = item?.assignee?.uid || '';
  const ownerEmail = String(item?.assignee?.email || '').toLowerCase();
  const currentEmail = String(currentUser?.email || '').toLowerCase();

  if (currentUser?.uid && ownerId === currentUser.uid) return true;
  if (currentEmail && ownerEmail === currentEmail) return true;
  return false;
}

export function feedbackWorkspaceItemMatchesView(item, activeView, currentUser) {
  const status = String(item?.status || '').toLowerCase();
  const priority = String(item?.priority || '').toLowerCase();

  if (activeView === 'open') return ['new', 'in_progress'].includes(status);
  if (activeView === 'new') return status === 'new';
  if (activeView === 'in_progress') return status === 'in_progress';
  if (activeView === 'critical') return priority === 'critical';
  if (activeView === 'unassigned') {
    return !item?.assignee?.uid && !item?.assignee?.email && !item?.assignee?.name;
  }
  if (activeView === 'mine') {
    if (!currentUser?.uid && !currentUser?.email) return false;
    return isFeedbackWorkspaceItemOwnedByCurrentUser(item, currentUser);
  }
  if (activeView === 'resolved') return status === 'resolved';
  return true;
}

export function buildFeedbackWorkspacePathWithParams(basePath, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined) return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}
