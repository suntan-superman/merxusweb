import { useEffect, useMemo, useRef, useState } from 'react';
import SelectField from '../common/SelectField';

const WIZARD_STEPS = [
  { id: 'businessType', label: 'Business Type' },
  { id: 'businessInfo', label: 'Business Info' },
  { id: 'serviceLinks', label: 'Service Links' },
  { id: 'notifications', label: 'Notification Preferences' },
  { id: 'staffContacts', label: 'Staff Contacts' },
  { id: 'channels', label: 'Communication Channels' },
  { id: 'aiBehavior', label: 'AI Behavior' },
  { id: 'review', label: 'Review & Activate' },
];

const ROLE_OPTIONS = ['Manager', 'Support', 'Sales', 'Operations'];
const STAFF_CHANNEL_OPTIONS = ['sms', 'email', 'push', 'slack', 'teams', 'webhook'];
const NOTIFICATION_AUDIENCES = ['managers', 'sales', 'support', 'everyone'];
const WIZARD_DRAFT_STORAGE_PREFIX = 'merxus_sms_setup_wizard_v1';
const WIZARD_DRAFT_MAX_AGE_MS = 2 * 60 * 60 * 1000;

const BUSINESS_TYPE_OPTIONS = [
  {
    id: 'voice',
    label: 'Office / Service',
    description: 'Appointments, quotes, support, and service requests.',
  },
  {
    id: 'real_estate',
    label: 'Real Estate',
    description: 'Listing, showing, buyer, and seller lead workflows.',
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    description: 'Reservation, order, and menu messaging defaults.',
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Start from a neutral messaging template.',
  },
];

function normalizeBusinessType(value) {
  if (value === 'office') return 'voice';
  if (value === 'agent') return 'real_estate';
  return value || 'voice';
}

function createDraftContact(index = 0, base = {}) {
  return {
    id: base.id || `wizard_contact_${Date.now()}_${index}`,
    name: base.name || '',
    role: base.role || '',
    phone: base.phone || '',
    email: base.email || '',
    webhookUrl: base.webhookUrl || '',
    userId: base.userId || '',
    channels: Array.isArray(base.channels) && base.channels.length ? [...base.channels] : ['sms'],
    isActive: base.isActive !== false,
  };
}

function unique(values = []) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function buildDefaultAudienceChannels(fallbackChannels = ['sms', 'email']) {
  const normalizedFallback = unique(fallbackChannels);
  return {
    managers: [],
    sales: [],
    support: [],
    everyone: normalizedFallback,
  };
}

function normalizeAudienceChannelsMap(value, fallbackChannels = ['sms', 'email']) {
  const defaults = buildDefaultAudienceChannels(fallbackChannels);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaults;
  }

  return NOTIFICATION_AUDIENCES.reduce((acc, audience) => {
    acc[audience] = Array.isArray(value[audience]) ? unique(value[audience]) : defaults[audience];
    return acc;
  }, {});
}

function isValidEmail(value) {
  const email = String(value || '').trim();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPhoneValidationMessage(value) {
  const phone = String(value || '').trim();
  if (!phone) return 'Phone number is required.';

  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    return 'Enter a valid phone number.';
  }

  if (phone.startsWith('+')) {
    if (digits.startsWith('1')) {
      return digits.length === 11 ? '' : 'Enter a valid US number in +1XXXXXXXXXX format.';
    }
    return digits.length >= 8 && digits.length <= 15
      ? ''
      : 'Enter a valid international number with country code.';
  }

  if (digits.length === 10) {
    return '';
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return '';
  }

  return 'Enter a valid 10-digit phone number or +1XXXXXXXXXX.';
}

function isValidPhoneNumber(value) {
  return getPhoneValidationMessage(value) === '';
}

function validateStaffContacts(contacts = []) {
  return contacts.reduce((errors, contact, index) => {
    const contactErrors = {};
    const name = String(contact?.name || '').trim();
    const role = String(contact?.role || '').trim();
    const phone = String(contact?.phone || '').trim();
    const email = String(contact?.email || '').trim();
    const channels = Array.isArray(contact?.channels) ? contact.channels.filter(Boolean) : [];

    if (name.length < 3) {
      contactErrors.name = 'Name must be at least 3 characters.';
    }

    if (!role) {
      contactErrors.role = 'Select a role.';
    }

    const phoneError = getPhoneValidationMessage(phone);
    if (phoneError) {
      contactErrors.phone = phoneError;
    }

    if (!isValidEmail(email)) {
      contactErrors.email = 'Enter a valid email address.';
    }

    if (!channels.length) {
      contactErrors.channels = 'Select at least one notification method.';
    }

    if (Object.keys(contactErrors).length) {
      errors[contact?.id || `contact_${index}`] = contactErrors;
    }

    return errors;
  }, {});
}

function inferPrimaryPhone(settings = {}, routing = {}) {
  return (
    settings.phoneNumber ||
    settings.phonePrimary ||
    settings.phone ||
    settings.contactPhone ||
    settings.twilioPhoneNumber ||
    routing.contacts?.[0]?.phone ||
    ''
  );
}

function inferPrimaryEmail(settings = {}, routing = {}) {
  return settings.email || settings.contactEmail || routing.contacts?.[0]?.email || '';
}

function inferAlertAudience(form = {}, routing = {}, tenantType = 'voice') {
  const groupKeys = form.dailyDigestRecipientGroupKeys?.length
    ? form.dailyDigestRecipientGroupKeys
    : form.alertEscalationRecipientGroupKeys || [];
  const normalizedType = normalizeBusinessType(tenantType);

  if (!groupKeys.length) return normalizedType === 'real_estate' ? 'managers' : 'everyone';
  if (groupKeys.length === routing.definitions.length && routing.definitions.length > 1) return 'everyone';
  if (groupKeys.includes(normalizedType === 'real_estate' ? 'broker_contacts' : 'manager_contacts')) return 'managers';
  if (groupKeys.includes('sales_contacts') || groupKeys.includes('buyer_agent_contacts') || groupKeys.includes('seller_agent_contacts')) return 'sales';
  return 'support';
}

