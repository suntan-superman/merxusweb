export function getReadinessToneClasses(status) {
  const normalized = String(status || 'ready').toLowerCase();
  if (normalized === 'attention') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }
  return 'border-emerald-200 bg-emerald-50 text-emerald-800';
}

export function formatRuntimePath(value) {
  return value || 'Unavailable in this runtime';
}

export function labelizeReadinessValue(value) {
  return String(value || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function buildReadinessExportRows(report = {}) {
  const rows = [];
  const addRow = (row) => rows.push(row);

  addRow({
    section: 'overview',
    metric: 'status',
    value: report.status || 'unknown',
    deployBlockers: report.deployBlockers?.length || 0,
    missingRequiredEnv: report.env?.missingRequired?.length || 0,
    providerGaps: report.reviewProviders?.missingRequiredProviders?.length || 0,
  });

  (report.deployBlockers || []).forEach((blocker) => {
    addRow({
      section: 'deploy_blockers',
      metric: blocker.key,
      severity: blocker.severity || 'warning',
      value: blocker.count || 0,
      headline: blocker.headline || '',
      route: blocker.route || '',
      relatedRoute: blocker.relatedRoute || '',
      actionCommand: blocker.actionCommand || '',
      items: blocker.items || [],
    });
  });

  (report.validationCategories || []).forEach((category) => {
    addRow({
      section: 'validation_categories',
      metric: category.key,
      value: category.itemCount || 0,
      headline: category.headline || '',
      route: category.route || '',
      relatedRoute: category.relatedRoute || '',
      actionCommand: category.actionCommand || '',
      secondaryCommands: category.secondaryCommands || [],
    });
  });

  (report.operationalAuditCommands || []).forEach((command) => {
    addRow({
      section: 'operational_commands',
      metric: 'command',
      value: command,
    });
  });

  return rows;
}

export function buildReadinessFocusOptions(blockers = [], validationCategories = []) {
  const seen = new Set();
  return [...blockers, ...validationCategories].reduce((options, item) => {
    const key = String(item?.key || '').trim();
    if (!key || seen.has(key)) return options;
    seen.add(key);
    options.push({
      key,
      label: item.label || labelizeReadinessValue(key),
    });
    return options;
  }, []);
}

export function filterReadinessItemsByFocus(items = [], focus = '') {
  if (!focus) return items;
  return items.filter((item) => item.key === focus);
}
