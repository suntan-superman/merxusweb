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
