import { useState } from 'react';

/**
 * EscalatedCallsAlert - Shows urgent notification of escalated calls
 * Displays count and recent escalations that need attention
 */
export default function EscalatedCallsAlert({ calls = [] }) {
  const [dismissed, setDismissed] = useState(false);

  // Filter escalated calls
  const escalatedCalls = calls.filter((c) => c.escalation?.triggered);

  if (escalatedCalls.length === 0 || dismissed) {
    return null;
  }

  // Get the most recent escalation
  const recentEscalation = escalatedCalls[0];
  const escalationTime = recentEscalation.escalation?.timestamp?.toDate
    ? recentEscalation.escalation.timestamp.toDate()
    : new Date(recentEscalation.escalation?.timestamp);

  const timeAgo = getTimeAgo(escalationTime);

  return (
    <div className="mb-4 rounded-lg border-l-4 border-red-600 bg-red-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🚨</div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">
              {escalatedCalls.length} Escalated Call{escalatedCalls.length !== 1 ? 's' : ''}
            </h3>
            <p className="mt-1 text-sm text-red-800">
              {recentEscalation.customerName || 'Call'} requested live support {timeAgo}
            </p>
            <p className="mt-1 text-xs text-red-700">
              <strong>Reason:</strong> {recentEscalation.escalation?.reason || 'Customer requested escalation'}
            </p>
            {recentEscalation.escalation?.selectedManager && (
              <p className="mt-1 text-xs text-red-700">
                <strong>Manager:</strong> {recentEscalation.escalation.selectedManager.name || 'Not assigned'}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="text-red-600 hover:text-red-800 flex-shrink-0 text-xl leading-none"
        >
          ✕
        </button>
      </div>

      {escalatedCalls.length > 1 && (
        <div className="mt-3 text-xs text-red-700">
          <strong>Other escalations:</strong>
          <ul className="mt-1 space-y-1">
            {escalatedCalls.slice(1, 3).map((call) => (
              <li key={call.id}>
                • {call.customerName || 'Unknown'} - {getTimeAgo(call.escalation?.timestamp?.toDate?.() || new Date(call.escalation?.timestamp))}
              </li>
            ))}
          </ul>
          {escalatedCalls.length > 3 && (
            <p className="mt-1">+ {escalatedCalls.length - 3} more</p>
          )}
        </div>
      )}
    </div>
  );
}

function getTimeAgo(date) {
  if (!date) return 'recently';

  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
