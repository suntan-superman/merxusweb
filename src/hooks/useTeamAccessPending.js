import { useEffect, useState } from 'react';
import { fetchTeamUsers } from '../api/teamUsers';
import { TEAM_USERS_CHANGED_EVENT } from '../utils/teamUsersEvents';

function countPendingUsers(users = []) {
  return users.filter((user) => !user?.notificationEligible && !user?.disabled).length;
}

export default function useTeamAccessPending({ tenantType, enabled = false }) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!enabled || !tenantType) {
      setPendingCount(0);
      return undefined;
    }

    let cancelled = false;

    async function loadPendingCount() {
      try {
        const data = await fetchTeamUsers(tenantType);
        if (!cancelled) {
          setPendingCount(countPendingUsers(Array.isArray(data) ? data : []));
        }
      } catch (_) {
        if (!cancelled) {
          setPendingCount(0);
        }
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        loadPendingCount();
      }
    }

    loadPendingCount();
    window.addEventListener(TEAM_USERS_CHANGED_EVENT, loadPendingCount);
    window.addEventListener('focus', loadPendingCount);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener(TEAM_USERS_CHANGED_EVENT, loadPendingCount);
      window.removeEventListener('focus', loadPendingCount);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, tenantType]);

  return {
    pendingCount,
    hasPending: pendingCount > 0,
  };
}
