import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessageCircle, Send, UserRound, X } from 'lucide-react';
import {
  createPublicChatSession,
  listPublicChatMessages,
  requestPublicChatHuman,
  sendPublicChatMessage,
  timeoutPublicChatSession,
} from '../../api/publicChat';
import { useAuth } from '../../context/AuthContext';

const STORAGE_PREFIX = 'merxus.publicChat';
const IDLE_WARNING_MS = 5 * 60 * 1000;
const IDLE_TERMINATE_MS = 60 * 1000;
const IDLE_CHECK_MS = 5000;
const INITIAL_MESSAGE = {
  id: 'welcome',
  sender: 'ai',
  body: 'Hi, I’m the Merxus assistant. Are you looking for help with your account, or are you interested in learning how Merxus AI works?',
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

function clearStoredChat() {
  if (typeof window === 'undefined') return;
  ['sessionId', 'leadName', 'leadEmail', 'lastActivityAt'].forEach((key) => {
    window.localStorage.removeItem(`${STORAGE_PREFIX}.${key}`);
  });
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
  return [INITIAL_MESSAGE, ...messages]
    .map((message) => {
      const sender = message.sender || (message.role === 'assistant' ? 'ai' : message.role) || 'system';
      const body = message.body || message.text || '';
      return {
        ...message,
        sender,
        body,
        role: sender === 'ai' ? 'assistant' : sender,
        text: body,
      };
    })
    .filter((message) => {
    const key = message.id || `${message.sender}:${message.body}:${message.createdAt || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(message.body && message.body !== 'undefined');
  });
}

function isValidLeadName(value) {
  return value.trim().length >= 3;
}

function isValidLeadEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value.trim());
}

function renderMessageBody(body) {
  const text = String(body || '');
  const parts = text.split(/(https?:\/\/[^\s]+|\/(?:voice|restaurant|estate|merxus)\/[^\s]+)/g);
  return parts.map((part, index) => {
    if (/^(https?:\/\/|\/)/.test(part)) {
      return (
        <a key={`${part}-${index}`} href={part} target={part.startsWith('http') ? '_blank' : undefined} rel={part.startsWith('http') ? 'noreferrer' : undefined}>
          {part}
        </a>
      );
    }
    return <span key={`${index}-${part.slice(0, 8)}`}>{part}</span>;
  });
}

export default function WebsiteChatWidget({
  product = 'merxus',
  tenantId = 'merxus-platform',
  tenantType = 'platform',
}) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(() => getStoredValue('sessionId'));
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [draft, setDraft] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState('');
  const [leadTouched, setLeadTouched] = useState({ name: false, email: false });
  const [humanRequested, setHumanRequested] = useState(false);
  const [idleWarning, setIdleWarning] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(60);
  const [confirmEndChat, setConfirmEndChat] = useState(false);
  const [lastActivityAt, setLastActivityAt] = useState(() => Number(getStoredValue('lastActivityAt')) || Date.now());
  const visitorId = useMemo(getVisitorId, []);
  const threadRef = useRef(null);
  const lastActivityRef = useRef(lastActivityAt);
  const loggedInName = (user?.displayName || user?.email?.split('@')[0] || user?.email || '').trim();
  const loggedInEmail = (user?.email || '').trim();
  const isLoggedIn = Boolean(user?.uid || loggedInEmail);
  const effectiveLeadName = isLoggedIn ? loggedInName : leadName.trim();
  const effectiveLeadEmail = isLoggedIn ? loggedInEmail : leadEmail.trim();

  const leadNameReady = isValidLeadName(effectiveLeadName);
  const leadEmailReady = isValidLeadEmail(effectiveLeadEmail);
  const leadCaptured = leadNameReady && leadEmailReady;
  const shouldShowLead = !isLoggedIn;
  const leadNameError = shouldShowLead && leadTouched.name && !leadNameReady ? 'Name must be at least 3 characters.' : '';
  const leadEmailError = shouldShowLead && leadTouched.email && !leadEmailReady ? 'Enter a valid email address.' : '';
  const talkToPersonDisabled = isSending || humanRequested || (!isLoggedIn && !leadCaptured);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(`${STORAGE_PREFIX}.leadName`);
    window.localStorage.removeItem(`${STORAGE_PREFIX}.leadEmail`);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    setLeadName(loggedInName);
    setLeadEmail(loggedInEmail);
    setLeadTouched({ name: false, email: false });
  }, [isLoggedIn, loggedInName, loggedInEmail]);

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

  function recordActivity() {
    const next = Date.now();
    lastActivityRef.current = next;
    setStoredValue('lastActivityAt', String(next));
    setLastActivityAt(next);
    setIdleWarning(false);
    setIdleCountdown(60);
  }

  function resetConversation() {
    clearStoredChat();
    setSessionId('');
    setMessages([INITIAL_MESSAGE]);
    setDraft('');
    setLeadName(isLoggedIn ? loggedInName : '');
    setLeadEmail(isLoggedIn ? loggedInEmail : '');
    setLeadTouched({ name: false, email: false });
    setHumanRequested(false);
    setIdleWarning(false);
    setIdleCountdown(60);
    setConfirmEndChat(false);
    setError('');
    recordActivity();
  }

  async function endConversation(reason = 'visitor_inactivity_timeout') {
    const activeSessionId = sessionId;
    resetConversation();
    if (!activeSessionId) return;
    try {
      await timeoutPublicChatSession(activeSessionId, { visitorId, reason });
    } catch (_) {
      // The local timeout still protects the visitor experience if the network is unavailable.
    }
  }

  function handleEndChatClick() {
    recordActivity();
    setConfirmEndChat(true);
  }

  useEffect(() => {
    if (!idleWarning) return undefined;
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((IDLE_TERMINATE_MS - (Date.now() - startedAt)) / 1000));
      setIdleCountdown(remaining);
      if (remaining <= 0) {
        window.clearInterval(interval);
        endConversation('visitor_inactivity_timeout');
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [idleWarning]);

  useEffect(() => {
    lastActivityRef.current = lastActivityAt;
  }, [lastActivityAt]);

  useEffect(() => {
    if (!isOpen || !sessionId) return undefined;

    const checkIdle = () => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= IDLE_WARNING_MS + IDLE_TERMINATE_MS) {
        endConversation('visitor_inactivity_timeout');
        return;
      }
      if (idleFor >= IDLE_WARNING_MS) {
        setIdleWarning(true);
        setIdleCountdown(Math.max(0, Math.ceil((IDLE_WARNING_MS + IDLE_TERMINATE_MS - idleFor) / 1000)));
      }
    };

    checkIdle();
    const interval = window.setInterval(checkIdle, IDLE_CHECK_MS);
    window.addEventListener('focus', checkIdle);
    document.addEventListener('visibilitychange', checkIdle);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', checkIdle);
      document.removeEventListener('visibilitychange', checkIdle);
    };
  }, [isOpen, sessionId]);

  async function handleSend(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;
    recordActivity();

    setIsSending(true);
    setError('');
    setDraft('');
    const optimistic = {
      id: `local_${Date.now()}`,
      sender: 'visitor',
      body: text,
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
        leadName: effectiveLeadName,
        leadEmail: effectiveLeadEmail,
        authenticated: isLoggedIn,
        appBaseUrl: window.location.origin,
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
    recordActivity();
    if (!isLoggedIn && !leadCaptured) {
      setLeadTouched({ name: true, email: true });
      setError('Please enter your name and a valid email before we notify the team.');
      return;
    }
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
          leadName: effectiveLeadName,
          leadEmail: effectiveLeadEmail,
          authenticated: isLoggedIn,
          appBaseUrl: window.location.origin,
        });
        activeSessionId = result.session?.id;
        setSessionId(activeSessionId);
        setStoredValue('sessionId', activeSessionId);
        setMessages(normalizeMessages(result.messages || []));
      }

      const requested = await requestPublicChatHuman(activeSessionId, {
        visitorId,
        leadName: effectiveLeadName,
        leadEmail: effectiveLeadEmail,
        authenticated: isLoggedIn,
        appBaseUrl: window.location.origin,
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
        <section className="website-chat-panel" aria-label="Merxus chat" onClick={(event) => event.stopPropagation()}>
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
              <div key={message.id || `${message.sender}-${message.body}`} className={`website-chat-message ${message.role || message.sender}`}>
                {message.sender === 'agent' ? <UserRound size={14} /> : null}
                <span>{renderMessageBody(message.body)}</span>
              </div>
            ))}
          </div>

          {shouldShowLead ? (
            <div className="website-chat-lead">
              <label className="website-chat-field">
                <input
                  value={leadName}
                  onChange={(event) => {
                    recordActivity();
                    setConfirmEndChat(false);
                    setLeadName(event.target.value);
                    if (error) setError('');
                  }}
                  onBlur={() => setLeadTouched((current) => ({ ...current, name: true }))}
                  placeholder="Name"
                  aria-label="Name"
                  aria-invalid={Boolean(leadNameError)}
                />
                {leadNameError ? <span>{leadNameError}</span> : null}
              </label>
              <label className="website-chat-field">
                <input
                  value={leadEmail}
                  onChange={(event) => {
                    recordActivity();
                    setConfirmEndChat(false);
                    setLeadEmail(event.target.value);
                    if (error) setError('');
                  }}
                  onBlur={() => setLeadTouched((current) => ({ ...current, email: true }))}
                  placeholder="Email"
                  aria-label="Email"
                  aria-invalid={Boolean(leadEmailError)}
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                />
                {leadEmailError ? <span>{leadEmailError}</span> : null}
              </label>
            </div>
          ) : null}

          {error ? <div className="website-chat-error">{error}</div> : null}

          {idleWarning ? (
            <div className="website-chat-timeout">
              <div>
                <strong>Still there?</strong>
                <span>This chat will end in {idleCountdown}s.</span>
              </div>
              <button type="button" onClick={recordActivity}>Continue</button>
            </div>
          ) : null}

          {confirmEndChat ? (
            <div className="website-chat-confirm" role="dialog" aria-label="Confirm end chat">
              <div>
                <strong>End this chat?</strong>
                <span>This clears the conversation and removes it from the queue.</span>
              </div>
              <div className="website-chat-confirm-actions">
                <button type="button" onClick={() => setConfirmEndChat(false)} disabled={isSending}>
                  Cancel
                </button>
                <button type="button" onClick={() => endConversation('visitor_ended_chat')} disabled={isSending}>
                  End chat
                </button>
              </div>
            </div>
          ) : null}

          <div className="website-chat-actions">
            {sessionId ? (
              <button
                type="button"
                className="website-chat-end"
                onClick={handleEndChatClick}
                disabled={isSending}
              >
                End chat
              </button>
            ) : null}
            <button type="button" className="website-chat-human" onClick={handleHumanRequest} disabled={talkToPersonDisabled}>
              <UserRound size={16} />
              <span>{humanRequested ? 'Team notified' : 'Talk to a person'}</span>
            </button>
          </div>

          <form className="website-chat-composer" onSubmit={handleSend}>
            <input
              value={draft}
              onChange={(event) => {
                recordActivity();
                setConfirmEndChat(false);
                setDraft(event.target.value);
              }}
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
