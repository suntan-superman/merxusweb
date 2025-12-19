/**
 * React Query hooks for Estate (Real Estate) API
 * 
 * These hooks provide caching, automatic refetching, and optimistic updates
 * for all estate-related data.
 * 
 * @module hooks/useEstateQueries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchEstateSettings,
  updateEstateSettings,
  fetchListings,
  createListing,
  updateListing,
  deleteListing,
  fetchLeads,
  updateLead,
  fetchShowings,
  createShowing,
  updateShowing,
  deleteShowing,
  fetchEstateCalls,
  fetchFlyerQueue,
  approveFlyerQueue,
  declineFlyerQueue,
  fetchFlyerLogs,
  fetchFlyerMetrics,
  sendTestFlyer,
} from '../api/estate';
import toast from 'react-hot-toast';

// ============================================================
// Query Keys - Centralized for easy invalidation
// ============================================================

export const estateKeys = {
  all: ['estate'],
  settings: () => [...estateKeys.all, 'settings'],
  listings: () => [...estateKeys.all, 'listings'],
  listing: (id) => [...estateKeys.listings(), id],
  leads: () => [...estateKeys.all, 'leads'],
  lead: (id) => [...estateKeys.leads(), id],
  showings: () => [...estateKeys.all, 'showings'],
  showing: (id) => [...estateKeys.showings(), id],
  calls: () => [...estateKeys.all, 'calls'],
  flyerQueue: () => [...estateKeys.all, 'flyerQueue'],
  flyerLogs: (filters) => [...estateKeys.all, 'flyerLogs', filters],
  flyerMetrics: () => [...estateKeys.all, 'flyerMetrics'],
};

// ============================================================
// Settings Hooks
// ============================================================

/**
 * Fetch estate settings
 */
export function useEstateSettings(options = {}) {
  return useQuery({
    queryKey: estateKeys.settings(),
    queryFn: fetchEstateSettings,
    ...options,
  });
}

/**
 * Update estate settings with optimistic update
 */
export function useUpdateEstateSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateEstateSettings,
    onMutate: async (newSettings) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: estateKeys.settings() });
      
      // Snapshot previous value
      const previousSettings = queryClient.getQueryData(estateKeys.settings());
      
      // Optimistically update
      queryClient.setQueryData(estateKeys.settings(), (old) => ({
        ...old,
        ...newSettings,
      }));
      
      return { previousSettings };
    },
    onError: (err, newSettings, context) => {
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(estateKeys.settings(), context.previousSettings);
      }
      toast.error(err?.response?.data?.message || 'Failed to update settings');
    },
    onSuccess: () => {
      toast.success('Settings updated successfully');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: estateKeys.settings() });
    },
  });
}

// ============================================================
// Listings Hooks
// ============================================================

/**
 * Fetch all listings
 */
export function useListings(options = {}) {
  return useQuery({
    queryKey: estateKeys.listings(),
    queryFn: fetchListings,
    ...options,
  });
}

/**
 * Fetch a single listing by ID
 * Uses the listings cache to avoid redundant fetches
 */
export function useListing(listingId, options = {}) {
  return useQuery({
    queryKey: estateKeys.listing(listingId),
    queryFn: async () => {
      const listings = await fetchListings();
      const listing = listings?.find?.(l => l.id === listingId);
      if (!listing) {
        throw new Error('Listing not found');
      }
      return listing;
    },
    enabled: !!listingId,
    ...options,
  });
}

/**
 * Create a new listing
 */
export function useCreateListing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createListing,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: estateKeys.listings() });
      toast.success('Listing created successfully');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to create listing');
    },
  });
}

/**
 * Update an existing listing
 */
export function useUpdateListing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ listingId, listing }) => updateListing(listingId, listing),
    onSuccess: (data, { listingId }) => {
      queryClient.invalidateQueries({ queryKey: estateKeys.listings() });
      queryClient.invalidateQueries({ queryKey: estateKeys.listing(listingId) });
      toast.success('Listing updated successfully');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update listing');
    },
  });
}

/**
 * Delete a listing
 */
