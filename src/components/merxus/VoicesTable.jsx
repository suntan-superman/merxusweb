export default function VoicesTable({ voices = [], onSelect, selectedId }) {
  if (!voices || voices.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-600">No voice services found.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category/Industry
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timezone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                AI Model
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {voices.map((voice) => (
              <tr
                key={voice.id || voice.officeId}
                onClick={() => onSelect(voice)}
                className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedId === (voice.id || voice.officeId)
                    ? 'bg-primary-50'
                    : ''
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">
                    {voice.name || 'Unnamed Service'}
                  </div>
                  <div className="text-sm text-gray-500">{voice.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  <div>{voice.category || '—'}</div>
                  <div className="text-xs text-gray-500">{voice.industry || '—'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {voice.twilioPhoneNumber || voice.phoneNumber || '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {voice.timezone || 'America/Los_Angeles'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                    {voice.aiConfig?.model || 'gpt-4o-mini'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {voice.disabled ? (
                    <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                      Disabled
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-700">
                      Active
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
