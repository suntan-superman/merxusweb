export default function MenuTable({
  items,
  onEdit,
  onDelete,
  onToggleAvailability,
}) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        No menu items found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Availability</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b last:border-b-0 hover:bg-gray-50"
            >
              <td className="px-4 py-3 align-top">
                <div className="font-medium text-gray-900">{item.name}</div>
                {item.description && (
                  <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                )}
              </td>

              <td className="px-4 py-3 align-top text-xs text-gray-700">
                {item.category}
              </td>

              <td className="px-4 py-3 align-top text-sm text-gray-900 font-medium">
                ${item.price.toFixed(2)}
              </td>

              <td className="px-4 py-3 align-top text-xs">
                <button
                  className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                    item.isAvailable
                      ? 'bg-primary-100 text-primary-800 hover:bg-primary-200'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}
                  onClick={() => onToggleAvailability(item)}
                >
                  {item.isAvailable ? 'Available' : 'Out of Stock'}
                </button>
              </td>

              <td className="px-4 py-3 align-top text-right">
                <button
                  onClick={() => onEdit(item)}
                  className="text-xs text-primary-600 hover:text-primary-700 hover:underline mr-3"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(item)}
                  className="text-xs text-red-600 hover:text-red-700 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

