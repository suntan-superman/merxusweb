import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PublicChatError,
  extractPublicChatError,
  isPublicChatClosedError,
  isPublicChatClosedPayload,
  publicChatErrorMessage,
  submitPublicChatAnswerFeedback,
} from './publicChat.js';

test('extractPublicChatError handles nested structured backend errors', () => {
  const parsed = extractPublicChatError({
    ok: false,
    error: {
      code: 'LEAD_EMAIL_REQUIRED',
      message: 'Enter a valid email address.',
      requiredAction: 'enter_email',
    },
    details: { field: 'email' },
  });

  assert.equal(parsed.message, 'Enter a valid email address.');
  assert.equal(parsed.code, 'LEAD_EMAIL_REQUIRED');
  assert.equal(parsed.requiredAction, 'enter_email');
  assert.deepEqual(parsed.details, { field: 'email' });
});

test('extractPublicChatError handles legacy string errors', () => {
  const parsed = extractPublicChatError({ error: 'Session is closed', code: 'SESSION_CLOSED' });
  assert.equal(parsed.message, 'Session is closed');
  assert.equal(parsed.code, 'SESSION_CLOSED');
});

test('extractPublicChatError handles top-level message and code fields', () => {
  const parsed = extractPublicChatError({ message: 'No agent is currently available.', code: 'NO_AGENT_AVAILABLE' });
  assert.equal(parsed.message, 'No agent is currently available.');
  assert.equal(parsed.code, 'NO_AGENT_AVAILABLE');
});

test('extractPublicChatError never returns object string text', () => {
  const parsed = extractPublicChatError({ error: { code: 'BROKEN' } });
  assert.equal(parsed.message, 'Chat is temporarily unavailable.');
  assert.notEqual(parsed.message, '[object Object]');
});

test('PublicChatError exposes safe message and metadata', () => {
  const error = new PublicChatError('Human readable', {
    status: 422,
    code: 'lead name required',
    requiredAction: 'enter name',
  });

  assert.equal(publicChatErrorMessage(error), 'Human readable');
  assert.equal(error.status, 422);
  assert.equal(error.code, 'LEAD_NAME_REQUIRED');
  assert.equal(error.requiredAction, 'enter_name');
});

test('isPublicChatClosedPayload detects session close shapes', () => {
  assert.equal(isPublicChatClosedPayload({ session: { status: 'closed' } }), true);
  assert.equal(isPublicChatClosedPayload({ details: { sessionStatus: 'agent_closed' } }), true);
  assert.equal(isPublicChatClosedPayload({ session: { status: 'active_human' } }), false);
});

test('isPublicChatClosedError detects closed chat errors', () => {
  assert.equal(isPublicChatClosedError(new PublicChatError('Session is closed', { code: 'SESSION_CLOSED' })), true);
  assert.equal(isPublicChatClosedError(new PublicChatError('Chat is temporarily unavailable.', { code: 'NETWORK' })), false);
});

test('submitPublicChatAnswerFeedback posts to the answer feedback endpoint', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    };
  };

  try {
    const body = {
      product: 'merxus',
      tenantId: 'merxus-platform',
      rating: 'not_helpful',
      question: 'What do you do?',
      answer: 'Merxus answers customer questions.',
      messageId: 'msg_1',
    };
    const result = await submitPublicChatAnswerFeedback('session 1', body);

    assert.deepEqual(result, { ok: true });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.merxus.ai/api/chat/public/session/session%201/answer-feedback');
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(calls[0].options.body), body);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