function inferRoleFromTeamUser(teamUser = {}, tenantType = 'voice') {
  const normalizedType = normalizeBusinessType(tenantType);
  const role = String(teamUser?.role || '').trim().toLowerCase();
  const groupKeys = Array.isArray(teamUser?.notificationGroupKeys)
    ? teamUser.notificationGroupKeys.map((value) => String(value || '').trim().toLowerCase())
    : [];

  if (role === 'manager') return 'Manager';

  if (normalizedType === 'restaurant') {
    if (groupKeys.includes('sales_contacts')) return 'Sales';
    if (groupKeys.includes('reservation_contacts') || groupKeys.includes('order_contacts')) return 'Operations';
    return 'Manager';
  }

  if (normalizedType === 'real_estate') {
    if (groupKeys.includes('buyer_agent_contacts') || groupKeys.includes('seller_agent_contacts')) return 'Sales';
    if (groupKeys.includes('showing_contacts') || groupKeys.includes('property_contacts')) return 'Operations';
    return 'Manager';
  }

  if (groupKeys.includes('sales_contacts')) return 'Sales';
  if (groupKeys.includes('appointment_contacts')) return 'Operations';
  if (groupKeys.includes('support_contacts')) return 'Support';
  if (groupKeys.includes('manager_contacts')) return 'Manager';
  return 'Support';
}

function buildDraftContactsFromTeamUsers(teamUsers = [], tenantType = 'voice') {
  const normalizedContacts = (Array.isArray(teamUsers) ? teamUsers : [])
    .filter((teamUser) => teamUser?.disabled !== true)
    .filter((teamUser) => String(teamUser?.role || '').trim().toLowerCase() !== 'owner')
    .filter((teamUser) => String(teamUser?.email || '').trim() || String(teamUser?.phone || '').trim())
    .map((teamUser, index) => createDraftContact(index, {
      id: teamUser.uid ? `team_user_${teamUser.uid}` : `wizard_team_user_${index}`,
      name: teamUser.displayName || '',
      role: inferRoleFromTeamUser(teamUser, tenantType),
      phone: teamUser.phone || '',
      email: teamUser.email || '',
      userId: teamUser.uid || '',
      channels: unique([
        teamUser.phone ? 'sms' : '',
        teamUser.email ? 'email' : '',
        'push',
      ]),
      isActive: teamUser.disabled !== true,
    }));

  return normalizedContacts;
}

function isBlankDraftContact(contact = {}) {
  return !String(contact?.name || '').trim()
    && !String(contact?.role || '').trim()
    && !String(contact?.phone || '').trim()
    && !String(contact?.email || '').trim()
    && !String(contact?.userId || '').trim()
    && !String(contact?.webhookUrl || '').trim();
}

function isPlaceholderOnlyStaffContacts(contacts = []) {
  return Array.isArray(contacts)
    && contacts.length === 1
    && isBlankDraftContact(contacts[0]);
}

function buildWizardDraft({ form, routing, settings, tenantType, teamUsers = [] }) {
  const safeSettings = settings || {};
  const safeRouting = routing || { contacts: [], definitions: [] };
  const businessType = normalizeBusinessType(form.setupWizard?.businessType || tenantType);
  const baseStaffChannels = unique(form.staffChannels?.length ? form.staffChannels : ['sms', 'email']);
  const channelsByAudience = normalizeAudienceChannelsMap(
    form.staffChannelsByAudience || form.setupWizard?.notificationPreferences?.channelsByAudience,
    baseStaffChannels
  );
  const fallbackStaffContacts = buildDraftContactsFromTeamUsers(teamUsers, tenantType);
  return {
    businessType,
    businessInfo: {
      businessName: form.businessName || '',
      displayName: form.displayName || 'Merxus AI',
      primaryPhone: form.setupWizard?.primaryPhone || inferPrimaryPhone(safeSettings, safeRouting),
      primaryEmail: form.setupWizard?.primaryEmail || inferPrimaryEmail(safeSettings, safeRouting),
      website: form.links?.primaryLink || safeSettings.website || safeSettings.websiteUrl || '',
    },
    serviceLinks: {
      primaryLink: form.links?.primaryLink || safeSettings.website || safeSettings.websiteUrl || '',
      reservationLink: form.links?.reservationLink || '',
      orderLink: form.links?.orderLink || '',
      appointmentLink: form.links?.appointmentLink || '',
      menuLink: form.links?.menuLink || '',
      serviceLink: form.links?.serviceLink || '',
      listingLink: form.links?.listingLink || '',
      showingLink: form.links?.showingLink || '',
      quoteLink: form.links?.quoteLink || '',
    },
    notificationPreferences: {
      alertAudience: inferAlertAudience(form, safeRouting, tenantType),
      channelsByAudience,
    },
    staffContacts: safeRouting.contacts?.length
      ? safeRouting.contacts.map((contact, index) => createDraftContact(index, contact))
      : fallbackStaffContacts.length
        ? fallbackStaffContacts
        : [createDraftContact(0)],
    communicationChannels: {
      smsEnabled: form.enabled !== false,
      callerConfirmationEnabled: form.callerConfirmationEnabled !== false,
      callerSmsEnabled: (form.callerChannels || []).includes('sms'),
      staffAlertsEnabled: form.staffAlertsEnabled !== false,
      staffChannels: baseStaffChannels,
    },
    aiBehavior: {
      minimumCallDurationSeconds: Number(form.minimumCallDurationSeconds || 15),
      requireMeaningfulInteraction: form.requireMeaningfulInteraction !== false,
      requireCapturedContact: form.requireCapturedContact !== false,
      suppressSpam: form.suppressSpam !== false,
    },
  };
}

function getServiceLinkFields(businessType) {
  if (businessType === 'restaurant') {
    return [
      { key: 'primaryLink', label: 'Website' },
      {
        key: 'reservationLink',
        label: 'Reservation link',
        helperText: 'Used when Merxus texts someone back about booking or changing a reservation. Point this to the page where guests can reserve a table. If left blank, Merxus falls back to the website link.',
      },
      {
        key: 'orderLink',
        label: 'Order link',
        helperText: 'Used in SMS follow-ups for takeout or online ordering. Point this to the page where customers can place or review an order. If left blank, Merxus falls back to the website link.',
      },
      {
        key: 'menuLink',
        label: 'Menu link',
        helperText: 'Used when callers ask to see the menu or learn more before ordering. Point this to your online menu. If left blank, Merxus falls back to the website link.',
      },
    ];
  }
  if (businessType === 'real_estate') {
    return [
      { key: 'primaryLink', label: 'Website' },
      {
        key: 'listingLink',
        label: 'Listing link',
        helperText: 'Used when Merxus sends someone to browse available properties or review listing details after a call or text. If left blank, Merxus falls back to the website link.',
      },
      {
        key: 'showingLink',
        label: 'Showing request link',
        helperText: 'Used when a prospect wants to schedule a tour or request a showing. Point this to the page or form that starts that process. If left blank, Merxus falls back to the listing link first, then the website link.',
      },
    ];
  }
  if (businessType === 'voice') {
    return [
      { key: 'primaryLink', label: 'Website' },
      {
        key: 'appointmentLink',
        label: 'Appointment link',
        helperText: 'Used when Merxus texts someone who wants to schedule. Point this to your booking calendar or appointment request page. If left blank, Merxus falls back to the service request link first, then the website link.',
      },
      {
        key: 'serviceLink',
        label: 'Service request link',
        helperText: 'Used for general service, support, or work-request follow-ups. This is usually the best link to send when someone needs help from your team. If left blank, Merxus falls back to the quote request link first, then the website link.',
      },
      {
        key: 'quoteLink',
        label: 'Quote request link',
        helperText: 'Used when someone asks for pricing or an estimate. Point this to the page or form where they can request a quote. If left blank, Merxus falls back to the service request link first, then the website link.',
      },
    ];
  }
  return [
    { key: 'primaryLink', label: 'Website' },
    {
      key: 'appointmentLink',
      label: 'Appointment link',
      helperText: 'Use this if your business needs people to book time with you directly. If left blank, Merxus falls back to the service request link first, then the website link.',
    },
    {
      key: 'serviceLink',
      label: 'Service request link',
      helperText: 'Use this for the main action customers should take after a call, such as requesting help, starting service, or submitting a form. If left blank, Merxus falls back to the quote link first, then the website link.',
    },
    {
      key: 'quoteLink',
      label: 'Quote link',
      helperText: 'Use this when customers need pricing, estimates, or proposal information. If left blank, Merxus falls back to the service request link first, then the website link.',
    },
  ];
}

