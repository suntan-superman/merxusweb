import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';

function rig() {
  const calls = [];
  const baseline = { businessName: 'Tenant A', dailyDigestTime: '18:00', dailyDigestEnabled: false };
  const apiClient = {
    get: async () => ({ data: { sms: baseline, revision: 1 } }),
    patch: async (url, payload) => {
      calls.push({ url, payload });
      return { data: { sms: payload.sms, revision: payload.revision + 1 } };
    },
  };
  const source = fs.readFileSync(new URL('./sms.js', import.meta.url), 'utf8');
  const context = vm.createContext({ apiClient, crypto: { randomUUID } });
  vm.runInContext(source.replace(/^import .*\r?\n/, '').replaceAll('export async function', 'async function'), context);
  return { calls, baseline, save: context.updateSmsSettings };
}
test('web full-form digest edit uses protected single-field mutation without enabling delivery', async () => {
  const { calls, baseline, save } = rig();
  await save({ sms: { ...baseline, dailyDigestTime: '18:30' } });
  assert.equal(calls.length, 1);
  assert.equal(JSON.stringify(calls[0].payload.sms), JSON.stringify({ dailyDigestTime: '18:30' }));
  assert.equal(calls[0].payload.revision, 1);
  assert.ok(calls[0].payload.operationId);
});
test('branding remains protected; successive fields use acknowledged revisions', async () => {
  const { calls, baseline, save } = rig();
  await save({ sms: { ...baseline, businessName: 'New Name', dailyDigestTime: '18:30' } });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].payload.sms.businessName, 'New Name');
  assert.equal(calls[1].payload.revision, 2);
});
test('unchanged full forms write nothing and malformed time fails before writes', async () => {
  const { calls, baseline, save } = rig();
  await save({ sms: baseline });
  for (const dailyDigestTime of ['24:00', '8:30', '18:30\n']) await assert.rejects(save({ sms: { ...baseline, businessName: 'New', dailyDigestTime } }));
  assert.equal(calls.length, 0);
});

test('retry attempts uses revisioned numeric payload without enabling retries or editing digest', async () => {
  const { calls, baseline, save } = rig();
  Object.assign(baseline, { notificationRetryEnabled: false, notificationRetryMaxAttempts: 2 });
  await save({ sms: { ...baseline, notificationRetryMaxAttempts: 3 } });
  assert.equal(calls.length, 1);
  assert.equal(JSON.stringify(calls[0].payload.sms), JSON.stringify({ notificationRetryMaxAttempts: 3 }));
  assert.equal(calls[0].payload.revision, 1);
  assert.ok(calls[0].payload.operationId);
});
test('retry validation rejects malformed values before any protected or legacy write', async () => {
  const { calls, baseline, save } = rig();
  for (const notificationRetryMaxAttempts of [0, 11, 2.5, '3', '', null, true]) {
    await assert.rejects(save({ sms: { ...baseline, businessName: 'New', notificationRetryMaxAttempts } }));
  }
  assert.equal(calls.length, 0);
});

test('delay full-form adapter sends only protected 15 -> 20; leaves retries disabled', async () => {
  const { calls, baseline, save } = rig();
  Object.assign(baseline, { notificationRetryEnabled: false, notificationRetryMaxAttempts: 2, notificationRetryDelayMinutes: 15 });
  await save({ sms: { ...baseline, notificationRetryDelayMinutes: 20 } });
  assert.equal(calls.length, 1);
  assert.equal(JSON.stringify(calls[0].payload.sms), JSON.stringify({ notificationRetryDelayMinutes: 20 }));
  assert.equal(calls[0].payload.revision, 1);
  assert.ok(calls[0].payload.operationId);
});
test('delay malformed values fail before any write; existing 1..1440 bounds accepted', async () => {
  for (const value of [null, '20', '', true, -1, 0, 1441, 20.5]) {
    const { calls, baseline, save } = rig();
    await assert.rejects(save({ sms: { ...baseline, businessName: 'New', notificationRetryDelayMinutes: value } }));
    assert.equal(calls.length, 0);
  }
  for (const value of [1, 20, 1440]) {
    const { calls, baseline, save } = rig();
    await save({ sms: { ...baseline, notificationRetryDelayMinutes: value } });
    assert.equal(calls[0].payload.sms.notificationRetryDelayMinutes, value);
  }
});
