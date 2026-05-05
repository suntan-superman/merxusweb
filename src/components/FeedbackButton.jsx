import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  createPublicChatSession,
  listPublicChatMessages,
  requestPublicChatHuman,
  sendPublicChatMessage,
  timeoutPublicChatSession,
} from '../api/publicChat';

let supportAudioContext;
const SUPPORT_CHAT_GEOMETRY_KEY = 'merxus:support-chat-window';
const CHAT_WINDOW_MIN_WIDTH = 380;
const CHAT_WINDOW_MIN_HEIGHT = 480;
const CHAT_WINDOW_DEFAULT_WIDTH = 520;
const CHAT_WINDOW_DEFAULT_HEIGHT = 680;
const CHAT_WINDOW_MARGIN = 12;

function messageKey(message) {
  return message.id || `${message.sender}:${message.body}:${message.createdAt || ''}`;
}

function isInboundMessage(message) {
  const sender = String(message?.sender || message?.role || '').toLowerCase();
  return Boolean(message?.body) && sender !== 'visitor' && sender !== 'user';
}

function hasNewInboundMessage(previousMessages = [], nextMessages = []) {
  if (!previousMessages.length) return false;
  const previousKeys = new Set(previousMessages.map(messageKey));
  return nextMessages.some((message) => isInboundMessage(message) && !previousKeys.has(messageKey(message)));
}

function unlockSupportSound() {
  if (typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  supportAudioContext = supportAudioContext || new AudioContextClass();
  if (supportAudioContext.state === 'suspended') {
    supportAudioContext.resume().catch(() => {});
  }
}

function playSupportSound() {
  try {
    unlockSupportSound();
    if (!supportAudioContext) return;
    const oscillator = supportAudioContext.createOscillator();
    const gain = supportAudioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, supportAudioContext.currentTime);
    oscillator.frequency.setValueAtTime(1174, supportAudioContext.currentTime + 0.08);
    gain.gain.setValueAtTime(0.0001, supportAudioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, supportAudioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, supportAudioContext.currentTime + 0.28);
    oscillator.connect(gain);
    gain.connect(supportAudioContext.destination);
    oscillator.start();
    oscillator.stop(supportAudioContext.currentTime + 0.3);
  } catch (_) {
    // Browser audio permission is best-effort; visual messages remain authoritative.
  }
}

function resolveTenantType({ tenantType, restaurantId, agentId, officeId }) {
  if (tenantType) return tenantType;
  if (restaurantId) return 'restaurant';
  if (agentId) return 'agent';
  if (officeId) return 'office';
  return 'platform';
}

function resolveTenantId({ restaurantId, agentId, officeId }) {
  return restaurantId || agentId || officeId || 'merxus-platform';
}

