import { useEffect, useState } from 'react';
import {
  fetchMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
} from '../../api/menu';
import MenuTable from '../../components/menu/MenuTable';
import MenuItemForm from '../../components/menu/MenuItemForm';
import MenuImport from '../../components/menu/MenuImport';
import ConfirmationModal from '../../components/common/ConfirmationModal';

export default function MenuPage() {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  async function loadMenu() {
    try {
      setError(null);
      setLoading(true);
      const items = await fetchMenu();
      setMenu(items);
    } catch (err) {
      console.error(err);
      setError('Failed to load menu.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMenu();
  }, []);

  function handleAddNew() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function handleEdit(item) {
    setEditingItem(item);
    setFormOpen(true);
  }

  async function handleSave(item) {
    try {
      if (editingItem) {
        const updated = await updateMenuItem(editingItem.id, item);
        setMenu((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      } else {
        const created = await createMenuItem(item);
        setMenu((prev) => [created, ...prev]);
      }
      setFormOpen(false);
    } catch (err) {
      console.error(err);
      setError('Failed to save menu item.');
    }
  }

  function handleDelete(item) {
    setItemToDelete(item);
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!itemToDelete) return;
    try {
      await deleteMenuItem(itemToDelete.id);
      setMenu((prev) => prev.filter((m) => m.id !== itemToDelete.id));
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (err) {
      console.error(err);
      setError('Failed to delete menu item.');
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  }

  async function handleToggleAvailability(item) {
    try {
      const updated = await toggleAvailability(item.id, !item.isAvailable);
      setMenu((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) {
      console.error(err);
      setError('Failed to update availability.');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Menu Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage your menu items, prices, and availability
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="btn-secondary"
          >
            📥 Import CSV
          </button>
          <button onClick={handleAddNew} className="btn-primary">
            + Add Item
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Loading menu…</div>
      ) : (
        <MenuTable
          items={menu}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleAvailability={handleToggleAvailability}
        />
      )}

      <MenuItemForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        editing={editingItem}
      />

      {importOpen && (
        <MenuImport
          onImportComplete={loadMenu}
          onClose={() => setImportOpen(false)}
        />
      )}

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Menu Item"
        message={itemToDelete ? `Are you sure you want to delete "${itemToDelete.name}"?` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

