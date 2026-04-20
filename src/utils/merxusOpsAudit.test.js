import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOpsAuditExportRows,
  formatAuditDateTime,
  getAuditStatusLabel,
  getAuditToneClasses,
  normalizeOpsAuditFilters,
  sortOpsAuditSections,
  sortOpsAuditTenantHighlights,
  sortOpsAuditTopFindings,
} from './merxusOpsAudit.js';

test('normalizeOpsAuditFilters applies defaults for invalid values', () => {
  const params = new URLSearchParams({
    days: '0',
    maxTenants: '-5',
    limitPerTenant: 'abc',
    tenantType: 'restaurant',
    tenantId: 'tenant_1',
    attentionOnly: 'true',
  });

  assert.deepEqual(normalizeOpsAuditFilters(params), {
    days: 30,
    maxTenants: 500,
    limitPerTenant: 100,
    tenantType: 'restaurant',
    tenantId: 'tenant_1',
    attentionOnly: true,
  });
});

test('buildOpsAuditExportRows includes overview, findings, sections, tenants, and commands', () => {
  const rows = buildOpsAuditExportRows({
    summary: {
      status: 'attention',
      severity: 'warning',
      attentionSections: 2,
      criticalSections: 0,
      warningSections: 2,
    },
    filters: {
      days: 14,
    },
    topFindings: [{ key: 'push_health', severity: 'warning', attentionCount: 3 }],
    sections: [{ key: 'scheduler_health', severity: 'critical', attentionCount: 2, metrics: { failedRuns: 2 } }],
    tenantHighlights: [{ auditKey: 'review_sync_pressure', tenantName: 'Tenant A', score: 8 }],
    commands: ['npm run ops:audit -- --attention-only'],
  });

  assert.equal(rows.length, 5);
  assert.equal(rows[0].section, 'overview');
  assert.equal(rows[1].section, 'top_findings');
  assert.equal(rows[2].section, 'sections');
  assert.equal(rows[3].section, 'tenant_pressure');
  assert.equal(rows[4].section, 'commands');
});

test('sortOpsAuditSections prioritizes focused and attention sections', () => {
  const sorted = sortOpsAuditSections(
    [
      { key: 'push_health', status: 'healthy', label: 'Push' },
      { key: 'review_sync_pressure', status: 'attention', label: 'Review Sync' },
      { key: 'automation_alerts', status: 'attention', label: 'Alerts' },
    ],
    'automation_alerts'
  );

  assert.deepEqual(sorted.map((item) => item.key), [
    'automation_alerts',
    'review_sync_pressure',
    'push_health',
  ]);
});

test('sortOpsAuditTopFindings and tenant highlights prioritize focused records', () => {
  const findings = sortOpsAuditTopFindings(
    [
      { key: 'push_health' },
      { key: 'review_integrations' },
    ],
    'review_integrations'
  );
  const highlights = sortOpsAuditTenantHighlights(
    [
      { auditKey: 'push_health', score: 20 },
      { auditKey: 'review_integrations', score: 1 },
      { auditKey: 'push_health', score: 30 },
    ],
    'review_integrations'
  );

  assert.deepEqual(findings.map((item) => item.key), ['review_integrations', 'push_health']);
  assert.deepEqual(
    highlights.map((item) => `${item.auditKey}:${item.score}`),
    ['review_integrations:1', 'push_health:30', 'push_health:20']
  );
});

test('formatting helpers return stable fallback labels', () => {
  assert.equal(getAuditToneClasses('critical'), 'border-red-200 bg-red-50 text-red-800');
  assert.equal(getAuditStatusLabel('warning'), 'Warning');
  assert.equal(formatAuditDateTime('not-a-date'), 'Pending timestamp');
});