function normalizeConversationMessages(messages = []) {
  const seen = new Set();
  return messages
    .map((message) => {
      const sender = message.sender || (message.role === 'assistant' ? 'ai' : message.role) || 'system';
      const body = message.body || message.text || '';
      return {
        ...message,
        sender,
        body,
      };
    })
    .filter((message) => {
      const key = message.id || `${message.sender}:${message.body}:${message.createdAt || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      if (!message.body || message.body === 'undefined') return false;
      return message.body.trim().toLowerCase() !== 'i would like to talk to a person.';
    });
}

function firstName(value) {
  return String(value || '').trim().split(/\s+/)[0] || '';
}

function renderSupportMessageBody(body) {
  const text = String(body || '');
  const parts = text.split(/(https?:\/\/[^\s]+|\/(?:voice|restaurant|estate|merxus|support|notifications|reviews|billing|customers|command-center|integrations|mobile|onboarding)\/?[^\s]*)/g);
  return parts.map((part, index) => {
    if (/^(https?:\/\/|\/)/.test(part)) {
      return (
        <a
          key={`${part}-${index}`}
          href={part}
          target={part.startsWith('http') ? '_blank' : undefined}
          rel={part.startsWith('http') ? 'noreferrer' : undefined}
          className="underline"
        >
          {part}
        </a>
      );
    }
    return <span key={`${index}-${part.slice(0, 8)}`}>{part}</span>;
  });
}

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function getViewportSize() {
  if (typeof window === 'undefined') {
    return { width: 1024, height: 768 };
  }
  return {
    width: window.innerWidth || 1024,
    height: window.innerHeight || 768,
  };
}

function normalizeChatGeometry(geometry = {}) {
  const viewport = getViewportSize();
  const availableWidth = Math.max(320, viewport.width - CHAT_WINDOW_MARGIN * 2);
  const availableHeight = Math.max(360, viewport.height - CHAT_WINDOW_MARGIN * 2);
  const minWidth = Math.min(CHAT_WINDOW_MIN_WIDTH, availableWidth);
  const minHeight = Math.min(CHAT_WINDOW_MIN_HEIGHT, availableHeight);
  const width = clamp(Number(geometry.width) || CHAT_WINDOW_DEFAULT_WIDTH, minWidth, availableWidth);
  const height = clamp(Number(geometry.height) || CHAT_WINDOW_DEFAULT_HEIGHT, minHeight, availableHeight);
  const defaultX = Math.round((viewport.width - width) / 2);
  const defaultY = Math.round((viewport.height - height) / 2);
  const maxX = Math.max(CHAT_WINDOW_MARGIN, viewport.width - width - CHAT_WINDOW_MARGIN);
  const maxY = Math.max(CHAT_WINDOW_MARGIN, viewport.height - height - CHAT_WINDOW_MARGIN);

  return {
    width,
    height,
    x: clamp(Number.isFinite(Number(geometry.x)) ? Number(geometry.x) : defaultX, CHAT_WINDOW_MARGIN, maxX),
    y: clamp(Number.isFinite(Number(geometry.y)) ? Number(geometry.y) : defaultY, CHAT_WINDOW_MARGIN, maxY),
  };
}

function loadChatGeometry(storageKey) {
  if (typeof window === 'undefined' || !storageKey) {
    return normalizeChatGeometry();
  }

  try {
    const saved = window.localStorage.getItem(storageKey);
    return normalizeChatGeometry(saved ? JSON.parse(saved) : {});
  } catch (error) {
    console.warn('Failed to load support chat window geometry:', error);
    return normalizeChatGeometry();
  }
}

function saveChatGeometry(storageKey, geometry) {
  if (typeof window === 'undefined' || !storageKey) return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(normalizeChatGeometry(geometry)));
  } catch (error) {
    console.warn('Failed to save support chat window geometry:', error);
  }
}

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [humanRequested, setHumanRequested] = useState(false);
  const [teamNotice, setTeamNotice] = useState(false);
  const messagesRef = useRef(messages);
  const chatWindowRef = useRef(null);
  const chatGeometryRef = useRef(null);
  const chatWindowActionRef = useRef(null);
  const [chatGeometry, setChatGeometry] = useState(() => normalizeChatGeometry());
  const [chatWindowAction, setChatWindowAction] = useState(null);
  const { user, tenantType, restaurantId, agentId, officeId } = useAuth();
  const isLoggedInChatWindow = Boolean(user);
  const chatGeometryStorageKey = user?.uid
    ? `${SUPPORT_CHAT_GEOMETRY_KEY}:${user.uid}`
    : SUPPORT_CHAT_GEOMETRY_KEY;
  const contactName = (user?.displayName || user?.email?.split('@')[0] || '').trim();
  const greeting = contactName ? `Hi ${contactName}, how can we help?` : 'How can we help?';

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    chatGeometryRef.current = chatGeometry;
  }, [chatGeometry]);

  useEffect(() => {
    if (!isLoggedInChatWindow) return;
    setChatGeometry(loadChatGeometry(chatGeometryStorageKey));
  }, [chatGeometryStorageKey, isLoggedInChatWindow]);

  useEffect(() => {
    if (!isLoggedInChatWindow || typeof window === 'undefined') return undefined;

    function handleWindowResize() {
      setChatGeometry((current) => normalizeChatGeometry(current));
    }

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [isLoggedInChatWindow]);

  useEffect(() => {
    if (!isLoggedInChatWindow || !chatWindowAction) return undefined;

    function handlePointerMove(event) {
      const action = chatWindowActionRef.current;
      if (!action) return;

      const deltaX = event.clientX - action.clientX;
      const deltaY = event.clientY - action.clientY;
      if (action.type === 'drag') {
        const nextGeometry = normalizeChatGeometry({
          ...action.geometry,
          x: action.geometry.x + deltaX,
          y: action.geometry.y + deltaY,
        });
        chatGeometryRef.current = nextGeometry;
        setChatGeometry(nextGeometry);
        return;
      }

      const nextGeometry = normalizeChatGeometry({
        ...action.geometry,
        width: action.geometry.width + deltaX,
        height: action.geometry.height + deltaY,
      });
      chatGeometryRef.current = nextGeometry;
      setChatGeometry(nextGeometry);
    }

    function handlePointerUp() {
      chatWindowActionRef.current = null;
      setChatWindowAction(null);
      saveChatGeometry(chatGeometryStorageKey, chatGeometryRef.current);
    }

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.userSelect = previousUserSelect;
    };
  }, [chatGeometryStorageKey, chatWindowAction, isLoggedInChatWindow]);

  useEffect(() => {
    if (!isOpen || !sessionId) return undefined;
    let cancelled = false;

    async function pollConversation() {
      try {
        const result = await listPublicChatMessages(sessionId);
        if (!cancelled) {
          const nextMessages = normalizeConversationMessages(result.messages || []);
          if (hasNewInboundMessage(messagesRef.current, nextMessages)) {
            playSupportSound();
          }
          setMessages(nextMessages);
          setError('');
        }
      } catch (pollError) {
        if (!cancelled) setError(pollError?.message || 'Unable to refresh this conversation.');
      }
    }

    pollConversation();
    const timer = window.setInterval(pollConversation, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isOpen, sessionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!feedback.trim()) {
      return;
    }

    setSubmitting(true);
    unlockSupportSound();
    setError('');
    try {
      const tenantContext = {
        tenantId: resolveTenantId({ restaurantId, agentId, officeId }),
        tenantType: resolveTenantType({ tenantType, restaurantId, agentId, officeId }),
      };
      const basePayload = {
        product: 'merxus',
        ...tenantContext,
        source: 'website_chat',
        sourceUrl: window.location.href,
        pageUrl: window.location.href,
        sourceApp: 'website',
        visitorId: user?.uid || `feedback_${Date.now()}`,
        leadName: user?.displayName || user?.email || null,
        leadEmail: user?.email || null,
        lead: {
          name: user?.displayName || user?.email || null,
          email: user?.email || null,
        },
        metadata: {
          entryPoint: 'feedback_button',
          appVersion: '1.0.0',
          platform: 'web',
        },
      };

      if (sessionId) {
        const sent = await sendPublicChatMessage(sessionId, {
          ...basePayload,
          message: feedback.trim(),
        });
        setMessages((current) => normalizeConversationMessages([...current, ...(sent.messages || [])]));
      } else {
        const created = await createPublicChatSession({
          ...basePayload,
          initialIntent: 'support',
          initialMessage: feedback.trim(),
        });

        if (created?.session?.id) {
          setSessionId(created.session.id);
          setMessages(normalizeConversationMessages(created.messages || []));
        }
      }

      setSubmitted(true);
      setFeedback('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setError(error?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestHuman = async () => {
    if (!sessionId || humanRequested || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      const requested = await requestPublicChatHuman(sessionId, {
        visitorId: user?.uid || null,
        leadName: user?.displayName || user?.email || null,
        leadEmail: user?.email || null,
        reason: 'visitor_requested_human',
      });
      setHumanRequested(true);
      setTeamNotice(true);
      setMessages((current) => normalizeConversationMessages([
        ...current,
        requested.message,
      ].filter(Boolean)));
    } catch (requestError) {
      setError(requestError?.message || 'Unable to notify the team. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndConversation = async () => {
    const activeSessionId = sessionId;
    setSubmitting(true);
    setError('');
    try {
      if (activeSessionId) {
        await timeoutPublicChatSession(activeSessionId, {
          visitorId: user?.uid || null,
          reason: 'visitor_ended_chat',
        });
      }
      setSessionId('');
      setMessages([]);
      setSubmitted(false);
      setFeedback('');
      setHumanRequested(false);
      setTeamNotice(false);
      setIsOpen(false);
    } catch (endError) {
      setError(endError?.message || 'Unable to end this conversation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const beginChatWindowAction = (event, type) => {
    if (!isLoggedInChatWindow) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (type === 'drag' && event.target?.closest?.('button, a, input, textarea, select, [role="button"]')) return;

    const rect = chatWindowRef.current?.getBoundingClientRect();
    if (!rect) return;

    event.preventDefault();
    event.stopPropagation();
    const geometry = normalizeChatGeometry({
      width: rect.width,
      height: rect.height,
      x: rect.left,
      y: rect.top,
    });
    chatWindowActionRef.current = {
      type,
      clientX: event.clientX,
      clientY: event.clientY,
      geometry,
    };
    chatGeometryRef.current = geometry;
    setChatGeometry(geometry);
    setChatWindowAction(type);
  };

  const chatWindowStyle = isLoggedInChatWindow
    ? {
        width: `${chatGeometry.width}px`,
        height: `${chatGeometry.height}px`,
        left: `${chatGeometry.x}px`,
        top: `${chatGeometry.y}px`,
      }
    : undefined;
  const overlayClassName = isLoggedInChatWindow
    ? 'fixed inset-0 bg-black bg-opacity-50 z-50'
    : 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
  const dialogClassName = isLoggedInChatWindow
    ? 'fixed flex flex-col overflow-hidden bg-white rounded-lg shadow-xl'
    : 'bg-white rounded-lg shadow-xl max-w-md w-full';
  const formClassName = isLoggedInChatWindow
    ? 'flex min-h-0 flex-1 flex-col overflow-hidden p-6'
    : 'p-6';
  const submittedContentClassName = isLoggedInChatWindow
    ? 'flex min-h-0 flex-1 flex-col gap-4'
    : 'space-y-4';
  const messagesClassName = isLoggedInChatWindow
    ? 'min-h-40 flex-1 space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3'
    : 'max-h-72 space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3';

  return (
    <>
      {/* Floating Feedback Button */}
      <button
        onClick={() => {
          unlockSupportSound();
          setIsOpen(true);
        }}
        className="fixed bottom-6 right-6 bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:shadow-xl z-40 flex items-center gap-2 group"
        title="Contact support"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">
          Support
        </span>
      </button>

      {/* Feedback Modal */}
      {isOpen && (
        <div className={overlayClassName}>
          <div
            ref={chatWindowRef}
            className={dialogClassName}
            style={chatWindowStyle}
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between p-6 border-b border-gray-200 ${isLoggedInChatWindow ? 'cursor-move select-none' : ''}`}
              onPointerDown={(event) => beginChatWindowAction(event, 'drag')}
              title={isLoggedInChatWindow ? 'Drag to move' : undefined}
            >
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Contact Support
                </h2>
                <p className="mt-1 text-sm text-gray-600">{greeting}</p>
              </div>
              <div className="flex items-center gap-3">
                {sessionId ? (
                  <button
                    type="button"
                    onClick={handleEndConversation}
                    disabled={submitting}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    End
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close support conversation"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className={formClassName}>
              {submitted ? (
                <div className={submittedContentClassName}>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    Thanks{contactName ? `, ${contactName}` : ''}. I’ll keep answering here, and you can ask for a person if you need one.
                  </div>
                  {teamNotice ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                      Team notified. A person can reply here when they pick up the conversation.
                    </div>
                  ) : null}
                  <div className={messagesClassName}>
                    {messages.map((message) => (
                      <div
                        key={message.id || `${message.sender}-${message.body}`}
                        className={`rounded-lg px-3 py-2 text-sm ${
                          message.sender === 'visitor'
                            ? 'ml-8 bg-blue-600 text-white'
                            : message.sender === 'agent'
                              ? 'mr-8 border border-teal-200 bg-teal-50 text-teal-950'
                              : 'mr-8 bg-white text-gray-800'
                        }`}
                      >
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-75">
                          {message.sender === 'ai' ? 'AI' : message.sender === 'visitor' ? firstName(contactName) || 'You' : message.sender}
                        </div>
                        <div className="whitespace-pre-wrap">{renderSupportMessageBody(message.body)}</div>
                      </div>
                    ))}
                  </div>
                  {!humanRequested ? (
                    <button
                      type="button"
                      onClick={handleRequestHuman}
                      disabled={submitting || !sessionId}
                      className="w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Talk to a person
                    </button>
                  ) : null}
                  <div>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Add another message..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                      rows={3}
                      maxLength={1000}
                    />
                    <button
                      type="submit"
                      disabled={submitting || !feedback.trim()}
                      className="mt-3 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      {submitting ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={isLoggedInChatWindow ? 'overflow-y-auto pr-1' : ''}>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-4">
                      {greeting} Send a message and we will keep the conversation open here.
                    </p>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Type your message here..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                      rows={6}
                      maxLength={1000}
                      required
                    />
                    <div className="text-right text-xs text-gray-500 mt-1">
                      {feedback.length}/1000 characters
                    </div>
                  </div>

                  {/* App Info */}
                  <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">
                      <strong>Merxus AI Assistant</strong> • Version 1.0.0 • Web
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting || !feedback.trim()}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Send Message
                      </>
                    )}
                  </button>
                </div>
              )}
              {error ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
            </form>
            {isLoggedInChatWindow ? (
              <button
                type="button"
                aria-label="Resize support chat window"
                title="Drag to resize"
                className="absolute bottom-0 right-0 h-6 w-6 cursor-se-resize opacity-60 hover:opacity-100"
                onPointerDown={(event) => beginChatWindowAction(event, 'resize')}
                style={{
                  background: 'linear-gradient(135deg, transparent 0%, transparent 50%, #9CA3AF 50%, #9CA3AF 100%)',
                }}
              />
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
