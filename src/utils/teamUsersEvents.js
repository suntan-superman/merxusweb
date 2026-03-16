export const TEAM_USERS_CHANGED_EVENT = 'merxus:team-users-changed';

export function dispatchTeamUsersChanged(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TEAM_USERS_CHANGED_EVENT, { detail }));
}
