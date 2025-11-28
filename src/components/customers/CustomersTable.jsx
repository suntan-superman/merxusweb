export default function CustomersTable({ customers, onCustomerClick }) {
  if (!customers || customers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        No customers found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Total Orders</th>
            <th className="px-4 py-3">Total Spend</th>
            <th className="px-4 py-3">Last Order</th>
            <th className="px-4 py-3">Tags</th>
          </tr>
        </thead>

        <tbody>
          {customers.map((c) => (
            <tr
              key={c.id}
              onClick={() => onCustomerClick?.(c.id)}
              className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
            >
              <td className="px-4 py-3 align-top">
                <div className="font-medium text-gray-900">{c.name || 'Unknown'}</div>
              </td>

              <td className="px-4 py-3 align-top text-xs text-gray-700">
                <div>{c.phone}</div>
                {c.email && <div className="text-xs text-gray-500">{c.email}</div>}
              </td>

              <td className="px-4 py-3 align-top text-sm text-gray-900">
                {c.totalOrders || 0}
              </td>

              <td className="px-4 py-3 align-top text-sm text-gray-900">
                ${Number(c.totalSpend || 0).toFixed(2)}
              </td>

              <td className="px-4 py-3 align-top text-xs text-gray-700">
                {c.lastOrderAt ? formatDate(c.lastOrderAt) : '—'}
              </td>

              <td className="px-4 py-3 align-top">
                <div className="flex flex-wrap gap-1">
                  {c.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                  {!c.tags?.length && (
                    <span className="text-xs text-gray-400">None</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString([], {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

