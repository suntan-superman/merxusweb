import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchSlackCommandCenterEvents,
  fetchSmsNotificationRouting,
  fetchSmsSettings,
  sendSmsTest,
  triggerSlackCommandCenterDemo,
  updateSmsNotificationContacts,
  updateSmsNotificationGroups,
  updateSmsSettings,
} from '../../api/sms';

function tenantCopy(tenantType) {
  const inboxRoute =
    tenantType === 'restaurant' ? '/restaurant/sms' :
    tenantType === 'real_estate' ? '/estate/sms' :
    '/voice/sms';

  if (tenantType === 'restaurant') {
    return {
      title: 'SMS Messaging & Notifications',
      subtitle: 'Control caller confirmations, staff alerts, routing contacts, links, and inbound text behavior for your restaurant line.',
      inboxRoute,
    };
  }
  if (tenantType === 'real_estate') {
    return {
      title: 'SMS Messaging & Notifications',
      subtitle: 'Configure listing follow-ups, agent alerts, lead routing, and inbound text handling for your real estate line.',
      inboxRoute,
    };
  }
  return {
    title: 'SMS Messaging & Notifications',
    subtitle: 'Configure caller confirmations, staff alerts, service links, and inbound text behavior for your office line.',
    inboxRoute,
  };
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      {children}
      {hint ? <p className="text-xs text-gray-500 mt-1">{hint}</p> : null}
    </div>
  );
}

function buildFallbackSms(settings = {}) {
  return {
    enabled: false,
    aiEnabled: false,
    postCallFollowupEnabled: false,
    requireIntentForPostCallText: true,
    requireMeaningfulInteraction: true,
    requireCapturedContact: true,
    sendOnlyIfContactCaptured: false,
    allowManualAgentTriggeredTexts: true,
    quietHoursEnabled: false,
    postCallMinDurationSeconds: 15,
    minimumCallDurationSeconds: 15,
    maxAutoTextsPerCallerPer24h: 2,
    quietHoursStart: '21:00',
    quietHoursEnd: '08:00',
    callerConfirmationEnabled: true,
    staffAlertsEnabled: true,
    suppressSpam: true,
    suppressGeneralQuestion: true,
    callerChannels: ['sms'],
    staffChannels: ['sms', 'email', 'push'],
    notificationRetryEnabled: false,
    notificationRetryMaxAttempts: 2,
    notificationRetryDelayMinutes: 15,
    alertEscalationEnabled: false,
    alertEscalationDelayHours: 2,
    alertEscalationRepeatHours: 12,
    alertEscalationChannels: ['email'],
    alertEscalationRecipientGroupKeys: [],
    dailyDigestEnabled: false,
    dailyDigestTime: '18:00',
    dailyDigestChannels: ['email'],
    dailyDigestRecipientGroupKeys: [],
    displayName: 'Merxus AI',
    businessName:
      settings.sms?.businessName ||
      settings.name ||
      settings.brandName ||
      settings.organizationName ||
      settings.agentName ||
      '',
    replyHelpMessage:
      settings.sms?.replyHelpMessage ||
      `Thanks for messaging ${settings.name || settings.brandName || settings.organizationName || settings.agentName || 'your business'}. Reply STOP to opt out.`,
    replyStopMessage:
      settings.sms?.replyStopMessage ||
      'You have been unsubscribed and will no longer receive messages.',
    inlineTemplates: {
      post_call_generic: settings.sms?.inlineTemplates?.post_call_generic || '',
      inbound_default: settings.sms?.inlineTemplates?.inbound_default || '',
    },
    notificationTemplates: {
      'caller.reservation_confirmed': settings.sms?.notificationTemplates?.['caller.reservation_confirmed'] || '',
      'caller.order_confirmed': settings.sms?.notificationTemplates?.['caller.order_confirmed'] || '',
      'caller.support_request': settings.sms?.notificationTemplates?.['caller.support_request'] || '',
      'caller.listing_inquiry': settings.sms?.notificationTemplates?.['caller.listing_inquiry'] || '',
      'staff.reservation_confirmed': settings.sms?.notificationTemplates?.['staff.reservation_confirmed'] || '',
      'staff.order_confirmed': settings.sms?.notificationTemplates?.['staff.order_confirmed'] || '',
      'staff.support_request': settings.sms?.notificationTemplates?.['staff.support_request'] || '',
      'staff.listing_inquiry': settings.sms?.notificationTemplates?.['staff.listing_inquiry'] || '',
    },
    slack: {
      enabled: settings.sms?.slack?.enabled === true,
      webhookUrl: settings.sms?.slack?.webhookUrl || '',
      defaultChannel: settings.sms?.slack?.defaultChannel || '#merxus-activity',
      eventChannels: settings.sms?.slack?.eventChannels || {},
      commandCenterEnabled: settings.sms?.slack?.commandCenterEnabled === true,
      commandCenterChannel: settings.sms?.slack?.commandCenterChannel || '#merxus-command-center',
      slashCommandsEnabled: settings.sms?.slack?.slashCommandsEnabled === true,
    },
    links: {
      primaryLink: settings.sms?.links?.primaryLink || settings.website || '',
      menuLink: settings.sms?.links?.menuLink || settings.menuUrl || '',
      orderLink: settings.sms?.links?.orderLink || settings.orderUrl || '',
      reservationLink: settings.sms?.links?.reservationLink || settings.bookingUrl || '',
      listingLink: settings.sms?.links?.listingLink || settings.listingsLink || settings.listingsUrl || '',
      showingLink: settings.sms?.links?.showingLink || settings.showingRequestUrl || '',
      serviceLink: settings.sms?.links?.serviceLink || settings.serviceRequestLink || '',
      appointmentLink: settings.sms?.links?.appointmentLink || settings.bookingUrl || '',
      quoteLink: settings.sms?.links?.quoteLink || '',
      paymentLink: settings.sms?.links?.paymentLink || settings.invoiceLink || '',
      applicationLink: settings.sms?.links?.applicationLink || '',
      hoursLink: settings.sms?.links?.hoursLink || settings.website || '',
      locationLink: settings.sms?.links?.locationLink || settings.website || '',
    },
  };
}

