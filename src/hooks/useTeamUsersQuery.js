import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTeamUsers } from '../api/teamUsers';
import { TEAM_USERS_CHANGED_EVENT } from '../utils/teamUsersEvents';

const TEAM_USERS_POLL_INTERVAL_MS = 10000;

export const teamUsersKeys = {
  all: ['team-users'],
  list: (tenantType) => [...teamUsersKeys.all, tenantType],
};

export function countPendingTeamUsers(users = []) {
  return users.filter((user) => !user?.notificationEligible && !user?.disabled).length;
}

export default function useTeamUsersQuery({ tenantType, enabled = true } = {}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !tenantType) return undefined;

    function handleUsersChanged(event) {
      const nextTenantType = event?.detail?.tenantType;
      if (nextTenantType && nextTenantType !== tenantType) return;
      queryClient.invalidateQueries({ queryKey: teamUsersKeys.list(tenantType) });
    }

    window.addEventListener(TEAM_USERS_CHANGED_EVENT, handleUsersChanged);
    return () => {
      window.removeEventListener(TEAM_USERS_CHANGED_EVENT, handleUsersChanged);
    };
  }, [enabled, queryClient, tenantType]);

  return useQuery({
    queryKey: teamUsersKeys.list(tenantType),
    enabled: enabled && Boolean(tenantType),
    queryFn: async () => {
      const data = await fetchTeamUsers(tenantType);
      return Array.isArray(data) ? data : [];
    },
    staleTime: 0,
    refetchOnWindowFocus: 'always',
    refetchInterval: (query) => (
      countPendingTeamUsers(Array.isArray(query.state.data) ? query.state.data : [])
        ? TEAM_USERS_POLL_INTERVAL_MS
        : false
    ),
  });
}
