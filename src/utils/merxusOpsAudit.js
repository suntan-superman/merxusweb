export function formatAuditDateTime(value) {
  if (!value) return 'Pending timestamp';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Pending timestamp';
  return parsed.toLocaleString();
}

export function labelizeAuditValue(value) {
  return String(value || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getAuditToneClasses(status) {
  const normalized = String(status || 'healthy').toLowerCase();
  if (normalized === 'critical') {
    return 'border-red-200 bg-red-50 text-red-800';
  }
  if (normalized === 'warning' || normalized === 'attention') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }
  return 'border-emerald-200 bg-emerald-50 text-emerald-800';
}

export function getAuditStatusLabel(value) {
  const normalized = String(value || 'healthy').toLowerCase();
  if (normalized === 'critical') return 'Critical';
  if (normalized === 'warning') return 'Warning';
  if (normalized === 'attention') return 'Attention';
  return 'Healthy';
}

export function buildOpsAuditExportRows(report = {}) {
  const rows = [];
  const addRow = (row) => rows.push(row);

  addRow({
    section: 'overview',
    metric: 'status',
    value: report.summary?.status || 'unknown',
    severity: report.summary?.severity || 'healthy',
    attentionSections: report.summary?.attentionSections || 0,
    criticalSections: report.summary?.criticalSections || 0,
    warningSections: report.summary?.warningSections || 0,
    days: report.filters?.days || 30,
  });

  (report.topFindings || []).forEach((item) => {
    addRow({
      section: 'top_findings',
      metric: item.key,
      severity: item.severity || 'healthy',
      value: item.attentionCount || 0,
      label: item.label || '',
      headline: item.headline || '',
      actionCommand: item.actionCommand || '',
      route: item.route || '',
    });
  });

  (report.sections || []).forEach((item) => {
    addRow({
      section: 'sections',
      metric: item.key,
      severity: item.severity || 'healthy',
      value: item.attentionCount || 0,
      label: item.label || '',
      headline: item.headline || '',
      actionCommand: item.actionCommand || '',
      route: item.route || '',
      metrics: item.metrics || {},
    });
  });

  (report.tenantHighlights || []).forEach((item) => {
    addRow({
      section: 'tenant_pressure',
      metric: item.auditKey || '',
      tenantName: item.tenantName || '',
      tenantType: item.tenantType || '',
      value: item.score || 0,
      pressure: item.pressure || '',
      route: item.route || '',
      analyticsRoute: item.analyticsRoute || '',
    });
  });

  (report.commands || []).forEach((command) => {
    addRow({
      section: 'commands',
      metric: 'command',
      value: command,
    });
  });

  return rows;
}

export function normalizeOpsAuditFilters(searchParams) {
  const days = Number(searchParams.get('days') || 30);
  const maxTenants = Number(searchParams.get('maxTenants') || 500);
  const limitPerTenant = Number(searchParams.get('limitPerTenant') || 100);
  const tenantType = searchParams.get('tenantType') || '';
  const tenantId = searchParams.get('tenantId') || '';
  const attentionOnly = searchParams.get('attentionOnly') === 'true';

  return {
    days: Number.isFinite(days) && days > 0 ? days : 30,
    maxTenants: Number.isFinite(maxTenants) && maxTenants > 0 ? maxTenants : 500,
    limitPerTenant: Number.isFinite(limitPerTenant) && limitPerTenant > 0 ? limitPerTenant : 100,
    tenantType,
    tenantId,
    attentionOnly,
  };
}

export function sortOpsAuditSections(sections = [], focusSection = '') {
  return [...sections].sort((left, right) => {
    const leftFocused = left.key === focusSection ? 1 : 0;
    const rightFocused = right.key === focusSection ? 1 : 0;
    if (leftFocused !== rightFocused) return rightFocused - leftFocused;
    const leftAttention = left.status === 'attention' ? 1 : 0;
    const rightAttention = right.status === 'attention' ? 1 : 0;
    if (leftAttention !== rightAttention) return rightAttention - leftAttention;
    return String(left.label || '').localeCompare(String(right.label || ''));
  });
}

export function sortOpsAuditTopFindings(topFindings = [], focusSection = '') {
  return [...topFindings].sort((left, right) => {
    const leftFocused = left.key === focusSection ? 1 : 0;
    const rightFocused = right.key === focusSection ? 1 : 0;
    if (leftFocused !== rightFocused) return rightFocused - leftFocused;
    return 0;
  });
}

export function sortOpsAuditTenantHighlights(tenantHighlights = [], focusSection = '') {
  return [...tenantHighlights].sort((left, right) => {
    const leftFocused = left.auditKey === focusSection ? 1 : 0;
    const rightFocused = right.auditKey === focusSection ? 1 : 0;
    if (leftFocused !== rightFocused) return rightFocused - leftFocused;
    return Number(right.score || 0) - Number(left.score || 0);
  });
}
