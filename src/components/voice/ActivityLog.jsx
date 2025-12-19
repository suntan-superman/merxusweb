/**
 * ActivityLog Component
 * 
 * Displays audit trail of user-related actions (invites, role changes, disables)
 * for office administrators.
 */

import { useState } from 'react';
import { useActivityLog } from '../../hooks/useVoiceQueries';
import {
  UserPlusIcon,
  UserMinusIcon,
  ShieldCheckIcon,
  ClockIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 */
function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Unknown time';
  
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];
  
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
  }
  
  return 'just now';
}

const ACTION_CONFIG = {
  invite: {
    icon: UserPlusIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Invited',
  },
  role_change: {
    icon: ShieldCheckIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Role Changed',
  },
  update: {
    icon: ShieldCheckIcon,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Updated',
  },
  disable: {
    icon: UserMinusIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Disabled',
  },
};

function ActivityLogEntry({ activity }) {
  const config = ACTION_CONFIG[activity.action] || ACTION_CONFIG.update;
  const Icon = config.icon;
  
  const formatDetails = () => {
    const details = activity.details || {};
    if (activity.action === 'invite') {
      return `as ${details.role}`;
    }
    if (activity.action === 'role_change') {
      return `to ${details.role}`;
    }
    if (activity.action === 'disable') {
      return details.previousRole ? `(was ${details.previousRole})` : '';
    }
    return '';
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className={`p-2 rounded-full ${config.bgColor}`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">
          <span className="font-medium">{activity.actorEmail || 'Unknown'}</span>
          {' '}
          <span className={config.color}>{config.label.toLowerCase()}</span>
          {' '}
          <span className="font-medium">{activity.targetEmail || 'a user'}</span>
          {' '}
          <span className="text-gray-500">{formatDetails()}</span>
        </p>
        <p className="mt-0.5 text-xs text-gray-500 flex items-center gap-1">
          <ClockIcon className="w-3 h-3" />
          {activity.timestamp 
            ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })
            : 'Unknown time'
          }
        </p>
      </div>
    </div>
  );
}

export default function ActivityLog({ limit = 20 }) {
  const [filter, setFilter] = useState('all');
  
  const { data: activities, isLoading, error, refetch } = useActivityLog({
    limit,
    type: filter !== 'all' ? 'user' : undefined,
  });

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 text-red-600">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <span>Failed to load activity log</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Activity Log</h3>
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-4 h-4 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Activity</option>
            <option value="user">User Changes</option>
          </select>
          <button
            onClick={() => refetch()}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>
      
      <div className="px-4 py-2 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2">Loading activity...</p>
          </div>
        ) : activities?.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <ClockIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No activity recorded yet</p>
          </div>
        ) : (
          activities?.map((activity) => (
            <ActivityLogEntry key={activity.id} activity={activity} />
          ))
        )}
      </div>
    </div>
  );
}
