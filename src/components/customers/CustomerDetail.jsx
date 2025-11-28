import { useEffect, useState } from 'react';
import { fetchCustomerDetail, updateCustomer } from '../../api/customers';

export default function CustomerDetail({ open, onClose, customerId }) {
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !customerId) return;

    async function loadDetail() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCustomerDetail(customerId);
        setCustomer(data);
        setEditNotes(data.notes || '');
        setEditTags(data.tags?.join(', ') || '');
      } catch (err) {
        console.error(err);
        setError('Failed to load customer details.');
      } finally {
        setLoading(false);
      }
    }

    loadDetail();
  }, [open, customerId]);

  async function handleSave() {
    if (!customer) return;
    try {
      setSaving(true);
      const updated = await updateCustomer(customer.id, {
        notes: editNotes,
        tags: editTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setCustomer((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      console.error(err);
      setError('Failed to save customer updates.');
    } finally {
      setSaving(false);
    }
  }

  if (!open || !customerId) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="fixed inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        <header className="border-b px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Customer Details</h2>
            {customer && (
              <p className="text-xs text-gray-500">
                {customer.phone}
                {customer.email ? ` • ${customer.email}` : ''}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
          {loading && (
            <p className="text-xs text-gray-500">Loading customer…</p>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}

          {!loading && customer && (
            <>
              <section>
                <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Summary</h3>
                <div className="text-sm text-gray-800">
                  <div className="font-medium text-base">{customer.name || 'Unknown'}</div>
                  <div className="mt-1 text-xs text-gray-600">
                    Total orders: {customer.totalOrders || 0}
                  </div>
                  <div className="text-xs text-gray-600">
                    Total spend: ${Number(customer.totalSpend || 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-600">
                    Last order:{' '}
                    {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : '—'}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">
                  Tags (VIP, allergies, etc.)
                </h3>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="e.g., vip, allergy_gluten"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  {customer.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                  {!customer.tags?.length && (
                    <span className="text-xs text-gray-400">No tags yet.</span>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Notes</h3>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Special preferences, incidents, VIP info…"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">
                  Recent Orders
                </h3>
                {customer.recentOrders && customer.recentOrders.length > 0 ? (
                  <div className="mt-1 space-y-2">
                    {customer.recentOrders.map((o) => (
                      <div
                        key={o.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            Order #{o.id.slice(-6)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(o.createdAt)} • {o.orderType} • {sourceLabel(o.source)}
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          ${Number(o.total || 0).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">No recent orders.</p>
                )}
              </section>
            </>
          )}
        </div>

        <footer className="border-t px-4 py-3 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </div>
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

function sourceLabel(source) {
  switch (source) {
    case 'phone_ai':
      return 'AI Phone';
    case 'online':
      return 'Online';
    case 'pos_import':
      return 'POS Import';
    default:
      return source || 'Unknown';
  }
}

