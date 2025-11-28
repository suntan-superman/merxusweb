export default function RestaurantsTable({ restaurants = [], onSelect, selectedId }) {
  if (!restaurants || restaurants.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-600">No restaurants found.</p>
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
                Restaurant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Orders
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {restaurants.map((restaurant) => (
              <tr
                key={restaurant.id || restaurant.restaurantId}
                onClick={() => onSelect(restaurant)}
                className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedId === (restaurant.id || restaurant.restaurantId)
                    ? 'bg-primary-50'
                    : ''
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">
                    {restaurant.name || 'Unnamed Restaurant'}
                  </div>
                  <div className="text-sm text-gray-500">{restaurant.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {restaurant.restaurantId || restaurant.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {restaurant.disabled ? (
                    <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                      Disabled
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-700">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {restaurant.totalOrders || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {restaurant.createdAt
                    ? (() => {
                        try {
                          const date = new Date(restaurant.createdAt);
                          return isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
                        } catch {
                          return '—';
                        }
                      })()
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

