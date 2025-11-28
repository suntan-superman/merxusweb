export default function CallTable({ calls, onCallClick }) {
  if (!calls || calls.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        No calls to display.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">Caller</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">Duration</th>
            <th className="px-4 py-3">Importance</th>
            <th className="px-4 py-3">Summary</th>
          </tr>
        </thead>

        <tbody>
          {calls.map((c) => (
            <tr
              key={c.id}
              onClick={() => onCallClick(c)}
              className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
            >
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">
                  {c.customerName || 'Unknown'}
                </div>
                <div className="text-xs text-gray-500">{c.customerPhone}</div>
              </td>

              <td className="px-4 py-3 text-xs capitalize text-gray-700">
                {c.type}
              </td>

              <td className="px-4 py-3 text-xs text-gray-700">
                {formatTime(c.startedAt)}
              </td>

              <td className="px-4 py-3 text-xs text-gray-700">
                {Math.round(c.durationSec)}s
              </td>

              <td className="px-4 py-3">
                <span className={importanceClass(c.importance)}>
                  {c.importance}
                </span>
              </td>

              <td className="px-4 py-3 text-xs text-gray-700 max-w-md truncate">
                {c.transcriptSummary || 'No summary available'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString([], {
    dateStyle: 'short',
    timeStyle: 'short',
  });
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

