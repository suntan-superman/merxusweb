/**
 * React Query hooks for Voice/Office API
 * 
 * These hooks provide caching, automatic refetching, and optimistic updates
 * for all voice-related data.
 * 
 * @module hooks/useVoiceQueries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchVoiceSettings,
  updateVoiceSettings,
  getRoutingRules,
  createRoutingRule,
  updateRoutingRule,
  deleteRoutingRule,
} from '../api/voice';
import {
  getVoiceUsers,
  inviteVoiceUser,
  updateVoiceUser,
  deleteVoiceUser,
  getActivityLog,
} from '../api/voiceUsers';
import { fetchCalls, fetchCallTranscript, translateCallTranscript } from '../api/calls';
import toast from 'react-hot-toast';

// ============================================================
// Query Keys - Centralized for easy invalidation
// ============================================================

export const voiceKeys = {
  all: ['voice'],
  settings: () => [...voiceKeys.all, 'settings'],
  users: () => [...voiceKeys.all, 'users'],
  user: (uid) => [...voiceKeys.users(), uid],
  routingRules: () => [...voiceKeys.all, 'routingRules'],
  calls: (filters) => [...voiceKeys.all, 'calls', filters],
  callTranscript: (callId) => [...voiceKeys.all, 'transcript', callId],
  activityLog: (filters) => [...voiceKeys.all, 'activityLog', filters],
};

// ============================================================
// Settings Hooks
// ============================================================

/**
 * Fetch voice settings
 */
export function useVoiceSettings(options = {}) {
  return useQuery({
    queryKey: voiceKeys.settings(),
    queryFn: fetchVoiceSettings,
    ...options,
  });
}

/**
 * Update voice settings with optimistic update
 */
export function useUpdateVoiceSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateVoiceSettings,
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: voiceKeys.settings() });
      const previousSettings = queryClient.getQueryData(voiceKeys.settings());
      
      queryClient.setQueryData(voiceKeys.settings(), (old) => ({
        ...old,
        ...newSettings,
      }));
      
      return { previousSettings };
    },
    onError: (err, newSettings, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(voiceKeys.settings(), context.previousSettings);
      }
      toast.error(err?.response?.data?.message || 'Failed to update settings');
    },
    onSuccess: () => {
      toast.success('Settings updated successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: voiceKeys.settings() });
    },
  });
}

// ============================================================
// Users Hooks
// ============================================================

/**
 * Fetch voice users (team members)
 */
export function useVoiceUsers(options = {}) {
  return useQuery({
    queryKey: voiceKeys.users(),
    queryFn: getVoiceUsers,
    ...options,
  });
}

/**
 * Invite a new voice user
 */
export function useInviteVoiceUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: inviteVoiceUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voiceKeys.users() });
      queryClient.invalidateQueries({ queryKey: voiceKeys.activityLog({}) });
      toast.success('Invitation sent successfully');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to send invitation');
    },
  });
}

/**
 * Update a voice user
 */
export function useUpdateVoiceUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ uid, updates }) => updateVoiceUser(uid, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voiceKeys.users() });
      queryClient.invalidateQueries({ queryKey: voiceKeys.activityLog({}) });
      toast.success('User updated successfully');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update user');
    },
  });
}

/**
 * Delete a voice user
 */
export function useDeleteVoiceUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteVoiceUser,
    onMutate: async (uid) => {
      await queryClient.cancelQueries({ queryKey: voiceKeys.users() });
      const previousUsers = queryClient.getQueryData(voiceKeys.users());
      
      queryClient.setQueryData(voiceKeys.users(), (old) => 
        old?.filter?.(u => u.uid !== uid) || old
      );
      
      return { previousUsers };
    },
    onError: (err, uid, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(voiceKeys.users(), context.previousUsers);
      }
      toast.error(err?.response?.data?.message || 'Failed to delete user');
    },
    onSuccess: () => {
      toast.success('User removed successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: voiceKeys.users() });
      queryClient.invalidateQueries({ queryKey: voiceKeys.activityLog({}) });
    },
  });
}

// ============================================================
// Activity Log Hooks
// ============================================================

/**
 * Fetch activity log for the office
 * @param {Object} options - Query options (limit, type)
 */
export function useActivityLog(options = {}) {
  return useQuery({
    queryKey: voiceKeys.activityLog(options),
    queryFn: () => getActivityLog(options),
    staleTime: 30000, // 30 seconds
    ...options.queryOptions,
  });
}

// ============================================================
// Routing Rules Hooks
// ============================================================

/**
 * Fetch routing rules
 */
export function useRoutingRules(options = {}) {
  return useQuery({
    queryKey: voiceKeys.routingRules(),
    queryFn: getRoutingRules,
    ...options,
  });
}

/**
 * Create a routing rule
 */
export function useCreateRoutingRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createRoutingRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voiceKeys.routingRules() });
      toast.success('Routing rule created');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to create routing rule');
    },
  });
}

/**
 * Update a routing rule
 */
export function useUpdateRoutingRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ ruleId, updates }) => updateRoutingRule(ruleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voiceKeys.routingRules() });
      toast.success('Routing rule updated');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update routing rule');
    },
  });
}

/**
 * Delete a routing rule
 */
export function useDeleteRoutingRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteRoutingRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voiceKeys.routingRules() });
      toast.success('Routing rule deleted');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete routing rule');
    },
  });
}

// ============================================================
// Calls Hooks
// ============================================================

/**
 * Fetch calls with optional filters
 */
export function useVoiceCalls(filters = {}, options = {}) {
  return useQuery({
    queryKey: voiceKeys.calls(filters),
    queryFn: () => fetchCalls(filters),
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

/**
 * Fetch call transcript
 */
export function useCallTranscript(callId, options = {}) {
  return useQuery({
    queryKey: voiceKeys.callTranscript(callId),
    queryFn: () => fetchCallTranscript(callId),
    enabled: !!callId,
    staleTime: Infinity, // Transcripts don't change
    ...options,
  });
}

/**
 * Translate a call transcript
 */
export function useTranslateTranscript() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ callId, targetLanguage }) => translateCallTranscript(callId, targetLanguage),
    onSuccess: (data, { callId }) => {
      // Update cached transcript with translation
      queryClient.setQueryData(voiceKeys.callTranscript(callId), (old) => ({
        ...old,
        translation: data.translation,
        translatedLanguage: data.language,
      }));
      toast.success('Transcript translated');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to translate transcript');
    },
  });
}
