import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchAllRestaurants, updateRestaurant, getRestaurant } from '../../api/merxus';
import RestaurantsTable from '../../components/merxus/RestaurantsTable';
import RestaurantDetail from '../../components/merxus/RestaurantDetail';

export default function RestaurantsPage() {
  const location = useLocation();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(false);
  const [search, setSearch] = useState('');
  const [showDisabled, setShowDisabled] = useState(false);

  async function load() {
    try {
      setError(null);
      setLoading(true);
      const data = await fetchAllRestaurants();
      setRestaurants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading restaurants:', err);
      setError(`Failed to load restaurants: ${err.message || 'Unknown error'}`);
      setRestaurants([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    
    // Check for success message from navigation
    if (location.state?.message) {
      setSuccess(location.state.message);
      setTimeout(() => setSuccess(null), 5000);
      // Clear state to prevent showing message on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  async function handleSelectRestaurant(restaurant) {
    setLoadingRestaurant(true);
    try {
      // Load full restaurant details including all settings
      const fullDetails = await getRestaurant(restaurant.id || restaurant.restaurantId);
      setSelectedRestaurant(fullDetails);
    } catch (err) {
      console.error('Error loading restaurant details:', err);
      setError('Failed to load restaurant details.');
      // Fallback to basic restaurant data
      setSelectedRestaurant(restaurant);
    } finally {
      setLoadingRestaurant(false);
    }
  }

  async function handleUpdate(restaurantId, updates) {
    try {
      setError(null);
      setSuccess(null);
      const updated = await updateRestaurant(restaurantId, updates);
      await load();
      // Reload full details for selected restaurant
      if (selectedRestaurant?.id === restaurantId) {
        const fullDetails = await getRestaurant(restaurantId);
        setSelectedRestaurant(fullDetails);
      }
      setSuccess('Restaurant updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError(`Failed to update restaurant: ${err.message || 'Unknown error'}`);
    }
  }

  const filtered = restaurants.filter((r) => {
    // Filter by disabled status
    if (!showDisabled && r.disabled) return false;
    
    // Filter by search
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.restaurantId?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Restaurants</h1>
          <p className="text-gray-600 mt-2">
            Manage all restaurant accounts and settings
          </p>
        </div>
        <div className="flex items-center space-x-4 flex-wrap gap-2">
          <input
            type="text"
            placeholder="Search restaurants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field w-64"
          />
          <label className="flex items-center space-x-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showDisabled}
              onChange={(e) => setShowDisabled(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span>Show disabled</span>
          </label>
          <a
            href="/merxus/restaurants/new"
            className="btn-primary whitespace-nowrap"
          >
            + Create Restaurant
          </a>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-primary-50 border border-primary-200 px-4 py-3 text-sm text-primary-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={selectedRestaurant ? 'lg:col-span-2' : 'lg:col-span-3'}>
          {loading ? (
            <div className="text-center py-12 text-gray-600">Loading restaurants...</div>
          ) : (
            <RestaurantsTable
              restaurants={filtered}
              onSelect={handleSelectRestaurant}
              selectedId={selectedRestaurant?.id}
            />
          )}
        </div>

        {selectedRestaurant && (
          <div className="lg:col-span-1">
            {loadingRestaurant ? (
              <div className="card text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading restaurant details...</p>
              </div>
            ) : (
              <RestaurantDetail
                restaurant={selectedRestaurant}
                onUpdate={handleUpdate}
                onClose={() => setSelectedRestaurant(null)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

