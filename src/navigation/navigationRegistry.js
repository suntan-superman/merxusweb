export const NAV_GROUPS = [
  { id: 'core', label: 'Core', sortOrder: 10 },
  { id: 'pro', label: 'Pro Features', sortOrder: 20, planTier: 'professional', badgeLabel: 'Pro' },
  { id: 'elite', label: 'Elite Features', sortOrder: 30, planTier: 'elite', badgeLabel: 'Elite', summary: 'Includes Pro' },
  { id: 'admin', label: 'Admin', sortOrder: 40 },
];

export const NAV_ITEMS = [
  // Restaurant
  { id: 'restaurant_dashboard', tenantType: 'restaurant', groupId: 'core', label: 'Dashboard', path: '/restaurant', icon: '📊', sortOrder: 10, defaultQuickStart: true },
  { id: 'restaurant_orders', tenantType: 'restaurant', groupId: 'core', label: 'Orders', path: '/restaurant/orders', icon: '📦', sortOrder: 20 },
  { id: 'restaurant_bookings', tenantType: 'restaurant', groupId: 'core', label: 'Bookings', path: '/restaurant/bookings', icon: '📘', sortOrder: 25, defaultQuickStart: true },
  { id: 'restaurant_booking_areas', tenantType: 'restaurant', groupId: 'core', label: 'Booking Areas', path: '/restaurant/booking-areas', icon: '🧭', sortOrder: 26 },
  { id: 'restaurant_booking_rules', tenantType: 'restaurant', groupId: 'core', label: 'Booking Rules', path: '/restaurant/booking-settings', icon: '🧾', sortOrder: 27 },
  { id: 'restaurant_reservations', tenantType: 'restaurant', groupId: 'core', label: 'Reservations', path: '/restaurant/reservations', icon: '📅', sortOrder: 30 },
  { id: 'restaurant_calls_messages', tenantType: 'restaurant', groupId: 'core', label: 'Calls & Messages', path: '/restaurant/calls', icon: '📞', sortOrder: 40, defaultQuickStart: true },
  { id: 'restaurant_customers', tenantType: 'restaurant', groupId: 'core', label: 'Customers', path: '/restaurant/customers', icon: '👥', sortOrder: 50 },
  { id: 'restaurant_menu', tenantType: 'restaurant', groupId: 'core', label: 'Menu', path: '/restaurant/menu', icon: '🍽️', sortOrder: 60 },
  { id: 'restaurant_sms_inbox', tenantType: 'restaurant', groupId: 'core', label: 'SMS Inbox', path: '/restaurant/sms', icon: '💬', sortOrder: 70, defaultQuickStart: true },
  { id: 'restaurant_command_center', tenantType: 'restaurant', groupId: 'core', label: 'Command Center', path: '/restaurant/command-center', icon: '🛰️', sortOrder: 80, defaultQuickStart: true },
  { id: 'restaurant_notifications', tenantType: 'restaurant', groupId: 'core', label: 'Notifications', path: '/restaurant/notifications', icon: '🔔', sortOrder: 90, defaultQuickStart: true },
  { id: 'restaurant_settings', tenantType: 'restaurant', groupId: 'admin', label: 'Settings', path: '/restaurant/settings', icon: '⚙️', sortOrder: 100, allowedRoles: ['owner', 'manager'] },
  { id: 'restaurant_billing', tenantType: 'restaurant', groupId: 'admin', label: 'Billing', path: '/restaurant/billing', icon: '💳', sortOrder: 110, allowedRoles: ['owner', 'manager'] },
  { id: 'restaurant_team_access', tenantType: 'restaurant', groupId: 'admin', label: 'Team & Access', path: '/restaurant/users', icon: '👤', sortOrder: 120, allowedRoles: ['owner'] },
  { id: 'restaurant_intelligence', tenantType: 'restaurant', groupId: 'pro', label: 'Intelligence', path: '/restaurant/intelligence', icon: '🧠', sortOrder: 10, requiredPlan: 'professional' },
  { id: 'restaurant_customer_360', tenantType: 'restaurant', groupId: 'pro', label: 'Customer 360', path: '/restaurant/customer-360', icon: '🪪', sortOrder: 20, requiredPlan: 'professional' },
  { id: 'restaurant_merge_activity', tenantType: 'restaurant', groupId: 'pro', label: 'Merge Activity', path: '/restaurant/merge-activity', icon: '🔀', sortOrder: 30, requiredPlan: 'professional' },
  { id: 'restaurant_reviews', tenantType: 'restaurant', groupId: 'elite', label: 'Reviews', path: '/restaurant/reviews', icon: '⭐', sortOrder: 10, requiredPlan: 'elite', defaultQuickStart: true },
  { id: 'restaurant_feedback', tenantType: 'restaurant', groupId: 'elite', label: 'Feedback', path: '/restaurant/feedback', icon: '🗣️', sortOrder: 20, requiredPlan: 'elite' },
  { id: 'restaurant_automations', tenantType: 'restaurant', groupId: 'elite', label: 'Automations', path: '/restaurant/automations', icon: '⚡', sortOrder: 30, requiredPlan: 'elite' },
  { id: 'restaurant_cx_analytics', tenantType: 'restaurant', groupId: 'elite', label: 'CX Analytics', path: '/restaurant/cx-analytics', icon: '📈', sortOrder: 40, requiredPlan: 'elite' },

  // Office / voice
  { id: 'voice_dashboard', tenantType: 'voice', groupId: 'core', label: 'Dashboard', path: '/voice', icon: '📊', sortOrder: 10, defaultQuickStart: true },
  { id: 'voice_calls_messages', tenantType: 'voice', groupId: 'core', label: 'Calls & Messages', path: '/voice/calls', icon: '📞', sortOrder: 20, defaultQuickStart: true },
  { id: 'voice_voicemail', tenantType: 'voice', groupId: 'core', label: 'Voicemail', path: '/voice/voicemail', icon: '📬', sortOrder: 30, defaultQuickStart: true },
  { id: 'voice_sms_inbox', tenantType: 'voice', groupId: 'core', label: 'SMS Inbox', path: '/voice/sms', icon: '💬', sortOrder: 40, defaultQuickStart: true },
  { id: 'voice_command_center', tenantType: 'voice', groupId: 'core', label: 'Command Center', path: '/voice/command-center', icon: '🛰️', sortOrder: 50, defaultQuickStart: true },
  { id: 'voice_notifications', tenantType: 'voice', groupId: 'core', label: 'Notifications', path: '/voice/notifications', icon: '🔔', sortOrder: 60 },
  { id: 'voice_call_routing', tenantType: 'voice', groupId: 'core', label: 'Call Routing', path: '/voice/routing', icon: '🔄', sortOrder: 70, allowedRoles: ['owner', 'manager'], defaultQuickStart: true },
  { id: 'voice_settings', tenantType: 'voice', groupId: 'admin', label: 'Settings', path: '/voice/settings', icon: '⚙️', sortOrder: 80, allowedRoles: ['owner', 'manager'] },
  { id: 'voice_billing', tenantType: 'voice', groupId: 'admin', label: 'Billing', path: '/voice/billing', icon: '💳', sortOrder: 90, allowedRoles: ['owner', 'manager'] },
  { id: 'voice_team_access', tenantType: 'voice', groupId: 'admin', label: 'Team & Access', path: '/voice/users', icon: '👤', sortOrder: 100, allowedRoles: ['owner'] },
  { id: 'voice_intelligence', tenantType: 'voice', groupId: 'pro', label: 'Intelligence', path: '/voice/intelligence', icon: '🧠', sortOrder: 10, requiredPlan: 'professional' },
  { id: 'voice_work_items', tenantType: 'voice', groupId: 'pro', label: 'Work Items', path: '/voice/work-items', icon: '🧾', sortOrder: 20, requiredPlan: 'professional' },
  { id: 'voice_customer_360', tenantType: 'voice', groupId: 'pro', label: 'Customer 360', path: '/voice/customer-360', icon: '🪪', sortOrder: 30, requiredPlan: 'professional' },
  { id: 'voice_merge_activity', tenantType: 'voice', groupId: 'pro', label: 'Merge Activity', path: '/voice/merge-activity', icon: '🔀', sortOrder: 40, requiredPlan: 'professional' },
  { id: 'voice_reviews', tenantType: 'voice', groupId: 'elite', label: 'Reviews', path: '/voice/reviews', icon: '⭐', sortOrder: 10, requiredPlan: 'elite' },
  { id: 'voice_feedback', tenantType: 'voice', groupId: 'elite', label: 'Feedback', path: '/voice/feedback', icon: '🗣️', sortOrder: 20, requiredPlan: 'elite' },
  { id: 'voice_automations', tenantType: 'voice', groupId: 'elite', label: 'Automations', path: '/voice/automations', icon: '⚡', sortOrder: 30, requiredPlan: 'elite' },
  { id: 'voice_cx_analytics', tenantType: 'voice', groupId: 'elite', label: 'CX Analytics', path: '/voice/cx-analytics', icon: '📈', sortOrder: 40, requiredPlan: 'elite' },

  // Real estate
  { id: 'estate_dashboard', tenantType: 'real_estate', groupId: 'core', label: 'Dashboard', path: '/estate', icon: '📊', sortOrder: 10, defaultQuickStart: true },
  { id: 'estate_listings', tenantType: 'real_estate', groupId: 'core', label: 'Listings', path: '/estate/listings', icon: '🏠', sortOrder: 20 },
  { id: 'estate_leads', tenantType: 'real_estate', groupId: 'core', label: 'Leads', path: '/estate/leads', icon: '👥', sortOrder: 30 },
  { id: 'estate_showings', tenantType: 'real_estate', groupId: 'core', label: 'Showings', path: '/estate/showings', icon: '📅', sortOrder: 40 },
  { id: 'estate_calls_messages', tenantType: 'real_estate', groupId: 'core', label: 'Calls & Messages', path: '/estate/calls', icon: '📞', sortOrder: 50, defaultQuickStart: true },
  { id: 'estate_sms_inbox', tenantType: 'real_estate', groupId: 'core', label: 'SMS Inbox', path: '/estate/sms', icon: '💬', sortOrder: 60, defaultQuickStart: true },
  { id: 'estate_command_center', tenantType: 'real_estate', groupId: 'core', label: 'Command Center', path: '/estate/command-center', icon: '🛰️', sortOrder: 70 },
  { id: 'estate_notifications', tenantType: 'real_estate', groupId: 'core', label: 'Notifications', path: '/estate/notifications', icon: '🔔', sortOrder: 80 },
  { id: 'estate_flyer_analytics', tenantType: 'real_estate', groupId: 'core', label: 'Flyer Analytics', path: '/estate/flyers/metrics', icon: '📊', sortOrder: 90 },
  { id: 'estate_settings', tenantType: 'real_estate', groupId: 'admin', label: 'Settings', path: '/estate/settings', icon: '⚙️', sortOrder: 100, allowedRoles: ['owner', 'manager'] },
  { id: 'estate_billing', tenantType: 'real_estate', groupId: 'admin', label: 'Billing', path: '/estate/billing', icon: '💳', sortOrder: 110, allowedRoles: ['owner', 'manager'] },
  { id: 'estate_team_access', tenantType: 'real_estate', groupId: 'admin', label: 'Team & Access', path: '/estate/users', icon: '👤', sortOrder: 120, allowedRoles: ['owner'] },
  { id: 'estate_intelligence', tenantType: 'real_estate', groupId: 'pro', label: 'Intelligence', path: '/estate/intelligence', icon: '🧠', sortOrder: 10, requiredPlan: 'professional' },
  { id: 'estate_customer_360', tenantType: 'real_estate', groupId: 'pro', label: 'Customer 360', path: '/estate/customer-360', icon: '🪪', sortOrder: 20, requiredPlan: 'professional', defaultQuickStart: true },
  { id: 'estate_merge_activity', tenantType: 'real_estate', groupId: 'pro', label: 'Merge Activity', path: '/estate/merge-activity', icon: '🔀', sortOrder: 30, requiredPlan: 'professional' },
  { id: 'estate_reviews', tenantType: 'real_estate', groupId: 'elite', label: 'Reviews', path: '/estate/reviews', icon: '⭐', sortOrder: 10, requiredPlan: 'elite', defaultQuickStart: true },
  { id: 'estate_feedback', tenantType: 'real_estate', groupId: 'elite', label: 'Feedback', path: '/estate/feedback', icon: '🗣️', sortOrder: 20, requiredPlan: 'elite' },
  { id: 'estate_automations', tenantType: 'real_estate', groupId: 'elite', label: 'Automations', path: '/estate/automations', icon: '⚡', sortOrder: 30, requiredPlan: 'elite', defaultQuickStart: true },
  { id: 'estate_cx_analytics', tenantType: 'real_estate', groupId: 'elite', label: 'CX Analytics', path: '/estate/cx-analytics', icon: '📈', sortOrder: 40, requiredPlan: 'elite' },
];

export function getNavigationItems({ tenantType, role = 'staff', includeLocked = true } = {}) {
  return NAV_ITEMS
    .filter((item) => item.tenantType === tenantType)
    .filter((item) => !item.allowedRoles || item.allowedRoles.includes(role))
    .filter((item) => includeLocked || !item.requiredPlan)
    .sort((left, right) => {
      if (left.groupId !== right.groupId) {
        return groupOrder(left.groupId) - groupOrder(right.groupId);
      }
      return left.sortOrder - right.sortOrder;
    });
}

export function getNavigationGroups() {
  return [...NAV_GROUPS].sort((left, right) => left.sortOrder - right.sortOrder);
}

function groupOrder(groupId) {
  return NAV_GROUPS.find((group) => group.id === groupId)?.sortOrder || 999;
}
