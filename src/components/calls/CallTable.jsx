export default function CallTable({ calls, onCallClick }) {
  if (!calls || calls.length === 0) {
    return (
      <div className="px-4 py-6 text-sm text-center text-gray-500 border border-gray-200 border-dashed rounded-lg bg-gray-50">
        No calls to display.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white border rounded-lg">
      <table className="min-w-full text-sm text-left">
        <thead className="text-sm text-gray-500 uppercase border-b bg-gray-50">
          <tr>
            <th className="px-4 py-3">Caller</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">Duration</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Importance</th>
            <th className="px-4 py-3">Speech</th>
            <th className="px-4 py-3">Summary</th>
          </tr>
        </thead>

        <tbody>
          {calls.map((c) => (
            <tr
              key={c.id}
              onClick={() => onCallClick(c)}
              className="border-b cursor-pointer last:border-b-0 hover:bg-gray-50"
            >
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">
                  {c.parsedOrder?.name || c.customerName || 'Unknown'}
                </div>
                <div className="text-xs text-gray-500">{formatPhone(c.from || c.customerPhone)}</div>
              </td>

              <td className="px-4 py-3 text-xs text-gray-700 capitalize">
                {c.callType || c.type || 'call'}
              </td>

              <td className="px-4 py-3 text-xs text-gray-700">
                {formatTime(c.endedAt || c.startedAt)}
              </td>

              <td className="px-4 py-3 text-xs text-gray-700">
                {c.durationSec ? Math.round(c.durationSec) + 's' : '-'}
              </td>

              <td className="px-4 py-3">
                {c.escalation?.triggered ? (
                  <span className="inline-flex items-center rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-medium gap-1">
                    🚨 Escalated
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-medium">
                    Handled
                  </span>
                )}
              </td>

              <td className="px-4 py-3">
                <span className={importanceClass(c.importance)}>
                  {c.importance}
                </span>
              </td>

              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <span className={speechClass(c)}>
                    {speechLabel(c)}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {speechDetail(c)}
                  </span>
                </div>
              </td>

              <td className="max-w-md px-4 py-3 text-xs text-gray-700 truncate">
                {c.transcriptSummary || 'No summary available'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  // Handle Firestore Timestamp objects
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString([], {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function formatPhone(phone) {
  if (!phone) return '';
  // Remove +1 prefix if present
  const cleaned = phone.replace(/^\+1/, '');
  return cleaned;
}

function importanceClass(level) {
  switch (level) {
    case 'critical':
      return 'inline-flex items-center rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-medium';
    case 'high':
      return 'inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium';
    default:
      return 'inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-xs font-medium';
  }
}

function speechLabel(call) {
  const speech = call?.speechSession;
  if (!speech) return '—';
  if (speech.fallbackTriggered) return 'Fallback';
  if (speech.healthGated) return 'Health Gate';
  if (speech.effectiveStrategy === 'standard') return 'Standard';
  return 'Realtime';
}

function speechDetail(call) {
  const speech = call?.speechSession;
  if (!speech) return 'No telemetry';
  return speech.fallbackReason || speech.healthGateReason || speech.effectiveProvider || speech.realtimeProvider || 'Active';
}

function speechClass(call) {
  const speech = call?.speechSession;
  if (!speech) {
    return 'inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs font-medium';
  }
  if (speech.fallbackTriggered) {
    return 'inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium';
  }
  if (speech.healthGated) {
    return 'inline-flex items-center rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-medium';
  }
  if (speech.effectiveStrategy === 'standard') {
    return 'inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-medium';
  }
  return 'inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-medium';
}

