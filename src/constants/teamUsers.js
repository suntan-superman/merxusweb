export const TEAM_NOTIFICATION_GROUPS = {
  restaurant: [
    { key: 'reservation_contacts', label: 'Reservation Contacts' },
    { key: 'order_contacts', label: 'Order Contacts' },
    { key: 'sales_contacts', label: 'Sales / Catering Contacts' },
    { key: 'manager_contacts', label: 'Manager Contacts' },
  ],
  voice: [
    { key: 'support_contacts', label: 'Support Contacts' },
    { key: 'appointment_contacts', label: 'Appointment Contacts' },
    { key: 'sales_contacts', label: 'Sales / Quote Contacts' },
    { key: 'manager_contacts', label: 'Manager Contacts' },
  ],
  real_estate: [
    { key: 'property_contacts', label: 'Listing Inquiry Contacts' },
    { key: 'showing_contacts', label: 'Showing Contacts' },
    { key: 'buyer_agent_contacts', label: 'Buyer Lead Contacts' },
    { key: 'seller_agent_contacts', label: 'Seller Lead Contacts' },
    { key: 'broker_contacts', label: 'Broker Contacts' },
  ],
};

export function getTeamUserCopy(tenantType) {
  if (tenantType === 'restaurant') {
    return {
      title: 'Team & Access',
      subtitle: 'Invite staff, require phone verification for SMS alerts, and control notification routing groups.',
    };
  }
  if (tenantType === 'real_estate') {
    return {
      title: 'Team & Access',
      subtitle: 'Invite agents or assistants, require SMS verification, and control lead and showing routing.',
    };
  }
  return {
    title: 'Team & Access',
    subtitle: 'Invite office staff, require phone verification for live alerts, and manage routing groups.',
  };
}