function roleToGroups(tenantType, role) {
  const normalizedRole = String(role || '').trim().toLowerCase();
  const normalizedType = normalizeBusinessType(tenantType);

  if (normalizedType === 'restaurant') {
    if (normalizedRole === 'manager') return ['manager_contacts'];
    if (normalizedRole === 'sales') return ['sales_contacts'];
    if (normalizedRole === 'operations') return ['reservation_contacts', 'order_contacts'];
    if (normalizedRole === 'support') return ['manager_contacts'];
    return ['manager_contacts'];
  }

  if (normalizedType === 'real_estate') {
    if (normalizedRole === 'manager') return ['broker_contacts'];
    if (normalizedRole === 'sales') return ['buyer_agent_contacts', 'seller_agent_contacts'];
    if (normalizedRole === 'operations') return ['showing_contacts', 'property_contacts'];
    if (normalizedRole === 'support') return ['property_contacts'];
    return ['broker_contacts'];
  }

  if (normalizedRole === 'manager') return ['manager_contacts'];
  if (normalizedRole === 'sales') return ['sales_contacts'];
  if (normalizedRole === 'operations') return ['appointment_contacts'];
  if (normalizedRole === 'support') return ['support_contacts'];
  return ['manager_contacts'];
}

function resolveAudienceGroups(tenantType, alertAudience, definitions = []) {
  const normalizedType = normalizeBusinessType(tenantType);
  const allKeys = definitions.map((definition) => definition.key);
  if (alertAudience === 'everyone') return allKeys;

  if (normalizedType === 'restaurant') {
    if (alertAudience === 'managers') return ['manager_contacts'].filter((key) => allKeys.includes(key));
    if (alertAudience === 'sales') return ['sales_contacts'].filter((key) => allKeys.includes(key));
    return ['reservation_contacts', 'order_contacts'].filter((key) => allKeys.includes(key));
  }

  if (normalizedType === 'real_estate') {
    if (alertAudience === 'managers') return ['broker_contacts'].filter((key) => allKeys.includes(key));
    if (alertAudience === 'sales') return ['buyer_agent_contacts', 'seller_agent_contacts'].filter((key) => allKeys.includes(key));
    return ['property_contacts', 'showing_contacts'].filter((key) => allKeys.includes(key));
  }

  if (alertAudience === 'managers') return ['manager_contacts'].filter((key) => allKeys.includes(key));
  if (alertAudience === 'sales') return ['sales_contacts'].filter((key) => allKeys.includes(key));
  return ['support_contacts', 'appointment_contacts'].filter((key) => allKeys.includes(key));
}

function buildTemplates(businessType, businessName, links = {}) {
  const primaryLink = links.primaryLink || '';
  const reservationLink = links.reservationLink || primaryLink;
  const orderLink = links.orderLink || primaryLink;
  const appointmentLink = links.appointmentLink || links.serviceLink || primaryLink;
  const serviceLink = links.serviceLink || links.quoteLink || primaryLink;
  const listingLink = links.listingLink || primaryLink;
  const showingLink = links.showingLink || listingLink || primaryLink;
  const replyWithLink = (prefix, link) => (link ? `${prefix} ${link}` : prefix);

  if (businessType === 'restaurant') {
    return {
      inlineTemplates: {
        post_call_generic: replyWithLink(`Thanks for contacting ${businessName}. View details here:`, primaryLink),
        inbound_default: `Thanks for messaging ${businessName}. We received your message and will follow up shortly.`,
      },
      notificationTemplates: {
        'caller.reservation_confirmed': replyWithLink(`Thanks for contacting ${businessName}. Book or update your reservation here:`, reservationLink),
        'caller.order_confirmed': replyWithLink(`Thanks for contacting ${businessName}. Place or review your order here:`, orderLink),
        'caller.support_request': `Thanks for contacting ${businessName}. We received your question and a team member will follow up shortly.`,
        'staff.reservation_confirmed': `New reservation request for ${businessName}.`,
        'staff.order_confirmed': `New order request for ${businessName}.`,
        'staff.support_request': `New guest message for ${businessName}.`,
      },
    };
  }

  if (businessType === 'real_estate') {
    return {
      inlineTemplates: {
        post_call_generic: replyWithLink(`Thanks for contacting ${businessName}. Browse listings here:`, listingLink),
        inbound_default: `Thanks for messaging ${businessName}. We received your inquiry and will follow up shortly.`,
      },
      notificationTemplates: {
        'caller.listing_inquiry': replyWithLink(`Thanks for contacting ${businessName}. View listing details here:`, listingLink),
        'caller.support_request': replyWithLink(`Thanks for contacting ${businessName}. Schedule or request a showing here:`, showingLink),
        'staff.listing_inquiry': `New listing inquiry for ${businessName}.`,
        'staff.support_request': `New showing or property request for ${businessName}.`,
      },
    };
  }

  if (businessType === 'voice') {
    return {
      inlineTemplates: {
        post_call_generic: replyWithLink(`Thanks for contacting ${businessName}. Request service here:`, serviceLink),
        inbound_default: `Thanks for messaging ${businessName}. We received your request and will follow up shortly.`,
      },
      notificationTemplates: {
        'caller.support_request': replyWithLink(`Thanks for contacting ${businessName}. Request service or support here:`, serviceLink),
        'staff.support_request': `New service or support request for ${businessName}.`,
      },
    };
  }

  return {
    inlineTemplates: {
      post_call_generic: replyWithLink(`Thanks for contacting ${businessName}. Learn more here:`, primaryLink),
      inbound_default: `Thanks for messaging ${businessName}. We received your request and will follow up shortly.`,
    },
    notificationTemplates: {
      'caller.support_request': replyWithLink(`Thanks for contacting ${businessName}. Continue here:`, primaryLink),
      'staff.support_request': `New request for ${businessName}.`,
    },
  };
}

