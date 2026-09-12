import assert from 'node:assert/strict';

// Isolated, explicitly local emulator only. Does not read credentials or contact
// Firebase production. Start the cached Firestore emulator with these rules.
const project = 'demo-merxus-phase2-rules';
const base = `http://127.0.0.1:18080/v1/projects/${project}/databases/(default)/documents`;
const jwt = (role, tenantId = 'merxus-maestro-rules-a') => {
  const now = Math.floor(Date.now() / 1000);
  return [ { alg: 'none', typ: 'JWT' }, { aud: project, iss: `https://securetoken.google.com/${project}`, sub: `rules-${role}-${tenantId}`, user_id: `rules-${role}-${tenantId}`, iat: now, exp: now + 3600, role, officeId: tenantId, firebase: { sign_in_provider: 'custom', identities: {} } } ].map((value) => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.') + '.';
};
const field = (value) => typeof value === 'string' ? { stringValue: value } : typeof value === 'boolean' ? { booleanValue: value } : typeof value === 'number' ? { integerValue: String(value) } : { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, field(nested)])) } };
async function request(path, token, method = 'GET', values, mask = '') {
  return fetch(`${base}/${path}${mask}`, { method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: values ? JSON.stringify({ fields: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, field(value)])) }) : undefined });
}
const path = 'offices/merxus-maestro-rules-a/meta/settings';
try {
  assert.equal((await request(path, 'owner', 'PATCH', { name: 'baseline', sms: { businessName: 'baseline', dailyDigestTime: '18:00', notificationRetryMaxAttempts: 2, notificationRetryEnabled: false }, smsSettingsRevision: 1 })).status, 200);
  for (const role of ['owner', 'manager', 'staff']) {
    assert.equal((await request(path, jwt(role))).status, 200, `${role} read`);
    for (const [values, mask] of [[{ sms: { notificationRetryDelayMinutes: 20 } }, '?updateMask.fieldPaths=sms.notificationRetryDelayMinutes'], [{ sms: { notificationRetryMaxAttempts: 3 } }, '?updateMask.fieldPaths=sms.notificationRetryMaxAttempts'], [{ sms: { notificationRetryEnabled: true } }, '?updateMask.fieldPaths=sms.notificationRetryEnabled'], [{ sms: { dailyDigestTime: '18:30' } }, '?updateMask.fieldPaths=sms.dailyDigestTime'], [{ sms: { businessName: 'ILLEGAL' } }, '?updateMask.fieldPaths=sms.businessName'], [{ smsSettingsRevision: 8 }, '?updateMask.fieldPaths=smsSettingsRevision'], [{ name: 'replacement deleting SMS' }, '']]) {
      const response = await request(path, jwt(role), 'PATCH', values, mask);
      assert.equal(response.status, 403, `${role} protected update: ${await response.text()}`);
    }
    assert.equal((await request(path, jwt(role), 'DELETE')).status, 403, `${role} delete`);
    assert.equal((await request(path, jwt(role), 'PATCH', { name: 'unrelated allowed' }, '?updateMask.fieldPaths=name')).status, 200, `${role} unrelated write`);
    assert.equal((await request('tenant_admin_audit/merxus-maestro-rules-a', jwt(role), 'PATCH', { outcome: 'forged' })).status, 403, `${role} audit write`);
    assert.equal((await request('tenant_admin_operations/merxus-maestro-rules-a', jwt(role), 'PATCH', { outcome: 'forged' })).status, 403, `${role} receipt write`);
  }
  assert.equal((await request(path, jwt('owner', 'merxus-maestro-rules-b'), 'PATCH', { sms: { businessName: 'cross' } }, '?updateMask.fieldPaths=sms.businessName')).status, 403);
  assert.equal((await request(path, 'owner', 'PATCH', { sms: { businessName: 'trusted admin' } }, '?updateMask.fieldPaths=sms.businessName')).status, 200);
  console.log('PASS: real emulator SMS read/write, role, cross-tenant, deletion, replacement, revision, audit and receipt boundaries');
} finally {
  await request(path, 'owner', 'DELETE');
}
