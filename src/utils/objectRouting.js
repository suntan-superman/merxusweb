export function getPortalBasePath(tenantType) {
  if (tenantType === 'restaurant') return '/restaurant';
  if (tenantType === 'real_estate') return '/estate';
  if (tenantType === 'voice') return '/voice';
  return '';
}

export function getNativeObjectRoute(tenantType, graphRefs = {}) {
  const portalBasePath = getPortalBasePath(tenantType);
  if (!portalBasePath) {
    return null;
  }

  if (tenantType === 'restaurant') {
    if (graphRefs.reservationId) {
      return {
        label: 'Open Booking Record',
        path: `${portalBasePath}/bookings?bookingId=${encodeURIComponent(graphRefs.reservationId)}`,
      };
    }

    if (graphRefs.orderId) {
      return {
        label: 'Open Order Record',
        path: `${portalBasePath}/orders?orderId=${encodeURIComponent(graphRefs.orderId)}`,
      };
    }
  }

  if (tenantType === 'real_estate') {
    if (graphRefs.showingId) {
      return {
        label: 'Open Showing Record',
        path: `${portalBasePath}/showings?showingId=${encodeURIComponent(graphRefs.showingId)}`,
      };
    }

    if (graphRefs.propertyId) {
      return {
        label: 'Open Listing Record',
        path: `${portalBasePath}/listings/${encodeURIComponent(graphRefs.propertyId)}`,
      };
    }
  }

  if (tenantType === 'voice') {
    if (graphRefs.appointmentId) {
      return {
        label: 'Open Appointment Record',
        path: `${portalBasePath}/work-items?type=appointment&id=${encodeURIComponent(graphRefs.appointmentId)}`,
      };
    }

    if (graphRefs.quoteId) {
      return {
        label: 'Open Quote Record',
        path: `${portalBasePath}/work-items?type=quote&id=${encodeURIComponent(graphRefs.quoteId)}`,
      };
    }

    if (graphRefs.serviceRequestId) {
      return {
        label: 'Open Service Request',
        path: `${portalBasePath}/work-items?type=service_request&id=${encodeURIComponent(graphRefs.serviceRequestId)}`,
      };
    }
  }

  return null;
}
