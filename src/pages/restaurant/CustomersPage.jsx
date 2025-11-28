import { useEffect, useState } from 'react';
import { fetchCustomers } from '../../api/customers';
import CustomersTable from '../../components/customers/CustomersTable';
import CustomerDetail from '../../components/customers/CustomerDetail';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  async function loadCustomers() {
    try {
      setError(null);
      setLoading(true);
      const data = await fetchCustomers({
        limit: 200,
        search: search || undefined,
      });
      setCustomers(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function handleSearchSubmit(e) {
    e.preventDefault();
    await loadCustomers();
  }

  function openCustomer(customerId) {
    setSelectedCustomerId(customerId);
    setDetailOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
          <p className="text-sm text-gray-600 mt-1">
            View guest history, contact details, and order patterns
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-52 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            className="btn-primary"
          >
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Loading customers…</div>
      ) : (
        <CustomersTable customers={customers} onCustomerClick={openCustomer} />
      )}

      <CustomerDetail
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        customerId={selectedCustomerId}
      />
    </div>
  );
}

