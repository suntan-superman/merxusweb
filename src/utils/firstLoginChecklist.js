const PENDING_KEY = 'merxus_first_login_checklist_pending_v1';
const DONE_KEY_PREFIX = 'merxus_first_login_checklist_done_v1';
const MAX_PENDING_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function safeGetStorageItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetStorageItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveStorageItem(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}

function getScopeId({ userId, tenantId }) {
  return tenantId || userId || 'unknown';
}

function normalizeTenantType(tenantType) {
  if (tenantType === 'office' || tenantType === 'general') return 'voice';
  if (tenantType === 'agent') return 'real_estate';
  return tenantType || null;
}

export function buildChecklistDoneKey({ tenantType, tenantId, userId }) {
  const normalizedTenantType = normalizeTenantType(tenantType);
  const scopeId = getScopeId({ tenantId, userId });
  return `${DONE_KEY_PREFIX}:${normalizedTenantType || 'unknown'}:${scopeId}`;
}

export function queueFirstLoginChecklist({ userId, tenantType, tenantId }) {
  const normalizedTenantType = normalizeTenantType(tenantType);
  if (!userId || !normalizedTenantType) return false;

  const payload = {
    userId,
    tenantType: normalizedTenantType,
    tenantId: tenantId || null,
    queuedAt: Date.now(),
  };

  return safeSetStorageItem(PENDING_KEY, JSON.stringify(payload));
}

export function getPendingFirstLoginChecklist() {
  const raw = safeGetStorageItem(PENDING_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const queuedAt = Number(parsed?.queuedAt || 0);

    if (!parsed?.userId || !parsed?.tenantType) {
      safeRemoveStorageItem(PENDING_KEY);
      return null;
    }

    if (!queuedAt || Date.now() - queuedAt > MAX_PENDING_AGE_MS) {
      safeRemoveStorageItem(PENDING_KEY);
      return null;
    }

    return parsed;
  } catch {
    safeRemoveStorageItem(PENDING_KEY);
    return null;
  }
}

export function clearPendingFirstLoginChecklist() {
  safeRemoveStorageItem(PENDING_KEY);
}

export function isFirstLoginChecklistCompleted({ tenantType, tenantId, userId }) {
  const key = buildChecklistDoneKey({
    tenantType: normalizeTenantType(tenantType),
    tenantId,
    userId,
  });
  return safeGetStorageItem(key) === '1';
}

export function markFirstLoginChecklistCompleted({ tenantType, tenantId, userId }) {
  const key = buildChecklistDoneKey({
    tenantType: normalizeTenantType(tenantType),
    tenantId,
    userId,
  });
  safeSetStorageItem(key, '1');
  clearPendingFirstLoginChecklist();
}
