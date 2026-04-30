const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://api.merxus.ai/api').replace(/\/+$/g, '');

async function publicChatRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error || payload.message || 'Chat is temporarily unavailable.';
    throw new Error(message);
  }
  return payload;
}

export function createPublicChatSession(body) {
  return publicChatRequest('/chat/public/session', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function sendPublicChatMessage(sessionId, body) {
  return publicChatRequest(`/chat/public/session/${encodeURIComponent(sessionId)}/message`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listPublicChatMessages(sessionId) {
  return publicChatRequest(`/chat/public/session/${encodeURIComponent(sessionId)}/messages`);
}

export function requestPublicChatHuman(sessionId, body = {}) {
  return publicChatRequest(`/chat/public/session/${encodeURIComponent(sessionId)}/request-human`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
