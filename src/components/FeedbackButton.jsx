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

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const messagesRef = useRef(messages);
  const { user, tenantType, restaurantId, agentId, officeId } = useAuth();
  const contactName = (user?.displayName || user?.email?.split('@')[0] || '').trim();
  const greeting = contactName ? `Hi ${contactName}, how can we help?` : 'How can we help?';

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
          const requested = await requestPublicChatHuman(created.session.id, {
            visitorId: user?.uid || null,
            reason: 'feedback_support_request',
          });
          setMessages(normalizeConversationMessages([
            ...(created.messages || []),
            requested.message,
          ].filter(Boolean)));
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
      setIsOpen(false);
    } catch (endError) {
      setError(endError?.message || 'Unable to end this conversation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
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
            <form onSubmit={handleSubmit} className="p-6">
              {submitted ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    Thanks{contactName ? `, ${contactName}` : ''}. This conversation will stay open while our team reviews it.
                  </div>
                  <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
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
                          {message.sender === 'ai' ? 'AI' : message.sender}
                        </div>
                        {message.body}
                      </div>
                    ))}
                  </div>
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
                <>
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
                </>
              )}
              {error ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
