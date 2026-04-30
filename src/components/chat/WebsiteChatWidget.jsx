import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessageCircle, Send, UserRound, X } from 'lucide-react';
import {
  createPublicChatSession,
  listPublicChatMessages,
  requestPublicChatHuman,
  sendPublicChatMessage,
} from '../../api/publicChat';

const STORAGE_PREFIX = 'merxus.publicChat';
const INITIAL_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  text: 'Hi, I’m the Merxus assistant. Are you looking for help with your account, or are you interested in learning how Merxus AI works?',
};

function getStoredValue(key) {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(`${STORAGE_PREFIX}.${key}`) || '';
}

function setStoredValue(key, value) {
  if (typeof window === 'undefined') return;
  if (!value) {
    window.localStorage.removeItem(`${STORAGE_PREFIX}.${key}`);
    return;
  }
  window.localStorage.setItem(`${STORAGE_PREFIX}.${key}`, value);
}

function getVisitorId() {
  const existing = getStoredValue('visitorId');
  if (existing) return existing;
  const next = `web_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  setStoredValue('visitorId', next);
  return next;
}

function normalizeMessages(messages = []) {
  const seen = new Set();
  return [INITIAL_MESSAGE, ...messages].filter((message) => {
    const key = message.id || `${message.role}:${message.text}:${message.createdAt || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(message.text);
  });
}

export default function WebsiteChatWidget({
  product = 'merxus',
  tenantId = 'merxus-platform',
  tenantType = 'platform',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(() => getStoredValue('sessionId'));
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [draft, setDraft] = useState('');
  const [leadName, setLeadName] = useState(() => getStoredValue('leadName'));
  const [leadEmail, setLeadEmail] = useState(() => getStoredValue('leadEmail'));
  const [isSending, setIsSending] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState('');
  const [humanRequested, setHumanRequested] = useState(false);
  const visitorId = useMemo(getVisitorId, []);
  const threadRef = useRef(null);

  const leadCaptured = Boolean(leadName.trim() && leadEmail.trim());
  const shouldShowLead = messages.length > 2 || !leadCaptured;

  useEffect(() => {
    setStoredValue('leadName', leadName.trim());
  }, [leadName]);

  useEffect(() => {
    setStoredValue('leadEmail', leadEmail.trim());
  }, [leadEmail]);

  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, isOpen]);

  useEffect(() => {
    if (!sessionId || !isOpen) return undefined;

    let cancelled = false;
    async function pollMessages() {
      setIsPolling(true);
      try {
        const result = await listPublicChatMessages(sessionId);
        if (!cancelled) {
          setMessages(normalizeMessages(result.messages || []));
          setError('');
        }
      } catch (pollError) {
        if (!cancelled) setError(pollError.message);
      } finally {
        if (!cancelled) setIsPolling(false);
      }
    }

    pollMessages();
    const timer = window.setInterval(pollMessages, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [sessionId, isOpen]);

  async function handleSend(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setError('');
    setDraft('');
    const optimistic = {
      id: `local_${Date.now()}`,
      role: 'visitor',
      text,
      pending: true,
    };
    setMessages((current) => normalizeMessages([...current.filter((item) => item.id !== 'welcome'), optimistic]));

    try {
      const basePayload = {
        product,
        tenantId,
        tenantType,
        source: 'website_chat',
        sourceUrl: window.location.href,
        visitorId,
        leadName: leadName.trim(),
        leadEmail: leadEmail.trim(),
      };

      const result = sessionId
        ? await sendPublicChatMessage(sessionId, { ...basePayload, message: text })
        : await createPublicChatSession({
            ...basePayload,
            initialIntent: 'general',
            initialMessage: text,
          });

      if (result.session?.id && !sessionId) {
        setSessionId(result.session.id);
        setStoredValue('sessionId', result.session.id);
      }
      if (result.session?.leadName) setLeadName(result.session.leadName);
      if (result.session?.leadEmail) setLeadEmail(result.session.leadEmail);
      setMessages((current) => normalizeMessages([...current.filter((item) => !item.pending), ...(result.messages || [])]));
    } catch (sendError) {
      setError(sendError.message);
      setMessages((current) => current.filter((item) => item.id !== optimistic.id));
      setDraft(text);
    } finally {
      setIsSending(false);
    }
  }

  async function handleHumanRequest() {
    if (humanRequested || isSending) return;
    setError('');
    setIsSending(true);
    try {
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        const result = await createPublicChatSession({
          product,
          tenantId,
          tenantType,
          source: 'website_chat',
          sourceUrl: window.location.href,
          visitorId,
          initialIntent: 'support',
          initialMessage: 'I would like to talk to a person.',
          leadName: leadName.trim(),
          leadEmail: leadEmail.trim(),
        });
        activeSessionId = result.session?.id;
        setSessionId(activeSessionId);
        setStoredValue('sessionId', activeSessionId);
        setMessages(normalizeMessages(result.messages || []));
      }

      const requested = await requestPublicChatHuman(activeSessionId, {
        visitorId,
        leadName: leadName.trim(),
        leadEmail: leadEmail.trim(),
      });
      setHumanRequested(true);
      setMessages((current) => normalizeMessages([...current.filter((item) => item.id !== 'welcome'), requested.message].filter(Boolean)));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="website-chat-widget" aria-live="polite">
      {isOpen ? (
        <section className="website-chat-panel" aria-label="Merxus chat">
          <header className="website-chat-header">
            <div>
              <div className="website-chat-title">Merxus AI</div>
              <div className="website-chat-subtitle">
                {isPolling ? 'Checking for replies' : humanRequested ? 'Team notified' : 'Sales and support'}
              </div>
            </div>
            <button type="button" className="website-chat-icon-button" onClick={() => setIsOpen(false)} aria-label="Close chat">
              <X size={18} />
            </button>
          </header>

          <div className="website-chat-thread" ref={threadRef}>
            {messages.map((message) => (
              <div key={message.id || `${message.role}-${message.text}`} className={`website-chat-message ${message.role}`}>
                {message.role === 'agent' ? <UserRound size={14} /> : null}
                <span>{message.text}</span>
              </div>
            ))}
          </div>

          {shouldShowLead ? (
            <div className="website-chat-lead">
              <input
                value={leadName}
                onChange={(event) => setLeadName(event.target.value)}
                placeholder="Name"
                aria-label="Name"
              />
              <input
                value={leadEmail}
                onChange={(event) => setLeadEmail(event.target.value)}
                placeholder="Email"
                aria-label="Email"
                type="email"
              />
            </div>
          ) : null}

          {error ? <div className="website-chat-error">{error}</div> : null}

          <div className="website-chat-actions">
            <button type="button" className="website-chat-human" onClick={handleHumanRequest} disabled={isSending || humanRequested}>
              <UserRound size={16} />
              <span>{humanRequested ? 'Team notified' : 'Talk to a person'}</span>
            </button>
          </div>

          <form className="website-chat-composer" onSubmit={handleSend}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type your message"
              aria-label="Type your message"
            />
            <button type="submit" disabled={isSending || !draft.trim()} aria-label="Send message">
              {isSending ? <Loader2 size={18} className="website-chat-spin" /> : <Send size={18} />}
            </button>
          </form>
        </section>
      ) : (
        <button type="button" className="website-chat-launcher" onClick={() => setIsOpen(true)} aria-label="Open Merxus chat">
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
}