function buildRoutingDraft(tenantType, definitions, contacts) {
  const groups = definitions.reduce((acc, definition) => {
    acc[definition.key] = [];
    return acc;
  }, {});

  contacts.forEach((contact, index) => {
    const nextContact = createDraftContact(index, contact);
    roleToGroups(tenantType, nextContact.role).forEach((groupKey) => {
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(nextContact.id);
    });
  });

  return {
    contacts: contacts.map((contact, index) => createDraftContact(index, contact)),
    groups,
  };
}

function buildActivatedSettings({ draft, form, routing, tenantType }) {
  const businessName = draft.businessInfo.businessName.trim() || form.businessName || 'Your business';
  const mergedLinks = {
    ...form.links,
    ...draft.serviceLinks,
    primaryLink: draft.serviceLinks.primaryLink || draft.businessInfo.website || form.links.primaryLink || '',
  };
  const generatedTemplates = buildTemplates(draft.businessType, businessName, mergedLinks);
  const audienceGroups = resolveAudienceGroups(
    tenantType,
    draft.notificationPreferences.alertAudience,
    routing.definitions
  );
  const nextRouting = {
    ...routing,
    ...buildRoutingDraft(tenantType, routing.definitions, draft.staffContacts),
  };

  const selectedStaffChannels = unique(draft.communicationChannels.staffChannels || []);
  const channelsByAudience = normalizeAudienceChannelsMap(
    draft.notificationPreferences.channelsByAudience,
    selectedStaffChannels.length ? selectedStaffChannels : ['sms', 'email']
  );
  const anyAudienceUsesSlack = NOTIFICATION_AUDIENCES.some((audience) =>
    channelsByAudience[audience]?.includes('slack')
  );
  const slackEnabled =
    (selectedStaffChannels.includes('slack') || anyAudienceUsesSlack) &&
    Boolean(form.slack?.installationId || form.slack?.connected || form.slack?.webhookUrl);

  return {
    nextForm: {
      ...form,
      enabled: draft.communicationChannels.smsEnabled,
      aiEnabled: form.aiEnabled,
      businessName,
      displayName: draft.businessInfo.displayName.trim() || form.displayName || 'Merxus AI',
      callerConfirmationEnabled:
        draft.communicationChannels.callerSmsEnabled && draft.communicationChannels.callerConfirmationEnabled,
      staffAlertsEnabled: draft.communicationChannels.staffAlertsEnabled,
      callerChannels: draft.communicationChannels.callerSmsEnabled ? ['sms'] : [],
      staffChannels: selectedStaffChannels,
      staffChannelsByAudience: channelsByAudience,
      minimumCallDurationSeconds: Number(draft.aiBehavior.minimumCallDurationSeconds || 15),
      requireMeaningfulInteraction: draft.aiBehavior.requireMeaningfulInteraction,
      requireCapturedContact: draft.aiBehavior.requireCapturedContact,
      suppressSpam: draft.aiBehavior.suppressSpam,
      links: mergedLinks,
      inlineTemplates: {
        ...form.inlineTemplates,
        ...generatedTemplates.inlineTemplates,
      },
      notificationTemplates: {
        ...form.notificationTemplates,
        ...generatedTemplates.notificationTemplates,
      },
      replyHelpMessage: `Thanks for messaging ${businessName}. Reply STOP to opt out.`,
      slack: {
        ...form.slack,
        enabled: slackEnabled,
      },
      dailyDigestRecipientGroupKeys: audienceGroups,
      alertEscalationRecipientGroupKeys: audienceGroups,
      setupWizard: {
        ...(form.setupWizard || {}),
        version: 'smart_setup_v1',
        completedAt: new Date().toISOString(),
        businessType: draft.businessType,
        primaryPhone: draft.businessInfo.primaryPhone.trim(),
        primaryEmail: draft.businessInfo.primaryEmail.trim(),
        notificationPreferences: {
          alertAudience: draft.notificationPreferences.alertAudience,
          channelsByAudience,
        },
      },
    },
    nextRouting,
  };
}

