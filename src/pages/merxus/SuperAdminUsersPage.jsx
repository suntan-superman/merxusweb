import { useState, useEffect } from 'react';
import { Users, Plus, RefreshCw, Trash2, Edit } from 'lucide-react';
import { GridComponent, ColumnsDirective, ColumnDirective, Inject, Page, Sort, Filter, Toolbar, Edit as GridEdit } from '@syncfusion/ej2-react-grids';
import toast from 'react-hot-toast';
import CreateUserModal from '../../components/superAdmin/CreateUserModal';
import EditUserModal from '../../components/superAdmin/EditUserModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { getAllUsers, createUser, deleteUser, updateUser } from '../../api/superAdmin';

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [includeDisabled]);

  async function loadUsers() {
    try {
      setLoading(true);
      setError('');
      const data = await getAllUsers(includeDisabled);
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
      const errorMsg = err.response?.data?.error || 'Failed to load users';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(formData) {
    try {
      await createUser(formData);
      toast.success(`User ${formData.email} created successfully!`);
      await loadUsers();
    } catch (err) {
      throw err; // Let modal handle the error
    }
  }

  async function handleEditUser(user) {
    setSelectedUser(user);
    setShowEditModal(true);
  }

  async function handleUpdateUser(uid, updates) {
    try {
      await updateUser(uid, updates);
      toast.success('User updated successfully!');
      await loadUsers();
    } catch (err) {
      throw err; // Let modal handle the error
    }
  }

  function handleDeleteUser(uid, email) {
    setUserToDelete({ uid, email });
    setShowDeleteConfirm(true);
  }

  async function confirmDelete() {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      await deleteUser(userToDelete.uid);
      toast.success(`User ${userToDelete.email} deleted successfully!`);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      await loadUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Failed to delete user: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsDeleting(false);
    }
  }

  // Syncfusion Grid templates
  const statusTemplate = (props) => {
    if (props.disabled) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Disabled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    );
  };

  const tenantTypeTemplate = (props) => {
    const typeMap = {
      restaurant: { label: 'Restaurant', color: 'bg-blue-100 text-blue-800' },
      voice: { label: 'Voice', color: 'bg-purple-100 text-purple-800' },
      real_estate: { label: 'Real Estate', color: 'bg-orange-100 text-orange-800' },
      merxus: { label: 'Merxus Admin', color: 'bg-gray-100 text-gray-800' },
    };
    
    const type = typeMap[props.tenantType] || { label: props.tenantType || 'N/A', color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${type.color}`}>
        {type.label}
      </span>
    );
  };

  const roleTemplate = (props) => {
    return (
      <span className="text-sm font-medium text-gray-900 capitalize">
        {props.role || 'N/A'}
      </span>
    );
  };

  const tenantIdTemplate = (props) => {
    const tenantId = props.restaurantId || props.officeId || props.agentId || props.tenantId || 'N/A';
    return (
      <span className="text-xs font-mono text-gray-600" title={tenantId}>
        {tenantId.length > 20 ? `${tenantId.substring(0, 20)}...` : tenantId}
      </span>
    );
  };

  const actionsTemplate = (props) => {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleEditUser(props)}
          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Edit user"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleDeleteUser(props.uid, props.email)}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Delete user permanently"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const dateTemplate = (props) => {
    if (!props.createdAt) return 'N/A';
    return new Date(props.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary-600" />
            User Management
          </h1>
          <p className="mt-2 text-gray-600">
            Manage all users across all tenants (Restaurant, Voice, Real Estate)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create User
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Users</h3>
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Active</h3>
          <p className="text-2xl font-bold text-green-600">
            {users.filter(u => !u.disabled).length}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Disabled</h3>
          <p className="text-2xl font-bold text-red-600">
            {users.filter(u => u.disabled).length}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Super Admins</h3>
          <p className="text-2xl font-bold text-purple-600">
            {users.filter(u => u.role === 'super_admin').length}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeDisabled}
              onChange={(e) => setIncludeDisabled(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Include disabled users</span>
          </label>
        </div>
      </div>

      {/* Users Grid */}
      <div className="card">
        <GridComponent
          dataSource={users}
          allowPaging={true}
          allowSorting={true}
          allowFiltering={true}
          pageSettings={{ pageSize: 20, pageSizes: [10, 20, 50, 100] }}
          filterSettings={{ type: 'Excel' }}
          toolbar={['Search']}
          height="600"
        >
          <ColumnsDirective>
            <ColumnDirective field="email" headerText="Email" width="200" />
            <ColumnDirective field="displayName" headerText="Name" width="150" />
            <ColumnDirective
              field="disabled"
              headerText="Status"
              width="100"
              template={statusTemplate}
            />
            <ColumnDirective
              field="tenantType"
              headerText="Type"
              width="130"
              template={tenantTypeTemplate}
            />
            <ColumnDirective
              field="role"
              headerText="Role"
              width="100"
              template={roleTemplate}
            />
            <ColumnDirective
              headerText="Tenant ID"
              width="180"
              template={tenantIdTemplate}
              allowSorting={false}
            />
            <ColumnDirective field="phoneNumber" headerText="Phone" width="130" />
            <ColumnDirective
              field="createdAt"
              headerText="Created"
              width="120"
              template={dateTemplate}
            />
            <ColumnDirective
              headerText="Actions"
              width="100"
              template={actionsTemplate}
              allowSorting={false}
              allowFiltering={false}
            />
          </ColumnsDirective>
          <Inject services={[Page, Sort, Filter, Toolbar]} />
        </GridComponent>
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateUser}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        onSuccess={handleUpdateUser}
        user={selectedUser}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete User Account"
        message={`Are you sure you want to permanently delete ${userToDelete?.email}? This action cannot be undone and will remove the user from both Firebase Authentication and all associated data in Firestore.`}
        confirmText="Delete User"
        confirmVariant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
