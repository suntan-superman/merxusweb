import { apiClient } from './client';

// Estate Settings
export async function fetchEstateSettings() {
  const res = await apiClient.get('/estate/settings');
  return res.data;
}

export async function updateEstateSettings(settings) {
  const res = await apiClient.patch('/estate/settings', settings);
  return res.data;
}

// Listings
export async function fetchListings() {
  const res = await apiClient.get('/estate/listings');
  return res.data;
}

export async function createListing(listing) {
  const res = await apiClient.post('/estate/listings', listing);
  return res.data;
}

export async function updateListing(listingId, listing) {
  const res = await apiClient.patch(`/estate/listings/${listingId}`, listing);
  return res.data;
}

export async function deleteListing(listingId) {
  const res = await apiClient.delete(`/estate/listings/${listingId}`);
  return res.data;
}

// Leads
export async function fetchLeads() {
  const res = await apiClient.get('/estate/leads');
  return res.data;
}

export async function updateLead(leadId, lead) {
  const res = await apiClient.patch(`/estate/leads/${leadId}`, lead);
  return res.data;
}

// Showings
export async function fetchShowings() {
  const res = await apiClient.get('/estate/showings');
  return res.data;
}

export async function createShowing(showing) {
  const res = await apiClient.post('/estate/showings', showing);
  return res.data;
}

export async function updateShowing(showingId, showing) {
  const res = await apiClient.patch(`/estate/showings/${showingId}`, showing);
  return res.data;
}

export async function deleteShowing(showingId) {
  const res = await apiClient.delete(`/estate/showings/${showingId}`);
  return res.data;
}

// Calls
export async function fetchEstateCalls() {
  const res = await apiClient.get('/estate/calls');
  return res.data;
}