function mergeSms(base, incoming = {}) {
  return {
    ...base,
    ...incoming,
    callerChannels: incoming.callerChannels || base.callerChannels,
    staffChannels: incoming.staffChannels || base.staffChannels,
    notificationRetryEnabled: incoming.notificationRetryEnabled ?? base.notificationRetryEnabled,
    notificationRetryMaxAttempts: incoming.notificationRetryMaxAttempts ?? base.notificationRetryMaxAttempts,
    notificationRetryDelayMinutes: incoming.notificationRetryDelayMinutes ?? base.notificationRetryDelayMinutes,
    alertEscalationEnabled: incoming.alertEscalationEnabled ?? base.alertEscalationEnabled,
    alertEscalationDelayHours: incoming.alertEscalationDelayHours ?? base.alertEscalationDelayHours,
    alertEscalationRepeatHours: incoming.alertEscalationRepeatHours ?? base.alertEscalationRepeatHours,
    alertEscalationChannels: incoming.alertEscalationChannels || base.alertEscalationChannels,
    alertEscalationRecipientGroupKeys: incoming.alertEscalationRecipientGroupKeys || base.alertEscalationRecipientGroupKeys,
    dailyDigestChannels: incoming.dailyDigestChannels || base.dailyDigestChannels,
    dailyDigestRecipientGroupKeys: incoming.dailyDigestRecipientGroupKeys || base.dailyDigestRecipientGroupKeys,
    inlineTemplates: {
      ...base.inlineTemplates,
      ...(incoming.inlineTemplates || {}),
    },
    notificationTemplates: {
      ...base.notificationTemplates,
      ...(incoming.notificationTemplates || {}),
    },
    slack: {
      ...base.slack,
      ...(incoming.slack || {}),
      eventChannels: {
        ...(base.slack?.eventChannels || {}),
        ...(incoming.slack?.eventChannels || {}),
      },
    },
    links: {
      ...base.links,
      ...(incoming.links || {}),
    },
  };
}