export function useDeleteListing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteListing,
    onMutate: async (listingId) => {
      await queryClient.cancelQueries({ queryKey: estateKeys.listings() });
      
      const previousListings = queryClient.getQueryData(estateKeys.listings());
      
      // Optimistically remove from list
      queryClient.setQueryData(estateKeys.listings(), (old) => 
        old?.filter?.(l => l.id !== listingId) || old
      );
      
      return { previousListings };
    },
    onError: (err, listingId, context) => {
      if (context?.previousListings) {
        queryClient.setQueryData(estateKeys.listings(), context.previousListings);
      }
      toast.error(err?.response?.data?.message || 'Failed to delete listing');
    },
    onSuccess: () => {
      toast.success('Listing deleted successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: estateKeys.listings() });
    },
  });
}

// ============================================================
// Leads Hooks
// ============================================================

/**
 * Fetch all leads
 */
export function useLeads(options = {}) {
  return useQuery({
    queryKey: estateKeys.leads(),
    queryFn: fetchLeads,
    ...options,
  });
}

/**
 * Update a lead
 */
export function useUpdateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ leadId, lead }) => updateLead(leadId, lead),
    onSuccess: (data, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: estateKeys.leads() });
      toast.success('Lead updated successfully');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update lead');
    },
  });
}

// ============================================================
// Showings Hooks
// ============================================================

/**
 * Fetch all showings
 */
export function useShowings(options = {}) {
  return useQuery({
    queryKey: estateKeys.showings(),
    queryFn: fetchShowings,
    ...options,
  });
}

/**
 * Create a new showing
 */
export function useCreateShowing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createShowing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estateKeys.showings() });
      toast.success('Showing scheduled successfully');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to schedule showing');
    },
  });
}

/**
 * Update a showing
 */
export function useUpdateShowing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ showingId, showing }) => updateShowing(showingId, showing),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estateKeys.showings() });
      toast.success('Showing updated successfully');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update showing');
    },
  });
}

/**
 * Delete a showing
 */
export function useDeleteShowing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteShowing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estateKeys.showings() });
      toast.success('Showing cancelled successfully');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel showing');
    },
  });
}

// ============================================================
// Calls Hooks
// ============================================================

/**
 * Fetch estate calls
 */
export function useEstateCalls(options = {}) {
  return useQuery({
    queryKey: estateKeys.calls(),
    queryFn: fetchEstateCalls,
    // Calls should refresh more frequently
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

// ============================================================
// Flyer Hooks
// ============================================================

/**
 * Fetch flyer approval queue
 */
export function useFlyerQueue(limit = 50, options = {}) {
  return useQuery({
    queryKey: estateKeys.flyerQueue(),
    queryFn: () => fetchFlyerQueue(limit),
    ...options,
  });
}

/**
 * Approve a flyer in queue
 */
export function useApproveFlyerQueue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: approveFlyerQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estateKeys.flyerQueue() });
      queryClient.invalidateQueries({ queryKey: estateKeys.flyerLogs({}) });
      toast.success('Flyer approved and sent');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to approve flyer');
    },
  });
}

/**
 * Decline a flyer in queue
 */
export function useDeclineFlyerQueue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: declineFlyerQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estateKeys.flyerQueue() });
      toast.success('Flyer declined');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to decline flyer');
    },
  });
}

/**
 * Fetch flyer logs
 */
export function useFlyerLogs(filters = {}, options = {}) {
  return useQuery({
    queryKey: estateKeys.flyerLogs(filters),
    queryFn: () => fetchFlyerLogs(filters),
    ...options,
  });
}

/**
 * Fetch flyer metrics
 */
export function useFlyerMetrics(options = {}) {
  return useQuery({
    queryKey: estateKeys.flyerMetrics(),
    queryFn: fetchFlyerMetrics,
    staleTime: 5 * 60 * 1000, // 5 minutes - metrics don't need frequent updates
    ...options,
  });
}

/**
 * Send a test flyer
 */
export function useSendTestFlyer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ listingId, testEmail }) => sendTestFlyer(listingId, testEmail),
    onSuccess: (data, { listingId }) => {
      // Invalidate flyer logs to show the test send
      queryClient.invalidateQueries({ queryKey: estateKeys.flyerLogs({ listingId }) });
      queryClient.invalidateQueries({ queryKey: estateKeys.flyerLogs({}) });
      toast.success('Test flyer sent successfully');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to send test flyer');
    },
  });
}
