import useTeamUsersQuery, { countPendingTeamUsers } from './useTeamUsersQuery';

export default function useTeamAccessPending({ tenantType, enabled = false }) {
  const { data } = useTeamUsersQuery({ tenantType, enabled });
  const pendingCount = enabled ? countPendingTeamUsers(Array.isArray(data) ? data : []) : 0;

  return {
    pendingCount,
    hasPending: pendingCount > 0,
  };
}