function StepChip({ active, complete, index, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm ${
        active
          ? 'bg-emerald-50 text-emerald-700'
          : complete
            ? 'bg-slate-100 text-slate-700'
            : 'text-slate-500 hover:bg-slate-50'
      }`}
    >
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${active ? 'bg-emerald-600 text-white' : complete ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
        {index + 1}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

function buildTeamSyncNotice(syncResult = {}) {
  const skippedContacts = Array.isArray(syncResult.skippedContacts) ? syncResult.skippedContacts : [];
  const deliveryIssueCount = Number(syncResult.deliveryIssueCount || 0);
  const invitedCount = Number(syncResult.invitedCount || 0);
  const updatedCount = Number(syncResult.updatedCount || 0);
  const parts = [];

  if (invitedCount > 0 || updatedCount > 0) {
    parts.push('Messaging settings were saved and activation completed.');
  } else {
    parts.push('Messaging settings were saved.');
  }

  if (skippedContacts.length) {
    parts.push(
      `Team & Access skipped ${skippedContacts.length === 1 ? '1 contact' : `${skippedContacts.length} contacts`}: ${skippedContacts
        .map((item) => item.message)
        .join('; ')}.`
    );
  }

  if (deliveryIssueCount > 0) {
    parts.push(
      `${deliveryIssueCount === 1 ? '1 invite email needs follow-up' : `${deliveryIssueCount} invite emails need follow-up`} in Team & Access.`
    );
  }

  parts.push('You can close the wizard and resolve any skipped team invites later.');
  return parts.join(' ');
}

function getWizardDraftStorageKey(tenantType) {
  const path = typeof window !== 'undefined' ? window.location.pathname : 'server';
  return `${WIZARD_DRAFT_STORAGE_PREFIX}:${tenantType || 'voice'}:${path}`;
}

function readPersistedWizardDraft(storageKey) {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const savedAt = Number(parsed?.savedAt || 0);
    if (!savedAt || (Date.now() - savedAt) > WIZARD_DRAFT_MAX_AGE_MS) {
      window.sessionStorage.removeItem(storageKey);
      return null;
    }

    if (!parsed?.draft || typeof parsed.draft !== 'object') {
      window.sessionStorage.removeItem(storageKey);
      return null;
    }

    return {
      isOpen: parsed.isOpen === true,
      stepIndex: Number.isInteger(parsed.stepIndex) ? parsed.stepIndex : 0,
      draft: parsed.draft,
    };
  } catch (_) {
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {}
    return null;
  }
}

function InputField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  helperText = '',
  errorText = '',
  name = '',
  autoComplete = 'off',
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        name={name}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`input-field ${errorText ? '!border-red-300 !ring-2 !ring-red-100 focus:!ring-red-200' : ''}`}
      />
      {helperText ? <span className="mt-2 block text-sm leading-6 text-slate-500">{helperText}</span> : null}
      {errorText ? <span className="mt-2 block text-sm leading-6 text-red-600">{errorText}</span> : null}
    </label>
  );
}

export default function SmsSetupWizard({
  copy,
  form,
  routing,
  teamUsers,
  settings,
  tenantType,
  setActiveTab,
  saveCurrentSettings,
  syncWizardTeamUsers,
  saving,
  loading = false,
  slackDiscovery,
  handleConnectSlack,
}) {
  const wizardDraftStorageKey = useMemo(() => getWizardDraftStorageKey(tenantType), [tenantType]);
  const persistedWizardDraft = useMemo(() => readPersistedWizardDraft(wizardDraftStorageKey), [wizardDraftStorageKey]);
  const [isOpen, setIsOpen] = useState(() => persistedWizardDraft?.isOpen === true);
  const [stepIndex, setStepIndex] = useState(() => {
    const nextIndex = Number(persistedWizardDraft?.stepIndex || 0);
    return Math.min(Math.max(nextIndex, 0), WIZARD_STEPS.length - 1);
  });
  const [draft, setDraft] = useState(() => persistedWizardDraft?.draft || buildWizardDraft({ form, routing, settings, tenantType, teamUsers }));
  const [wizardError, setWizardError] = useState('');
  const [wizardNotice, setWizardNotice] = useState('');
  const [staffContactErrors, setStaffContactErrors] = useState({});
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  const wizardCompleted = Boolean(form.setupWizard?.completedAt);
  const businessTypeLocked = wizardCompleted && Boolean(form.setupWizard?.businessType || tenantType);
  const activeStep = WIZARD_STEPS[stepIndex];
  const progress = ((stepIndex + 1) / WIZARD_STEPS.length) * 100;
  const serviceLinkFields = useMemo(() => getServiceLinkFields(draft.businessType), [draft.businessType]);
  const slackConnected = Boolean(form.slack?.installationId || form.slack?.connected);
  const selectedAudienceChannels = draft.notificationPreferences.channelsByAudience?.[draft.notificationPreferences.alertAudience] || [];

  function persistWizardDraft(nextState = {}) {
    if (typeof window === 'undefined') return;

    try {
      const payload = {
        isOpen: nextState.isOpen ?? isOpen,
        stepIndex: nextState.stepIndex ?? stepIndex,
        draft: nextState.draft ?? draft,
        savedAt: Date.now(),
      };
      window.sessionStorage.setItem(wizardDraftStorageKey, JSON.stringify(payload));
    } catch (_) {}
  }

  function clearPersistedWizardDraft() {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(wizardDraftStorageKey);
    } catch (_) {}
  }

  useEffect(() => {
    if (!isOpen) {
      setDraft(buildWizardDraft({ form, routing, settings, tenantType, teamUsers }));
      setWizardError('');
      setWizardNotice('');
      setStaffContactErrors({});
    }
  }, [form, routing, settings, tenantType, teamUsers, isOpen]);

  useEffect(() => {
    if (isOpen) {
      persistWizardDraft({ isOpen, stepIndex, draft });
      return;
    }
    clearPersistedWizardDraft();
  }, [draft, isOpen, stepIndex, wizardDraftStorageKey]);

  useEffect(() => {
    if (!isOpen) return;
    if (!isPlaceholderOnlyStaffContacts(draft.staffContacts)) return;

    const hydratedDraft = buildWizardDraft({ form, routing, settings, tenantType, teamUsers });
    if (!hydratedDraft.staffContacts.length || isPlaceholderOnlyStaffContacts(hydratedDraft.staffContacts)) {
      return;
    }

    setDraft((current) => ({
      ...current,
      staffContacts: hydratedDraft.staffContacts,
    }));
    setStaffContactErrors({});
    setWizardError('');
  }, [draft.staffContacts, form, isOpen, routing, settings, teamUsers, tenantType]);

  useEffect(() => {
    if (!loading && !wizardCompleted && !hasAutoOpened) {
      setIsOpen(true);
      setHasAutoOpened(true);
    }
  }, [wizardCompleted, hasAutoOpened, loading]);

  function openWizard() {
    setDraft(buildWizardDraft({ form, routing, settings, tenantType, teamUsers }));
    setStepIndex(0);
    setWizardError('');
    setWizardNotice('');
    setStaffContactErrors({});
    setIsOpen(true);
  }

  function updateBusinessType(value) {
    if (businessTypeLocked) return;
    setDraft((current) => ({ ...current, businessType: value }));
  }

  function updateDraftSection(section, key, value) {
    setDraft((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value,
      },
    }));
  }

  function toggleAudienceChannel(audience, channel) {
    setDraft((current) => {
      const nextValues = new Set(current.notificationPreferences.channelsByAudience?.[audience] || []);
      if (nextValues.has(channel)) nextValues.delete(channel);
      else nextValues.add(channel);
      return {
        ...current,
        notificationPreferences: {
          ...current.notificationPreferences,
          channelsByAudience: {
            ...current.notificationPreferences.channelsByAudience,
            [audience]: Array.from(nextValues),
          },
        },
      };
    });
  }

  function toggleDraftChannel(section, field, value) {
    setDraft((current) => {
      const nextValues = new Set(current[section][field] || []);
      if (nextValues.has(value)) nextValues.delete(value);
      else nextValues.add(value);
      return {
        ...current,
        [section]: {
          ...current[section],
          [field]: Array.from(nextValues),
        },
      };
    });
  }

  function updateContact(index, key, value) {
    setDraft((current) => ({
      ...current,
      staffContacts: current.staffContacts.map((contact, contactIndex) => (
        contactIndex === index ? { ...contact, [key]: value } : contact
      )),
    }));
    setStaffContactErrors((current) => {
      const contactId = draft.staffContacts[index]?.id;
      if (!contactId || !current[contactId]?.[key]) return current;
      return {
        ...current,
        [contactId]: {
          ...current[contactId],
          [key]: undefined,
        },
      };
    });
  }

  function toggleContactChannel(index, channel) {
    setDraft((current) => ({
      ...current,
      staffContacts: current.staffContacts.map((contact, contactIndex) => {
        if (contactIndex !== index) return contact;
        const channels = new Set(contact.channels || []);
        if (channels.has(channel)) channels.delete(channel);
        else channels.add(channel);
        return { ...contact, channels: Array.from(channels) };
      }),
    }));
    setStaffContactErrors((current) => {
      const contactId = draft.staffContacts[index]?.id;
      if (!contactId || !current[contactId]?.channels) return current;
      return {
        ...current,
        [contactId]: {
          ...current[contactId],
          channels: undefined,
        },
      };
    });
  }

  function addContact() {
    setDraft((current) => ({
      ...current,
      staffContacts: [...current.staffContacts, createDraftContact(current.staffContacts.length)],
    }));
  }

  function removeContact(index) {
    const removedContactId = draft.staffContacts[index]?.id;
    setDraft((current) => ({
      ...current,
      staffContacts: current.staffContacts.filter((_, contactIndex) => contactIndex !== index),
    }));
    if (removedContactId) {
      setStaffContactErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors[removedContactId];
        return nextErrors;
      });
    }
  }

  function validateStaffContactsStep() {
    const nextErrors = validateStaffContacts(draft.staffContacts);
    setStaffContactErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setWizardError('Fix the highlighted staff contact fields before continuing.');
      setStepIndex(WIZARD_STEPS.findIndex((step) => step.id === 'staffContacts'));
      return false;
    }

    setWizardError('');
    return true;
  }

  function handleContinue() {
    if (activeStep.id === 'staffContacts' && !validateStaffContactsStep()) {
      return;
    }

    setWizardError('');
    setWizardNotice('');
    setStepIndex((current) => Math.min(WIZARD_STEPS.length - 1, current + 1));
  }

  function handleCloseWizard() {
    clearPersistedWizardDraft();
    setActiveTab('overview');
    setIsOpen(false);
  }

  async function handleWizardSlackConnect() {
    persistWizardDraft({ isOpen: true, stepIndex, draft });
    await handleConnectSlack();
  }

  async function handleActivate() {
    if (!validateStaffContactsStep()) {
      return;
    }

    try {
      setWizardError('');
      setWizardNotice('');
      const shouldConnectSlackAfterActivation =
        draft.communicationChannels.staffChannels.includes('slack') && !slackConnected;
      const { nextForm, nextRouting } = buildActivatedSettings({ draft, form, routing, tenantType });
      const saved = await saveCurrentSettings(nextForm, nextRouting, {
        persistRouting: true,
        syncBaselineAfterSave: false,
        successMessage: '',
      });
      const syncResult = await syncWizardTeamUsers(saved.form, nextRouting);
      if ((syncResult?.skippedContacts || []).length || Number(syncResult?.deliveryIssueCount || 0) > 0) {
        setWizardNotice(buildTeamSyncNotice(syncResult));
        setStepIndex(WIZARD_STEPS.findIndex((step) => step.id === 'review'));
        return;
      }
      if (shouldConnectSlackAfterActivation) {
        await handleWizardSlackConnect();
        return;
      }
      handleCloseWizard();
    } catch (error) {
      if (error?.response?.data?.error || error?.message) {
        setWizardError(
          error?.message?.includes('Team & Access')
            ? error.message
            : 'Messaging settings were saved, but Team & Access could not be fully synced. Review the error banner and retry.'
        );
        return;
      }
      setWizardError('The wizard could not save your messaging setup. Review the fields and try again.');
    }
  }

  function renderStepContent() {
    if (activeStep.id === 'businessType') {
      return (
        <div className="space-y-4">
          {businessTypeLocked ? (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Business type was already set during the original setup and cannot be changed from a rerun of the messaging wizard.
            </div>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-2">
            {BUSINESS_TYPE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => updateBusinessType(option.id)}
                disabled={businessTypeLocked}
                className={`rounded-[28px] border p-5 text-left ${
                  draft.businessType === option.id
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                } ${businessTypeLocked ? 'cursor-not-allowed opacity-70' : ''}`}
              >
                <p className="text-lg font-semibold text-slate-900">{option.label}</p>
                <p className="mt-2 text-sm text-slate-600">{option.description}</p>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (activeStep.id === 'businessInfo') {
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <InputField label="Business name" value={draft.businessInfo.businessName} onChange={(event) => updateDraftSection('businessInfo', 'businessName', event.target.value)} placeholder="Kern Pest Control" />
          <InputField label="Display name" value={draft.businessInfo.displayName} onChange={(event) => updateDraftSection('businessInfo', 'displayName', event.target.value)} placeholder="Merxus AI" name="wizard-display-name" autoComplete="organization-title" />
          <InputField label="Primary phone" type="tel" value={draft.businessInfo.primaryPhone} onChange={(event) => updateDraftSection('businessInfo', 'primaryPhone', event.target.value)} placeholder="+16615551234" name="wizard-primary-phone" autoComplete="tel" />
          <InputField label="Primary email" type="email" value={draft.businessInfo.primaryEmail} onChange={(event) => updateDraftSection('businessInfo', 'primaryEmail', event.target.value)} placeholder="hello@example.com" name="wizard-primary-email" autoComplete="email" />
          <div className="lg:col-span-2">
            <InputField label="Website" type="url" value={draft.businessInfo.website} onChange={(event) => {
              updateDraftSection('businessInfo', 'website', event.target.value);
              updateDraftSection('serviceLinks', 'primaryLink', event.target.value);
            }} placeholder="https://example.com" name="wizard-website" autoComplete="url" />
          </div>
        </div>
      );
    }

    if (activeStep.id === 'serviceLinks') {
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          {serviceLinkFields.map((field) => (
            <InputField
              key={field.key}
              label={field.label}
              type="url"
              value={draft.serviceLinks[field.key] || ''}
              onChange={(event) => updateDraftSection('serviceLinks', field.key, event.target.value)}
              placeholder="https://..."
              helperText={field.helperText || ''}
            />
          ))}
        </div>
      );
    }

    if (activeStep.id === 'notifications') {
      return (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold text-slate-900">Delivery methods by staff classification</p>
            <p className="mt-1 text-sm text-slate-500">
              Select a classification, then choose how that group should receive alerts. The Everyone profile acts as the shared default.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { value: 'managers', label: 'Managers' },
              { value: 'sales', label: 'Sales' },
              { value: 'support', label: 'Support' },
              { value: 'everyone', label: 'Everyone' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateDraftSection('notificationPreferences', 'alertAudience', option.value)}
                className={`rounded-2xl border px-4 py-4 text-left text-sm font-semibold ${
                  draft.notificationPreferences.alertAudience === option.value
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {draft.notificationPreferences.alertAudience === 'everyone'
                ? 'Everyone Default'
                : `${draft.notificationPreferences.alertAudience} profile`}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {STAFF_CHANNEL_OPTIONS.map((channel) => (
              <label key={channel} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={selectedAudienceChannels.includes(channel)}
                  onChange={() => toggleAudienceChannel(draft.notificationPreferences.alertAudience, channel)}
                  className="checkbox-green h-4 w-4 rounded border-gray-300 focus:ring-primary-500"
                />
                {channel.toUpperCase()}
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (activeStep.id === 'staffContacts') {
      return (
        <div className="space-y-4">
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Staff Contacts control messaging and routing inside this wizard. They do not appear in Team & Access until you finish Step 8 and activate the system, which is when Merxus creates or updates the related team invites.
          </div>
          {draft.staffContacts.map((contact, index) => (
            <div key={contact.id} className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Contact {index + 1}</p>
                <button type="button" onClick={() => removeContact(index)} className="text-sm font-semibold text-rose-600 hover:text-rose-700" disabled={draft.staffContacts.length === 1}>Remove</button>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <InputField
                  label="Name"
                  value={contact.name}
                  onChange={(event) => updateContact(index, 'name', event.target.value)}
                  placeholder="Jane Doe"
                  errorText={staffContactErrors[contact.id]?.name || ''}
                  name={`staff-contact-${contact.id}-name`}
                  autoComplete={`section-staff-${contact.id} name`}
                />
                <SelectField
                  label="Role"
                  value={contact.role}
                  onChange={(nextValue) => updateContact(index, 'role', nextValue)}
                  options={ROLE_OPTIONS}
                  placeholder="Select role"
                  errorText={staffContactErrors[contact.id]?.role || ''}
                />
                <InputField
                  label="Phone"
                  type="tel"
                  value={contact.phone}
                  onChange={(event) => updateContact(index, 'phone', event.target.value)}
                  placeholder="+16615551234"
                  errorText={staffContactErrors[contact.id]?.phone || ''}
                  name={`staff-contact-${contact.id}-phone`}
                  autoComplete={`section-staff-${contact.id} tel`}
                />
                <InputField
                  label="Email"
                  type="email"
                  value={contact.email}
                  onChange={(event) => updateContact(index, 'email', event.target.value)}
                  placeholder="team@example.com"
                  errorText={staffContactErrors[contact.id]?.email || ''}
                  name={`staff-contact-${contact.id}-email`}
                  autoComplete={`section-staff-${contact.id} email`}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {STAFF_CHANNEL_OPTIONS.map((channel) => (
                  <label key={channel} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
                    <input type="checkbox" checked={(contact.channels || []).includes(channel)} onChange={() => toggleContactChannel(index, channel)} className="checkbox-green h-4 w-4 rounded border-gray-300 focus:ring-primary-500" />
                    {channel.toUpperCase()}
                  </label>
                ))}
              </div>
              {staffContactErrors[contact.id]?.channels ? (
                <p className="mt-3 text-sm text-red-600">{staffContactErrors[contact.id].channels}</p>
              ) : null}
            </div>
          ))}
          <button type="button" onClick={addContact} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300">Add contact</button>
        </div>
      );
    }

    if (activeStep.id === 'channels') {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {[
              ['smsEnabled', 'Enable SMS on your business line', 'Turns on SMS messaging for this tenant number. This is the master switch for texting from your Merxus line.'],
              ['staffAlertsEnabled', 'Enable staff alerts', 'Delivers alerts to the routing groups selected in this wizard.'],
              ['callerConfirmationEnabled', 'Enable caller confirmations', 'Sends concise automated follow-ups after qualifying calls.'],
              ['callerSmsEnabled', 'Send caller confirmations by SMS', 'Uses SMS as the delivery method for caller follow-up messages sent from your business line.'],
            ].map(([key, title, description]) => (
              <label key={key} className="rounded-[28px] border border-slate-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={Boolean(draft.communicationChannels[key])} onChange={(event) => updateDraftSection('communicationChannels', key, event.target.checked)} className="checkbox-green mt-1 h-4 w-4 rounded border-gray-300 focus:ring-primary-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{title}</p>
                    <p className="mt-1 text-sm text-slate-500">{description}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Staff alert delivery methods</p>
            <p className="mt-1 text-sm text-slate-500">
              Choose which delivery methods are globally allowed for staff alerts. Classification-specific settings from the previous step can narrow these further.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {STAFF_CHANNEL_OPTIONS.map((channel) => (
              <label key={channel} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
                <input type="checkbox" checked={draft.communicationChannels.staffChannels.includes(channel)} onChange={() => toggleDraftChannel('communicationChannels', 'staffChannels', channel)} className="checkbox-green h-4 w-4 rounded border-gray-300 focus:ring-primary-500" />
                {channel.toUpperCase()}
              </label>
            ))}
          </div>
          {draft.communicationChannels.staffChannels.includes('slack') ? (
            <div className="rounded-[28px] border border-emerald-200 bg-emerald-50/70 p-5">
              <p className="text-sm font-semibold text-slate-900">
                {slackConnected
                  ? `Slack is already connected${form.slack?.teamName ? ` to ${form.slack.teamName}` : ''}.`
                  : 'Slack is a connected workspace step.'}
              </p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <p>1. Activate messaging first.</p>
                <p>2. Connect your Slack workspace from the Integrations section.</p>
                <p>3. Invite each staff member to the Slack workspace and have them accept their Merxus invite.</p>
                <p>4. Merxus will discover channels and try to match your staff contacts by email.</p>
                <p>5. If someone is not already in Slack, invite them to Slack first, then run the email match again.</p>
              </div>
              {!slackConnected && wizardCompleted ? (
                <button
                  type="button"
                  onClick={handleWizardSlackConnect}
                  className="mt-4 rounded-full border border-emerald-300 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 hover:border-emerald-400"
                >
                  Connect Slack Workspace
                </button>
              ) : null}
              {!slackConnected && !wizardCompleted ? (
                <p className="mt-4 text-sm text-slate-600">
                  Finish the wizard first. If Slack is selected here, Merxus will take you into the Slack connection flow right after activation.
                </p>
              ) : null}
              {slackDiscovery?.workspace?.teamName ? (
                <p className="mt-4 text-sm text-slate-600">
                  Connected workspace: <span className="font-semibold text-slate-900">{slackDiscovery.workspace.teamName}</span>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      );
    }

    if (activeStep.id === 'aiBehavior') {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <InputField label="Minimum call duration (seconds)" type="number" value={String(draft.aiBehavior.minimumCallDurationSeconds)} onChange={(event) => updateDraftSection('aiBehavior', 'minimumCallDurationSeconds', Number(event.target.value || 0))} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {[
              ['requireMeaningfulInteraction', 'Require meaningful interaction', 'Suppress alerts for weak or inconclusive calls.'],
              ['requireCapturedContact', 'Require callback details', 'Only send caller confirmations when usable contact details were captured.'],
              ['suppressSpam', 'Suppress spam calls', 'Blocks spam-like calls before they create alerts or confirmations.'],
            ].map(([key, title, description]) => (
              <label key={key} className="rounded-[28px] border border-slate-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={Boolean(draft.aiBehavior[key])} onChange={(event) => updateDraftSection('aiBehavior', key, event.target.checked)} className="checkbox-green mt-1 h-4 w-4 rounded border-gray-300 focus:ring-primary-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{title}</p>
                    <p className="mt-1 text-sm text-slate-500">{description}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {[
            ['Business', draft.businessInfo.businessName || 'Not set', draft.businessType.replace(/_/g, ' ')],
            ['Staff alerts', draft.communicationChannels.staffAlertsEnabled ? 'Enabled' : 'Disabled', draft.notificationPreferences.alertAudience],
            ['Caller confirmations', draft.communicationChannels.callerConfirmationEnabled && draft.communicationChannels.callerSmsEnabled ? 'Enabled' : 'Disabled', 'SMS only'],
            ['Contacts', String(draft.staffContacts.length), 'Role-based routing'],
          ].map(([label, value, caption]) => (
            <div key={label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
              <p className="mt-3 text-lg font-semibold text-slate-900">{value}</p>
              <p className="mt-1 text-sm text-slate-500">{caption}</p>
            </div>
          ))}
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5">
          <ul className="space-y-3 text-sm text-slate-600">
            <li>Enable SMS: {draft.communicationChannels.smsEnabled ? 'Yes' : 'No'}</li>
            <li>Business website: {draft.serviceLinks.primaryLink || 'Not provided'}</li>
            <li>Team & Access sync: {draft.staffContacts.length === 1 ? '1 staff contact will be synced on activation' : `${draft.staffContacts.length} staff contacts will be synced on activation`}</li>
            <li>Allowed staff channels: {draft.communicationChannels.staffChannels.length ? draft.communicationChannels.staffChannels.join(', ').toUpperCase() : 'None selected'}</li>
            <li>
              Notification profiles: {NOTIFICATION_AUDIENCES.map((audience) => {
                const channels = draft.notificationPreferences.channelsByAudience?.[audience] || [];
                const label = audience === 'everyone' ? 'Everyone' : audience.charAt(0).toUpperCase() + audience.slice(1);
                return `${label}: ${channels.length ? channels.join('/').toUpperCase() : 'None'}`;
              }).join(' | ')}
            </li>
            <li>AI minimum duration: {draft.aiBehavior.minimumCallDurationSeconds} seconds</li>
            <li>
              Slack integration: {draft.communicationChannels.staffChannels.includes('slack')
                ? (slackConnected ? `Connected${form.slack?.teamName ? ` to ${form.slack.teamName}` : ''}` : 'Selected, but workspace connection still needs to be completed in Integrations')
                : 'Not selected'}
            </li>
          </ul>
        </div>
        {wizardNotice ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{wizardNotice}</div> : null}
        {wizardError ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{wizardError}</div> : null}
      </div>
    );
  }

  return (
    <>
      <section className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">Smart Setup Wizard</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-900">Set up messaging in one guided flow</h3>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">Merxus applies business-type defaults, generates starter templates, and organizes routing so messaging can be turned on quickly.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={openWizard} className="btn-primary">{wizardCompleted ? 'Run Setup Wizard Again' : 'Start Guided Setup'}</button>
            <button type="button" onClick={() => setActiveTab('advanced')} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300">Switch to Advanced</button>
          </div>
        </div>
      </section>

      {isOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-sm">
          <div className="flex min-h-full items-start justify-center p-4 lg:p-8">
            <div className="w-full max-w-7xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
              <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="border-b border-slate-200 bg-slate-50 p-6 lg:border-b-0 lg:border-r">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">Merxus Setup</p>
                  <h3 className="mt-3 text-2xl font-bold text-slate-900">Messaging Wizard</h3>
                  <p className="mt-2 text-sm text-slate-600">{copy.subtitle}</p>
                  <div className="mt-6 h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-700">Step {stepIndex + 1} of {WIZARD_STEPS.length}</p>
                  <div className="mt-6 space-y-2">
                    {WIZARD_STEPS.map((step, index) => <StepChip key={step.id} index={index} label={step.label} active={index === stepIndex} complete={index < stepIndex} onClick={() => setStepIndex(index)} />)}
                  </div>
                  <div className="mt-8 space-y-3">
                    <button type="button" onClick={() => setIsOpen(false)} className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300">{wizardNotice ? 'Keep open' : 'Skip for now'}</button>
                    <button type="button" onClick={() => { setIsOpen(false); setActiveTab('advanced'); }} className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300">Switch to advanced</button>
                  </div>
                </aside>
                <div className="flex min-h-[760px] flex-col">
                  <div className="border-b border-slate-200 px-6 py-6 lg:px-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{activeStep.label}</p>
                    <h4 className="mt-2 text-3xl font-bold text-slate-900">{activeStep.label}</h4>
                    <p className="mt-2 max-w-3xl text-sm text-slate-600">Estimated completion time: 60-90 seconds.</p>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">{renderStepContent()}</div>
                  <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                    <button type="button" onClick={() => setStepIndex((current) => Math.max(0, current - 1))} disabled={stepIndex === 0} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50">Back</button>
                    {stepIndex < WIZARD_STEPS.length - 1 ? (
                      <button type="button" onClick={handleContinue} className="btn-primary">Continue</button>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        {wizardNotice ? (
                          <button
                            type="button"
                            onClick={handleCloseWizard}
                            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300"
                          >
                            Close Wizard
                          </button>
                        ) : null}
                        <button type="button" onClick={handleActivate} className="btn-primary" disabled={saving}>
                          {saving ? 'Activating...' : wizardNotice ? 'Retry Team Sync' : 'Activate System'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
