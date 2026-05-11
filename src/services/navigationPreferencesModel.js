export const NAVIGATION_PREFERENCES_SCHEMA_VERSION = 1;

export const DEFAULT_COLLAPSED_GROUPS = {
  quick_start: false,
  core: false,
  pro: true,
  elite: true,
  admin: true,
};

export function sanitizeQuickStartIds({ quickStartIds = [], availableItems = [] } = {}) {
  const availableIds = new Set(availableItems.map((item) => item.id));
  const seen = new Set();
  const output = [];

  for (const id of quickStartIds) {
    if (!availableIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    output.push(id);
  }

  return output;
}

export function buildDefaultNavigationPreferences({
  tenantType = 'voice',
  role = 'staff',
  availableItems = [],
} = {}) {
  const quickStartIds = availableItems
    .filter((item) => item.defaultQuickStart)
    .map((item) => item.id);

  const ownerAdminIds = role === 'owner'
    ? availableItems
      .filter((item) => ['billing', 'team_access', 'settings'].some((suffix) => item.id.endsWith(suffix)))
      .map((item) => item.id)
    : [];

  return {
    quickStartIds: sanitizeQuickStartIds({
      quickStartIds: [...quickStartIds, ...ownerAdminIds].slice(0, tenantType === 'restaurant' ? 7 : 6),
      availableItems,
    }),
    collapsedGroups: { ...DEFAULT_COLLAPSED_GROUPS },
    sidebarCollapsed: false,
    quickStartEditMode: false,
    schemaVersion: NAVIGATION_PREFERENCES_SCHEMA_VERSION,
  };
}

export function mergeNavigationPreferences({ savedPrefs, defaults, availableItems } = {}) {
  const fallback = defaults || buildDefaultNavigationPreferences({ availableItems });
  const savedQuickStartIds = Array.isArray(savedPrefs?.quickStartIds) ? savedPrefs.quickStartIds : fallback.quickStartIds;

  return {
    ...fallback,
    ...savedPrefs,
    quickStartIds: sanitizeQuickStartIds({
      quickStartIds: savedQuickStartIds,
      availableItems,
    }),
    collapsedGroups: {
      ...fallback.collapsedGroups,
      ...(savedPrefs?.collapsedGroups || {}),
    },
    schemaVersion: NAVIGATION_PREFERENCES_SCHEMA_VERSION,
  };
}