function createEmptyContact() {
  return {
    id: `contact_${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    role: '',
    phone: '',
    email: '',
    webhookUrl: '',
    userId: '',
    channels: ['sms'],
    isActive: true,
  };
}

function normalizeRoutingState(data = {}) {
  const contacts = Array.isArray(data.contacts)
    ? data.contacts.map((contact) => ({
        id: contact.id || `contact_${Math.random().toString(36).slice(2, 8)}`,
        name: contact.name || '',
        role: contact.role || '',
        phone: contact.phone || '',
        email: contact.email || '',
        webhookUrl: contact.webhookUrl || '',
        userId: contact.userId || '',
        channels: contact.channels?.length ? contact.channels : (contact.webhookUrl ? ['webhook'] : ['sms']),
        isActive: contact.isActive !== false,
      }))
    : [];

  return {
    contacts,
    groups: data.groups || {},
    definitions: data.definitions || [],
  };
}

const NOTIFICATION_TEMPLATE_FIELDS = [
  { key: 'caller.reservation_confirmed', label: 'Caller reservation confirmation' },
  { key: 'caller.order_confirmed', label: 'Caller order confirmation' },
  { key: 'caller.support_request', label: 'Caller support confirmation' },
  { key: 'caller.listing_inquiry', label: 'Caller listing inquiry confirmation' },
  { key: 'staff.reservation_confirmed', label: 'Staff reservation alert' },
  { key: 'staff.order_confirmed', label: 'Staff order alert' },
  { key: 'staff.support_request', label: 'Staff support alert' },
  { key: 'staff.listing_inquiry', label: 'Staff listing alert' },
];

const CHECKBOX_CLASS = 'checkbox-green h-4 w-4 rounded border-gray-300 focus:ring-primary-500';

const COMMAND_CENTER_EVENT_OPTIONS = [
  { key: 'incoming_call_detected', label: 'Incoming call detected' },
  { key: 'intent_classified', label: 'Intent classified' },
  { key: 'event_created', label: 'Structured event created' },
  { key: 'reservation_created', label: 'Reservation captured' },
  { key: 'order_created', label: 'Order captured' },
  { key: 'buyer_lead_created', label: 'Buyer lead captured' },
  { key: 'seller_lead_created', label: 'Seller lead captured' },
  { key: 'support_request_created', label: 'Support request captured' },
  { key: 'quote_request_created', label: 'Quote request captured' },
  { key: 'appointment_requested', label: 'Appointment requested' },
  { key: 'workflow_status_changed', label: 'Workflow status changed' },
  { key: 'assignment_changed', label: 'Assignment changed' },
  { key: 'appointment_updated', label: 'Appointment updated' },
  { key: 'quote_updated', label: 'Quote updated' },
  { key: 'service_request_updated', label: 'Service request updated' },
];

function formatCommandCenterStatus(status) {
  return String(status || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCommandCenterDate(value) {
  if (!value) return 'Pending timestamp';

  const raw =
    typeof value?.toDate === 'function'
      ? value.toDate()
      : value?._seconds
        ? new Date(value._seconds * 1000)
        : value;
  const date = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(date.getTime())) return 'Pending timestamp';
  return date.toLocaleString();
}

export default function SmsSettings({ settings, tenantType }) {
  const copy = tenantCopy(tenantType);
  const [form, setForm] = useState(() => buildFallbackSms(settings));
  const [routing, setRouting] = useState(() => normalizeRoutingState());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingCommandCenterDemo, setSendingCommandCenterDemo] = useState(false);
  const [commandCenterHistory, setCommandCenterHistory] = useState([]);
  const [loadingCommandCenterHistory, setLoadingCommandCenterHistory] = useState(true);
  const [tenantContext, setTenantContext] = useState({ tenantId: '', tenantType });
  const [testNumber, setTestNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setForm((current) => mergeSms(buildFallbackSms(settings), current));
  }, [settings]);

  useEffect(() => {
    let cancelled = false;

    async function loadCommandCenterHistory() {
      const historyData = await fetchSlackCommandCenterEvents({ limit: 12, days: 7 });
      if (!cancelled) {
        setCommandCenterHistory(historyData.events || []);
        setLoadingCommandCenterHistory(false);
      }
    }

    async function load() {
      try {
        setLoading(true);
        setLoadingCommandCenterHistory(true);
        setError('');
        const [smsData, routingData] = await Promise.all([
          fetchSmsSettings(),
          fetchSmsNotificationRouting(),
        ]);

        if (!cancelled) {
          setForm(mergeSms(buildFallbackSms(settings), smsData.sms || {}));
          setTenantContext({
            tenantId: smsData.tenantId || '',
            tenantType: smsData.tenantType || tenantType,
          });
          setRouting(normalizeRoutingState(routingData));
        }
        await loadCommandCenterHistory();
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.response?.data?.error || 'Failed to load SMS notification settings.');
          setLoadingCommandCenterHistory(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [settings]);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function updateLink(name, value) {
    setForm((prev) => ({
      ...prev,
      links: {
        ...prev.links,
        [name]: value,
      },
    }));
  }

  function updateTemplate(name, value, type = 'inlineTemplates') {
    setForm((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [name]: value,
      },
    }));
  }

  function updateSlackField(name, value) {
    setForm((prev) => ({
      ...prev,
      slack: {
        ...prev.slack,
        [name]: value,
      },
    }));
  }

  function updateSlackEventChannel(eventKey, value) {
    setForm((prev) => ({
      ...prev,
      slack: {
        ...prev.slack,
        eventChannels: {
          ...prev.slack.eventChannels,
          [eventKey]: value,
        },
      },
    }));
  }

  function toggleChannel(field, channel) {
    setForm((prev) => {
      const current = new Set(prev[field] || []);
      if (current.has(channel)) current.delete(channel);
      else current.add(channel);
      return { ...prev, [field]: Array.from(current) };
    });
  }

  function toggleDigestGroup(groupKey) {
    setForm((prev) => {
      const current = new Set(prev.dailyDigestRecipientGroupKeys || []);
      if (current.has(groupKey)) current.delete(groupKey);
      else current.add(groupKey);
      return { ...prev, dailyDigestRecipientGroupKeys: Array.from(current) };
    });
  }

  function toggleAlertEscalationGroup(groupKey) {
    setForm((prev) => {
      const current = new Set(prev.alertEscalationRecipientGroupKeys || []);
      if (current.has(groupKey)) current.delete(groupKey);
      else current.add(groupKey);
      return { ...prev, alertEscalationRecipientGroupKeys: Array.from(current) };
    });
  }

  function addContact() {
    setRouting((prev) => ({
      ...prev,
      contacts: [...prev.contacts, createEmptyContact()],
    }));
  }

  function updateContact(index, key, value) {
    setRouting((prev) => ({
      ...prev,
      contacts: prev.contacts.map((contact, contactIndex) => (
        contactIndex === index ? { ...contact, [key]: value } : contact
      )),
    }));
  }

  function toggleContactChannel(index, channel) {
    setRouting((prev) => ({
      ...prev,
      contacts: prev.contacts.map((contact, contactIndex) => {
        if (contactIndex !== index) return contact;
        const channels = new Set(contact.channels || []);
        if (channels.has(channel)) channels.delete(channel);
        else channels.add(channel);
        return { ...contact, channels: Array.from(channels) };
      }),
    }));
  }

  function removeContact(index) {
    const removedId = routing.contacts[index]?.id;
    setRouting((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((_, contactIndex) => contactIndex !== index),
      groups: Object.fromEntries(
        Object.entries(prev.groups || {}).map(([key, ids]) => [
          key,
          (ids || []).filter((id) => id !== removedId),
        ])
      ),
    }));
  }

  function toggleGroupAssignment(groupKey, contactId) {
    setRouting((prev) => {
      const current = new Set(prev.groups?.[groupKey] || []);
      if (current.has(contactId)) current.delete(contactId);
      else current.add(contactId);

      return {
        ...prev,
        groups: {
          ...prev.groups,
          [groupKey]: Array.from(current),
        },
      };
    });
  }

  async function handleSave(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const [smsResponse, contactsResponse, groupsResponse] = await Promise.all([
        updateSmsSettings({ sms: form }),
        updateSmsNotificationContacts({ contacts: routing.contacts }),
        updateSmsNotificationGroups({ groups: routing.groups }),
      ]);

      setForm(mergeSms(buildFallbackSms(settings), smsResponse.sms || {}));
      setTenantContext({
        tenantId: smsResponse.tenantId || tenantContext.tenantId,
        tenantType: smsResponse.tenantType || tenantContext.tenantType,
      });
      setRouting((prev) => ({
        ...prev,
        contacts: contactsResponse.contacts || prev.contacts,
        groups: groupsResponse.groups || prev.groups,
      }));
      setSuccess('SMS notification settings saved.');
      window.setTimeout(() => setSuccess(''), 3000);
    } catch (saveError) {
      setError(saveError?.response?.data?.error || 'Failed to save SMS notification settings.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSend() {
    if (!testNumber.trim()) {
      setError('Enter a phone number to send a test SMS.');
      return;
    }

    try {
      setSendingTest(true);
      setError('');
      setSuccess('');
      const result = await sendSmsTest({ to: testNumber.trim() });
      if (result?.status === 'skipped_self_number') {
        setError('Test SMS was blocked because the destination matches the tenant SMS number.');
        return;
      }
      const statusLabel =
        result?.status === 'queued' ? 'queued' :
        result?.status === 'accepted' ? 'accepted by Twilio' :
        result?.status === 'sent' ? 'sent' :
        'submitted';
      setSuccess(`Test SMS ${statusLabel}.`);
      window.setTimeout(() => setSuccess(''), 3000);
    } catch (sendError) {
      setError(sendError?.response?.data?.error || 'Failed to send test SMS.');
    } finally {
      setSendingTest(false);
    }
  }

  async function handleSendCommandCenterDemo() {
    try {
      setSendingCommandCenterDemo(true);
      setError('');
      setSuccess('');
      await triggerSlackCommandCenterDemo();
      const historyData = await fetchSlackCommandCenterEvents({ limit: 12, days: 7 });
      setCommandCenterHistory(historyData.events || []);
      setSuccess('Slack Command Center demo events sent.');
      window.setTimeout(() => setSuccess(''), 3000);
    } catch (sendError) {
      setError(sendError?.response?.data?.error || 'Failed to send Slack Command Center demo.');
    } finally {
      setSendingCommandCenterDemo(false);
    }
  }

  const policyPreview = useMemo(() => {
    const parts = [
      `Caller confirmations are ${form.callerConfirmationEnabled ? 'enabled' : 'disabled'}.`,
      `Staff alerts are ${form.staffAlertsEnabled ? 'enabled' : 'disabled'}.`,
      `Merxus suppresses calls shorter than ${form.minimumCallDurationSeconds || form.postCallMinDurationSeconds || 15} seconds.`,
      form.requireMeaningfulInteraction
        ? 'A meaningful interaction is required before sending notifications.'
        : 'Notifications may send even if the interaction was shallow.',
      form.requireCapturedContact
        ? 'A captured callback phone or email is required for caller confirmations.'
        : 'Merxus can notify callers using the raw caller number.',
      form.suppressSpam ? 'Spam is suppressed.' : 'Spam is not suppressed.',
      form.suppressGeneralQuestion ? 'General questions are suppressed by default.' : 'General questions may notify staff.',
    ];

    if (form.quietHoursEnabled) {
      parts.push(`Quiet hours apply from ${form.quietHoursStart} to ${form.quietHoursEnd}.`);
    }

    if (form.dailyDigestEnabled) {
      parts.push(`Daily digest runs at ${form.dailyDigestTime} using ${form.dailyDigestChannels.join(', ').toUpperCase()} delivery.`);
    } else {
      parts.push('Daily digest is disabled.');
    }

    if (form.notificationRetryEnabled) {
      parts.push(`Automatic retry is enabled with ${form.notificationRetryMaxAttempts} attempts and a ${form.notificationRetryDelayMinutes}-minute delay.`);
    } else {
      parts.push('Automatic retry is disabled.');
    }

    if (form.alertEscalationEnabled) {
      parts.push(`Unowned automation alerts escalate after ${form.alertEscalationDelayHours} hours and repeat every ${form.alertEscalationRepeatHours} hours via ${form.alertEscalationChannels.join(', ').toUpperCase()}.`);
    } else {
      parts.push('Automation alert escalation is disabled.');
    }

    return parts.join(' ');
  }, [form]);

  const slackCommandUrl = useMemo(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://api.merxus.ai/api';
    if (!tenantContext.tenantId || !tenantContext.tenantType) {
      return '';
    }
    const normalizedBase = String(apiBase).replace(/\/+$/g, '');
    return `${normalizedBase}/integrations/slack/command?tenantId=${encodeURIComponent(tenantContext.tenantId)}&tenantType=${encodeURIComponent(tenantContext.tenantType)}`;
  }, [tenantContext]);

  const slackInteractionUrl = useMemo(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://api.merxus.ai/api';
    if (!tenantContext.tenantId || !tenantContext.tenantType) {
      return '';
    }
    const normalizedBase = String(apiBase).replace(/\/+$/g, '');
    return `${normalizedBase}/integrations/slack/interaction?tenantId=${encodeURIComponent(tenantContext.tenantId)}&tenantType=${encodeURIComponent(tenantContext.tenantType)}`;
  }, [tenantContext]);

  if (loading) {
    return (
      <section className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{copy.title}</h3>
        <p className="text-sm text-gray-600">Loading SMS notification settings…</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{copy.title}</h3>
          <p className="text-sm text-gray-600">{copy.subtitle}</p>
        </div>
        <Link to={copy.inboxRoute} className="btn-primary whitespace-nowrap">
          Open SMS Inbox
        </Link>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mt-4 rounded-md border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
          {success}
        </div>
      ) : null}

      <form onSubmit={handleSave} className="mt-6 space-y-6">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
            <input type="checkbox" checked={form.enabled} onChange={(event) => updateField('enabled', event.target.checked)} className={CHECKBOX_CLASS} />
            <div>
              <p className="text-sm font-medium text-gray-900">Enable SMS</p>
              <p className="text-xs text-gray-500">Turns on texting for this tenant number.</p>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
            <input type="checkbox" checked={form.aiEnabled} onChange={(event) => updateField('aiEnabled', event.target.checked)} className={CHECKBOX_CLASS} />
            <div>
              <p className="text-sm font-medium text-gray-900">Enable AI SMS replies</p>
              <p className="text-xs text-gray-500">Allows automatic responses to inbound texts.</p>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
            <input type="checkbox" checked={form.callerConfirmationEnabled} onChange={(event) => updateField('callerConfirmationEnabled', event.target.checked)} className={CHECKBOX_CLASS} />
            <div>
              <p className="text-sm font-medium text-gray-900">Enable caller confirmations</p>
              <p className="text-xs text-gray-500">Send concise confirmations to callers when the outcome is actionable.</p>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
            <input type="checkbox" checked={form.staffAlertsEnabled} onChange={(event) => updateField('staffAlertsEnabled', event.target.checked)} className={CHECKBOX_CLASS} />
            <div>
              <p className="text-sm font-medium text-gray-900">Enable staff alerts</p>
              <p className="text-xs text-gray-500">Notify tenant-configured contact groups for meaningful events.</p>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
            <input type="checkbox" checked={form.postCallFollowupEnabled} onChange={(event) => updateField('postCallFollowupEnabled', event.target.checked)} className={CHECKBOX_CLASS} />
            <div>
              <p className="text-sm font-medium text-gray-900">Enable legacy post-call follow-up</p>
              <p className="text-xs text-gray-500">Keeps the conservative caller follow-up workflow active after eligible calls.</p>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
            <input type="checkbox" checked={form.requireMeaningfulInteraction} onChange={(event) => updateField('requireMeaningfulInteraction', event.target.checked)} className={CHECKBOX_CLASS} />
            <div>
              <p className="text-sm font-medium text-gray-900">Require meaningful interaction</p>
              <p className="text-xs text-gray-500">Suppress alerts for weak or inconclusive calls.</p>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
            <input type="checkbox" checked={form.requireCapturedContact} onChange={(event) => updateField('requireCapturedContact', event.target.checked)} className={CHECKBOX_CLASS} />
            <div>
              <p className="text-sm font-medium text-gray-900">Require captured callback details</p>
              <p className="text-xs text-gray-500">Only send caller confirmations when Merxus captured usable callback data.</p>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
            <input type="checkbox" checked={form.suppressSpam} onChange={(event) => updateField('suppressSpam', event.target.checked)} className={CHECKBOX_CLASS} />
            <div>
              <p className="text-sm font-medium text-gray-900">Suppress spam / dead air</p>
              <p className="text-xs text-gray-500">Blocks caller and staff notifications for spam-like calls.</p>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
            <input type="checkbox" checked={form.suppressGeneralQuestion} onChange={(event) => updateField('suppressGeneralQuestion', event.target.checked)} className={CHECKBOX_CLASS} />
            <div>
              <p className="text-sm font-medium text-gray-900">Suppress general questions</p>
              <p className="text-xs text-gray-500">Prevents routine informational calls from spamming staff.</p>
            </div>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Business Name">
            <input type="text" className="input-field" value={form.businessName} onChange={(event) => updateField('businessName', event.target.value)} placeholder="Business name" />
          </Field>
          <Field label="Display Name" hint="Internal branding label used in message composition.">
            <input type="text" className="input-field" value={form.displayName} onChange={(event) => updateField('displayName', event.target.value)} placeholder="Merxus AI" />
          </Field>
          <Field label="Minimum Call Duration (seconds)">
            <input type="number" min="0" className="input-field" value={form.minimumCallDurationSeconds} onChange={(event) => updateField('minimumCallDurationSeconds', Number(event.target.value || 0))} />
          </Field>
          <Field label="Max Auto Texts Per 24h">
            <input type="number" min="1" className="input-field" value={form.maxAutoTextsPerCallerPer24h} onChange={(event) => updateField('maxAutoTextsPerCallerPer24h', Number(event.target.value || 1))} />
          </Field>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Channel Controls</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Caller channels</p>
              <div className="flex gap-3">
                {['sms'].map((channel) => (
                  <label key={channel} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={form.callerChannels.includes(channel)} onChange={() => toggleChannel('callerChannels', channel)} className={CHECKBOX_CLASS} />
                    {channel.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Staff channels</p>
              <div className="flex flex-wrap gap-3">
                {['sms', 'email', 'push', 'slack', 'teams', 'webhook'].map((channel) => (
                  <label key={channel} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={form.staffChannels.includes(channel)} onChange={() => toggleChannel('staffChannels', channel)} className={CHECKBOX_CLASS} />
                    {channel.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Daily Digest</h4>
              <p className="text-xs text-gray-500">Send a compact activity summary to designated staff once per day.</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={form.dailyDigestEnabled} onChange={(event) => updateField('dailyDigestEnabled', event.target.checked)} className={CHECKBOX_CLASS} />
              Enabled
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Digest Send Time" hint="Tenant-local target time for the future scheduled job.">
              <input type="time" className="input-field" value={form.dailyDigestTime} onChange={(event) => updateField('dailyDigestTime', event.target.value)} disabled={!form.dailyDigestEnabled} />
            </Field>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Digest channels</p>
              <div className="flex flex-wrap gap-3">
                {['sms', 'email', 'push', 'slack', 'teams', 'webhook'].map((channel) => (
                  <label key={channel} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={form.dailyDigestChannels.includes(channel)} onChange={() => toggleChannel('dailyDigestChannels', channel)} className={CHECKBOX_CLASS} disabled={!form.dailyDigestEnabled} />
                    {channel.toUpperCase()}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Email is recommended for richer summaries. SMS stays short.</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Digest recipient groups</p>
            {routing.definitions.length === 0 ? (
              <p className="text-sm text-gray-500">Routing groups will appear after notification routing loads.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {routing.definitions.map((definition) => (
                  <label key={definition.key} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={(form.dailyDigestRecipientGroupKeys || []).includes(definition.key)}
                      onChange={() => toggleDigestGroup(definition.key)}
                      className={CHECKBOX_CLASS}
                      disabled={!form.dailyDigestEnabled}
                    />
                    {definition.label}
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              If no contacts are assigned inside the selected groups, Merxus falls back to active contacts in the directory.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Notification Retry Policy</h4>
              <p className="text-xs text-gray-500">Used by retry sweeps for failed email, SMS, and push notification events.</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={form.notificationRetryEnabled} onChange={(event) => updateField('notificationRetryEnabled', event.target.checked)} className={CHECKBOX_CLASS} />
              Enabled
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Max Retry Attempts" hint="Root notification events stop retrying after this many attempts.">
              <input
                type="number"
                min="1"
                max="10"
                className="input-field"
                value={form.notificationRetryMaxAttempts}
                onChange={(event) => updateField('notificationRetryMaxAttempts', Number(event.target.value || 1))}
                disabled={!form.notificationRetryEnabled}
              />
            </Field>
            <Field label="Retry Delay (minutes)" hint="Minimum time between retry attempts for the same failed notification chain.">
              <input
                type="number"
                min="1"
                max="1440"
                className="input-field"
                value={form.notificationRetryDelayMinutes}
                onChange={(event) => updateField('notificationRetryDelayMinutes', Number(event.target.value || 1))}
                disabled={!form.notificationRetryEnabled}
              />
            </Field>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Automation Alert Escalation</h4>
              <p className="text-xs text-gray-500">Escalate active automation failures that remain unowned so they do not disappear into run history.</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={form.alertEscalationEnabled} onChange={(event) => updateField('alertEscalationEnabled', event.target.checked)} className={CHECKBOX_CLASS} />
              Enabled
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="First Escalation Delay (hours)" hint="Unowned alerts escalate after this many hours from the failing run.">
              <input
                type="number"
                min="1"
                max="168"
                className="input-field"
                value={form.alertEscalationDelayHours}
                onChange={(event) => updateField('alertEscalationDelayHours', Number(event.target.value || 1))}
                disabled={!form.alertEscalationEnabled}
              />
            </Field>
            <Field label="Repeat Escalation Every (hours)" hint="Reminder cadence while the alert remains active, unowned, and not snoozed.">
              <input
                type="number"
                min="1"
                max="168"
                className="input-field"
                value={form.alertEscalationRepeatHours}
                onChange={(event) => updateField('alertEscalationRepeatHours', Number(event.target.value || 1))}
                disabled={!form.alertEscalationEnabled}
              />
            </Field>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Escalation channels</p>
              <div className="flex flex-wrap gap-3">
                {['email', 'sms', 'slack', 'teams', 'webhook'].map((channel) => (
                  <label key={channel} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={form.alertEscalationChannels.includes(channel)} onChange={() => toggleChannel('alertEscalationChannels', channel)} className={CHECKBOX_CLASS} disabled={!form.alertEscalationEnabled} />
                    {channel.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Escalation recipient groups</p>
              {routing.definitions.length === 0 ? (
                <p className="text-sm text-gray-500">Routing groups will appear after notification routing loads.</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {routing.definitions.map((definition) => (
                    <label key={definition.key} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={(form.alertEscalationRecipientGroupKeys || []).includes(definition.key)}
                        onChange={() => toggleAlertEscalationGroup(definition.key)}
                        className={CHECKBOX_CLASS}
                        disabled={!form.alertEscalationEnabled}
                      />
                      {definition.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={form.quietHoursEnabled} onChange={(event) => updateField('quietHoursEnabled', event.target.checked)} className={CHECKBOX_CLASS} />
            <span className="text-sm font-medium text-gray-900">Enable quiet hours</span>
          </label>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Quiet Hours Start">
              <input type="time" className="input-field" value={form.quietHoursStart} onChange={(event) => updateField('quietHoursStart', event.target.value)} disabled={!form.quietHoursEnabled} />
            </Field>
            <Field label="Quiet Hours End">
              <input type="time" className="input-field" value={form.quietHoursEnd} onChange={(event) => updateField('quietHoursEnd', event.target.value)} disabled={!form.quietHoursEnabled} />
            </Field>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Slack Activity Feed</h4>
              <p className="text-xs text-gray-500">Post real-time Merxus activity and Command Center demo events to Slack using a tenant webhook.</p>
            </div>
            <button
              type="button"
              onClick={handleSendCommandCenterDemo}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={sendingCommandCenterDemo || !form.slack.enabled || !form.slack.commandCenterEnabled || !form.slack.webhookUrl}
            >
              {sendingCommandCenterDemo ? 'Sending Demo…' : 'Send Demo Command Center Event'}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
              <input type="checkbox" checked={form.slack.enabled} onChange={(event) => updateSlackField('enabled', event.target.checked)} className={CHECKBOX_CLASS} />
              <div>
                <p className="text-sm font-medium text-gray-900">Enable Slack integration</p>
                <p className="text-xs text-gray-500">Uses an incoming webhook as a tenant-level activity output.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
              <input type="checkbox" checked={form.slack.commandCenterEnabled} onChange={(event) => updateSlackField('commandCenterEnabled', event.target.checked)} className={CHECKBOX_CLASS} disabled={!form.slack.enabled} />
              <div>
                <p className="text-sm font-medium text-gray-900">Enable Live AI Command Center</p>
                <p className="text-xs text-gray-500">Posts incoming-call and structured-event activity into a live Slack feed.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
              <input type="checkbox" checked={form.slack.slashCommandsEnabled} onChange={(event) => updateSlackField('slashCommandsEnabled', event.target.checked)} className={CHECKBOX_CLASS} disabled={!form.slack.enabled} />
              <div>
                <p className="text-sm font-medium text-gray-900">Enable signed Slack slash commands</p>
                <p className="text-xs text-gray-500">Supports `/merxus help`, `activity`, `status`, `inbox`, `notifications`, and `intelligence` via a tenant-specific Slack command URL.</p>
              </div>
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Slack Webhook URL" hint="Incoming webhook used for the tenant activity feed and Command Center posts.">
              <input
                type="url"
                className="input-field"
                value={form.slack.webhookUrl}
                onChange={(event) => updateSlackField('webhookUrl', event.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                disabled={!form.slack.enabled}
              />
            </Field>
            <Field label="Default Slack Channel" hint="Optional channel override for general Slack activity messages.">
              <input
                type="text"
                className="input-field"
                value={form.slack.defaultChannel}
                onChange={(event) => updateSlackField('defaultChannel', event.target.value)}
                placeholder="#merxus-activity"
                disabled={!form.slack.enabled}
              />
            </Field>
            <Field label="Command Center Channel" hint="Dedicated live feed used for the demo-style command center stream.">
              <input
                type="text"
                className="input-field"
                value={form.slack.commandCenterChannel}
                onChange={(event) => updateSlackField('commandCenterChannel', event.target.value)}
                placeholder="#merxus-command-center"
                disabled={!form.slack.enabled || !form.slack.commandCenterEnabled}
              />
            </Field>
          </div>

          <div className="mt-4 rounded-lg border border-gray-200 p-4">
            <div className="mb-3">
              <h5 className="text-sm font-semibold text-gray-900">Per-Event Channel Routing</h5>
              <p className="text-xs text-gray-500">Override the default Command Center channel for specific live events. Leave blank to use the Command Center channel.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {COMMAND_CENTER_EVENT_OPTIONS.map((item) => (
                <Field key={item.key} label={item.label} hint={`Optional Slack channel for ${item.label.toLowerCase()}.`}>
                  <input
                    type="text"
                    className="input-field"
                    value={form.slack.eventChannels?.[item.key] || ''}
                    onChange={(event) => updateSlackEventChannel(item.key, event.target.value)}
                    placeholder={form.slack.commandCenterChannel || '#merxus-command-center'}
                    disabled={!form.slack.enabled || !form.slack.commandCenterEnabled}
                  />
                </Field>
              ))}
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-gray-200 p-4">
              <div className="mb-3">
                <h5 className="text-sm font-semibold text-gray-900">Slack Slash Command Setup</h5>
                <p className="text-xs text-gray-500">Use this URL as the Slack slash command Request URL for this tenant. Slack request signing must also be configured on the backend with `SLACK_SIGNING_SECRET`.</p>
              </div>
              <Field label="Tenant-specific Slack command URL" hint="Configure this in your Slack app slash command settings.">
                <input
                  type="text"
                  className="input-field"
                  value={slackCommandUrl}
                  readOnly
                />
              </Field>
              <Field label="Slack interactivity URL" hint="Configure this in your Slack app Interactivity settings so button actions can acknowledge, snooze, resume, claim, release, note, and advance Slack-linked alerts and work items.">
                <input
                  type="text"
                  className="input-field"
                  value={slackInteractionUrl}
                  readOnly
                />
              </Field>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  '/merxus help',
                  '/merxus activity',
                  '/merxus activity 5',
                  '/merxus alerts',
                  '/merxus status',
                  '/merxus inbox',
                  '/merxus notifications',
                  '/merxus intelligence',
                ].map((item) => (
                  <div key={item} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <code>{item}</code>
                  </div>
                ))}
              </div>
              {tenantType === 'restaurant' ? (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  <code>/merxus reservations today</code>
                </div>
              ) : null}
              {tenantType === 'real_estate' ? (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  <code>/merxus leads today</code>
                </div>
              ) : null}
              {tenantType === 'voice' ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <code>/merxus work-items</code>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <code>/merxus work-items quotes</code>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 rounded-lg border border-gray-200 p-4">
              <div className="mb-3">
              <h5 className="text-sm font-semibold text-gray-900">Recent Command Center Events</h5>
              <p className="text-xs text-gray-500">Shows the latest Slack feed delivery attempts for this tenant, including skipped duplicate or rate-limited events.</p>
            </div>

            {loadingCommandCenterHistory ? (
              <p className="text-sm text-gray-500">Loading Command Center history…</p>
            ) : commandCenterHistory.length === 0 ? (
              <p className="text-sm text-gray-500">No Command Center events recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Time</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Event</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Channel</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {commandCenterHistory.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-gray-600">{formatCommandCenterDate(item.createdAt)}</td>
                        <td className="px-3 py-2 text-gray-900">{item.eventType ? item.eventType.replace(/_/g, ' ') : 'Unknown event'}</td>
                        <td className="px-3 py-2 text-gray-600">{item.slackChannel || 'Default'}</td>
                        <td className="px-3 py-2 text-gray-600">{formatCommandCenterStatus(item.status)}</td>
                        <td className="px-3 py-2 text-gray-600">{item.summary || item.subject || item.reason || 'No summary'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Staff Contact Directory</h4>
              <p className="text-xs text-gray-500">Contacts can receive SMS, email, and push alerts by event type.</p>
            </div>
            <button type="button" onClick={addContact} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Add Contact
            </button>
          </div>

          {routing.contacts.length === 0 ? (
            <p className="text-sm text-gray-500">No staff contacts configured yet.</p>
          ) : (
            <div className="space-y-4">
              {routing.contacts.map((contact, index) => (
                <div key={contact.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <Field label="Name">
                      <input type="text" className="input-field" value={contact.name} onChange={(event) => updateContact(index, 'name', event.target.value)} placeholder="Front Desk" />
                    </Field>
                    <Field label="Role">
                      <input type="text" className="input-field" value={contact.role} onChange={(event) => updateContact(index, 'role', event.target.value)} placeholder="host, manager, support" />
                    </Field>
                    <Field label="Phone">
                      <input type="tel" className="input-field" value={contact.phone} onChange={(event) => updateContact(index, 'phone', event.target.value)} placeholder="+15551234567" />
                    </Field>
                    <Field label="Email">
                      <input type="email" className="input-field" value={contact.email} onChange={(event) => updateContact(index, 'email', event.target.value)} placeholder="owner@example.com" />
                    </Field>
                    <Field label="Webhook URL">
                      <input type="url" className="input-field" value={contact.webhookUrl} onChange={(event) => updateContact(index, 'webhookUrl', event.target.value)} placeholder="https://hooks.slack.com/..." />
                    </Field>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    {['sms', 'email', 'push', 'slack', 'teams', 'webhook'].map((channel) => (
                      <label key={channel} className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={contact.channels.includes(channel)} onChange={() => toggleContactChannel(index, channel)} className={CHECKBOX_CLASS} />
                        {channel.toUpperCase()}
                      </label>
                    ))}
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={contact.isActive} onChange={(event) => updateContact(index, 'isActive', event.target.checked)} className={CHECKBOX_CLASS} />
                      Active
                    </label>
                    <button type="button" onClick={() => removeContact(index)} className="ml-auto text-sm font-medium text-red-600 hover:text-red-700">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Event Routing Groups</h4>
          <div className="space-y-4">
            {routing.definitions.map((definition) => (
              <div key={definition.key} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-900">{definition.label}</p>
                  <p className="text-xs text-gray-500">
                    Handles: {definition.eventTypes.join(', ')}
                  </p>
                </div>
                {routing.contacts.length === 0 ? (
                  <p className="text-sm text-gray-500">Add contacts first, then assign them here.</p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {routing.contacts.map((contact) => (
                      <label key={`${definition.key}-${contact.id}`} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={(routing.groups?.[definition.key] || []).includes(contact.id)}
                          onChange={() => toggleGroupAssignment(definition.key, contact.id)}
                          className={CHECKBOX_CLASS}
                        />
                        {contact.name || contact.email || contact.phone || contact.id}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Link Targets</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Primary Website Link"><input type="url" className="input-field" value={form.links.primaryLink} onChange={(event) => updateLink('primaryLink', event.target.value)} placeholder="https://..." /></Field>
            <Field label="Menu Link"><input type="url" className="input-field" value={form.links.menuLink} onChange={(event) => updateLink('menuLink', event.target.value)} placeholder="https://..." /></Field>
            <Field label="Order Link"><input type="url" className="input-field" value={form.links.orderLink} onChange={(event) => updateLink('orderLink', event.target.value)} placeholder="https://..." /></Field>
            <Field label="Reservation Link"><input type="url" className="input-field" value={form.links.reservationLink} onChange={(event) => updateLink('reservationLink', event.target.value)} placeholder="https://..." /></Field>
            <Field label="Listings Link"><input type="url" className="input-field" value={form.links.listingLink} onChange={(event) => updateLink('listingLink', event.target.value)} placeholder="https://..." /></Field>
            <Field label="Showing Link"><input type="url" className="input-field" value={form.links.showingLink} onChange={(event) => updateLink('showingLink', event.target.value)} placeholder="https://..." /></Field>
            <Field label="Service Request Link"><input type="url" className="input-field" value={form.links.serviceLink} onChange={(event) => updateLink('serviceLink', event.target.value)} placeholder="https://..." /></Field>
            <Field label="Appointment Link"><input type="url" className="input-field" value={form.links.appointmentLink} onChange={(event) => updateLink('appointmentLink', event.target.value)} placeholder="https://..." /></Field>
            <Field label="Quote Link"><input type="url" className="input-field" value={form.links.quoteLink} onChange={(event) => updateLink('quoteLink', event.target.value)} placeholder="https://..." /></Field>
            <Field label="Payment Link"><input type="url" className="input-field" value={form.links.paymentLink} onChange={(event) => updateLink('paymentLink', event.target.value)} placeholder="https://..." /></Field>
            <Field label="Application Link"><input type="url" className="input-field" value={form.links.applicationLink} onChange={(event) => updateLink('applicationLink', event.target.value)} placeholder="https://..." /></Field>
            <Field label="Hours / Location Link"><input type="url" className="input-field" value={form.links.hoursLink} onChange={(event) => updateLink('hoursLink', event.target.value)} placeholder="https://..." /></Field>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Help Reply Text">
            <textarea rows="3" className="input-field" value={form.replyHelpMessage} onChange={(event) => updateField('replyHelpMessage', event.target.value)} placeholder="Thanks for messaging..." />
          </Field>
          <Field label="STOP Reply Text">
            <textarea rows="3" className="input-field" value={form.replyStopMessage} onChange={(event) => updateField('replyStopMessage', event.target.value)} placeholder="You have been unsubscribed..." />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Generic Post-Call Template Override" hint="Optional. Leave blank to use the default template for this tenant type.">
            <textarea rows="4" className="input-field" value={form.inlineTemplates.post_call_generic} onChange={(event) => updateTemplate('post_call_generic', event.target.value, 'inlineTemplates')} placeholder="Thanks for calling {{businessName}}. Here is more information: {{primaryLink}}" />
          </Field>
          <Field label="Inbound Auto-Reply Override" hint="Optional. Leave blank to use the default inbound auto-reply.">
            <textarea rows="4" className="input-field" value={form.inlineTemplates.inbound_default} onChange={(event) => updateTemplate('inbound_default', event.target.value, 'inlineTemplates')} placeholder="Thanks for messaging {{businessName}}. We received your message and will follow up shortly." />
          </Field>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Notification Template Overrides</h4>
          <div className="grid gap-4 md:grid-cols-2">
            {NOTIFICATION_TEMPLATE_FIELDS.map((field) => (
              <Field key={field.key} label={field.label} hint="Optional override. Leave blank to use the built-in event template.">
                <textarea
                  rows="4"
                  className="input-field"
                  value={form.notificationTemplates[field.key]}
                  onChange={(event) => updateTemplate(field.key, event.target.value, 'notificationTemplates')}
                  placeholder="{{tenantName}} ..."
                />
              </Field>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
          <h4 className="text-sm font-semibold text-primary-800 mb-2">Policy Preview</h4>
          <p className="text-sm text-primary-700">{policyPreview}</p>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Test SMS</h4>
              <p className="text-xs text-gray-500">Send yourself a quick verification message after updating settings.</p>
            </div>
            <Link to={copy.inboxRoute} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Go to Inbox
            </Link>
          </div>
          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <input type="tel" className="input-field" value={testNumber} onChange={(event) => setTestNumber(event.target.value)} placeholder="+15551234567" />
            <button type="button" onClick={handleTestSend} className="btn-primary whitespace-nowrap" disabled={sendingTest}>
              {sendingTest ? 'Sending…' : 'Send Test SMS'}
            </button>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save SMS Notification Settings'}
        </button>
      </form>
    </section>
  );
}
