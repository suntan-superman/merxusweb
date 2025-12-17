import { useState, useEffect } from 'react';

export default function MenuItemForm({ open, onClose, onSave, editing, availableSides = [] }) {
  const [form, setForm] = useState(
    editing || {
      name: '',
      description: '',
      price: 0,
      category: '',
      isAvailable: true,
      tags: [],
      includedSides: [],
      extraChargeSides: {},
    }
  );
  const [newUpchargeSide, setNewUpchargeSide] = useState('');
  const [newUpchargePrice, setNewUpchargePrice] = useState('');

  useEffect(() => {
    if (editing) {
      setForm(editing);
    } else {
      setForm({
        name: '',
        description: '',
        price: 0,
        category: '',
        isAvailable: true,
        tags: [],
        includedSides: [],
        extraChargeSides: {},
      });
    }
  }, [editing, open]);

  if (!open) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      ...form,
      price: Number(form.price),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="fixed inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? 'Edit Menu Item' : 'Add Menu Item'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto px-4 py-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="input-field"
                rows="3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price *
              </label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Pizza, Salads, Drinks"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma-separated)
              </label>
              <input
                name="tags"
                value={form.tags?.join(', ') || ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    tags: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  }))
                }
                className="input-field"
                placeholder="e.g., vegan, gluten-free, spicy"
              />
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, isAvailable: e.target.checked }))
                  }
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Available</span>
              </label>
            </div>

            {/* Included Sides */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Included Sides (select available options)
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-2 bg-gray-50">
                {availableSides.length > 0 ? (
                  availableSides.map((side) => (
                    <label key={side} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={form.includedSides?.includes(side) || false}
                        onChange={(e) => {
                          setForm((prev) => {
                            const sides = [...(prev.includedSides || [])];
                            if (e.target.checked) {
                              if (!sides.includes(side)) sides.push(side);
                            } else {
                              const idx = sides.indexOf(side);
                              if (idx > -1) sides.splice(idx, 1);
                            }
                            return { ...prev, includedSides: sides };
                          });
                        }}
                        className="rounded border-gray-300 text-primary-600"
                      />
                      <span className="text-sm text-gray-700">{side}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 italic">No sides available. Create sides first.</p>
                )}
              </div>
            </div>

            {/* Extra Charge Sides */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Extra Charge Sides
              </label>
              
              {/* List of extra charge sides */}
              {form.extraChargeSides && Object.keys(form.extraChargeSides).length > 0 && (
                <div className="space-y-1 mb-3 max-h-32 overflow-y-auto border rounded p-2 bg-gray-50">
                  {Object.entries(form.extraChargeSides).map(([side, price]) => (
                    <div key={side} className="flex items-center justify-between text-sm bg-white p-1 rounded">
                      <span className="text-gray-700">{side}: ${parseFloat(price).toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setForm((prev) => {
                            const updated = { ...prev.extraChargeSides };
                            delete updated[side];
                            return { ...prev, extraChargeSides: updated };
                          });
                        }}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add new extra charge side */}
              <div className="flex gap-2">
                <select
                  value={newUpchargeSide}
                  onChange={(e) => setNewUpchargeSide(e.target.value)}
                  className="input-field flex-1 text-sm"
                >
                  <option value="">Select a side...</option>
                  {availableSides.map((side) => (
                    <option key={side} value={side}>
                      {side}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Price"
                  value={newUpchargePrice}
                  onChange={(e) => setNewUpchargePrice(e.target.value)}
                  className="input-field w-20 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newUpchargeSide && newUpchargePrice) {
                      setForm((prev) => ({
                        ...prev,
                        extraChargeSides: {
                          ...prev.extraChargeSides,
                          [newUpchargeSide]: parseFloat(newUpchargePrice),
                        },
                      }));
                      setNewUpchargeSide('');
                      setNewUpchargePrice('');
                    }
                  }}
                  className="btn-primary text-sm px-3"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </form>

        <footer className="border-t px-4 py-3 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="submit"
            onClick={handleSubmit}
            className="btn-primary"
          >
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}

