import React, { useState, useEffect } from 'react';
import { Users, Building, Home, Phone, Mail, Calendar, AlertCircle, CheckCircle, XCircle, Edit2, Trash2 } from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { toast } from 'react-toastify';
import { GridComponent, ColumnsDirective, ColumnDirective, Page, Sort, Filter, Toolbar, ExcelExport, Inject } from '@syncfusion/ej2-react-grids';
import ConfirmationModal from '../../components/common/ConfirmationModal';

export default function TenantsManagementPage() {
  const [activeTab, setActiveTab] = useState('restaurants');
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [tenantToToggle, setTenantToToggle] = useState(null);

  const tabs = [
    { id: 'restaurants', label: 'Restaurants', icon: Building, collection: 'restaurants', type: 'Restaurant' },
    { id: 'agents', label: 'Real Estate Agents', icon: Home, collection: 'agents', type: 'Real Estate' },
    { id: 'offices', label: 'Voice/Office', icon: Phone, collection: 'offices', type: 'Voice' },
  ];

  const currentTab = tabs.find(t => t.id === activeTab);

  // Load tenants when tab changes
  useEffect(() => {
    loadTenants();
  }, [activeTab]);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const collectionName = currentTab.collection;
      const tenantsRef = collection(db, collectionName);
      const snapshot = await getDocs(tenantsRef);

      const tenantsList = [];
      for (const tenantDoc of snapshot.docs) {
        const tenantData = tenantDoc.data();
        
        // Load settings from meta/settings subcollection
        let settings = {};
        try {
          const settingsDoc = await getDocs(
            query(collection(db, collectionName, tenantDoc.id, 'meta'))
          );
          if (settingsDoc.docs.length > 0) {
            settings = settingsDoc.docs[0].data();
          }
        } catch (error) {
          console.error('Error loading settings for', tenantDoc.id, error);
        }

        // Check subscription status
        let subscriptionStatus = 'Unknown';
        let trialEndsAt = null;
        try {
          const subsSnapshot = await getDocs(
            query(collection(db, 'subscriptions'), where('tenantId', '==', tenantDoc.id))
          );
          if (subsSnapshot.docs.length > 0) {
            const sub = subsSnapshot.docs[0].data();
            subscriptionStatus = sub.status || 'unknown';
            trialEndsAt = sub.trial_end;
          } else {
            subscriptionStatus = 'No Subscription';
          }
        } catch (error) {
          console.error('Error loading subscription for', tenantDoc.id, error);
        }

        tenantsList.push({
          id: tenantDoc.id,
          name: settings.name || tenantData.name || 'Unknown',
          email: settings.email || tenantData.email || 'N/A',
          phone: settings.phoneNumber || settings.twilioPhoneNumber || 'N/A',
          twilioNumber: settings.twilioPhoneNumber || 'Not Configured',
          disabled: tenantData.disabled || false,
          createdAt: tenantData.createdAt?.toDate() || new Date(),
          subscriptionStatus,
          trialEndsAt: trialEndsAt ? new Date(trialEndsAt * 1000) : null,
          type: currentTab.type,
        });
      }

      // Sort by creation date (newest first)
      tenantsList.sort((a, b) => b.createdAt - a.createdAt);
      
      setTenants(tenantsList);
      toast.success(`Loaded ${tenantsList.length} ${currentTab.type} accounts`);
    } catch (error) {
      console.error('Error loading tenants:', error);
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableTenant = (tenant) => {
    setTenantToToggle(tenant);
    setShowConfirmModal(true);
  };

  const confirmToggleTenant = async () => {
    if (!tenantToToggle) return;

    try {
      const tenantRef = doc(db, currentTab.collection, tenantToToggle.id);
      await updateDoc(tenantRef, {
        disabled: !tenantToToggle.disabled,
        disabledAt: !tenantToToggle.disabled ? new Date() : null,
        disabledBy: 'super_admin',
      });

      toast.success(`${tenantToToggle.name} ${tenantToToggle.disabled ? 'enabled' : 'disabled'} successfully`);
      setShowConfirmModal(false);
      setTenantToToggle(null);
      loadTenants(); // Reload
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast.error('Failed to update tenant');
      setShowConfirmModal(false);
      setTenantToToggle(null);
    }
  };

  const handleEditTenant = (tenant) => {
    setEditingTenant(tenant);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle, label: 'Active' },
      trialing: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: AlertCircle, label: 'Trial' },
      past_due: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: AlertCircle, label: 'Past Due' },
      canceled: { color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle, label: 'Canceled' },
      'No Subscription': { color: 'bg-gray-100 text-gray-800 border-gray-300', icon: AlertCircle, label: 'No Sub' },
      Unknown: { color: 'bg-gray-100 text-gray-600 border-gray-300', icon: AlertCircle, label: 'Unknown' },
    };

    const config = statusConfig[status] || statusConfig.Unknown;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border ${config.color}`}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  const gridTemplate = (props) => {
    return (
      <div className="flex items-center gap-2">
        {props.disabled && (
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded border border-red-300">
            DISABLED
          </span>
        )}
        {getStatusBadge(props.subscriptionStatus)}
      </div>
    );
  };

  const actionsTemplate = (props) => {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleEditTenant(props)}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Edit Tenant"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={() => handleDisableTenant(props)}
          className={`p-2 rounded-lg transition-colors ${
            props.disabled 
              ? 'text-green-600 hover:bg-green-50' 
              : 'text-red-600 hover:bg-red-50'
          }`}
          title={props.disabled ? 'Enable Account' : 'Disable Account'}
        >
          {props.disabled ? <CheckCircle size={16} /> : <XCircle size={16} />}
        </button>
      </div>
    );
  };

  const dateTemplate = (props) => {
    return props.createdAt ? props.createdAt.toLocaleDateString() : 'N/A';
  };

  const trialTemplate = (props) => {
    if (!props.trialEndsAt) return '-';
    const daysLeft = Math.ceil((props.trialEndsAt - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return 'Expired';
    return `${daysLeft} days`;
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tenant Management</h1>
        <p className="text-gray-600">Manage all customer accounts across all platforms</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 ${
                isActive
                  ? 'text-green-600 border-green-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <Icon size={20} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Accounts</p>
              <p className="text-2xl font-bold text-gray-900">{tenants.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {tenants.filter(t => !t.disabled && t.subscriptionStatus === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertCircle className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Trial</p>
              <p className="text-2xl font-bold text-gray-900">
                {tenants.filter(t => t.subscriptionStatus === 'trialing').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Disabled</p>
              <p className="text-2xl font-bold text-gray-900">
                {tenants.filter(t => t.disabled).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Grid */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <GridComponent
            dataSource={tenants}
            allowPaging={true}
            allowSorting={true}
            allowFiltering={true}
            allowExcelExport={true}
            pageSettings={{ pageSize: 25, pageSizes: [10, 25, 50, 100] }}
            filterSettings={{ type: 'Excel' }}
            toolbar={['ExcelExport', 'Search']}
            height="600"
          >
            <ColumnsDirective>
              <ColumnDirective field="name" headerText="Name" width="200" />
              <ColumnDirective field="email" headerText="Email" width="200" />
              <ColumnDirective field="phone" headerText="Phone" width="150" />
              <ColumnDirective field="twilioNumber" headerText="AI Phone #" width="150" />
              <ColumnDirective 
                headerText="Status" 
                width="180"
                template={gridTemplate}
                allowFiltering={false}
              />
              <ColumnDirective 
                field="createdAt" 
                headerText="Created" 
                width="120"
                template={dateTemplate}
              />
              <ColumnDirective 
                headerText="Trial Left" 
                width="100"
                template={trialTemplate}
                allowFiltering={false}
              />
              <ColumnDirective 
                headerText="Actions" 
                width="120"
                template={actionsTemplate}
                allowSorting={false}
                allowFiltering={false}
              />
            </ColumnsDirective>
            <Inject services={[Page, Sort, Filter, Toolbar, ExcelExport]} />
          </GridComponent>
        )}
      </div>

      {/* Edit Modal (placeholder) */}
      {editingTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Edit Tenant: {editingTenant.name}</h2>
            <p className="text-gray-600 mb-6">
              Tenant ID: <code className="bg-gray-100 px-2 py-1 rounded">{editingTenant.id}</code>
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  defaultValue={editingTenant.name}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  defaultValue={editingTenant.email}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  defaultValue={editingTenant.phone}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditingTenant(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.info('Edit functionality coming soon!');
                  setEditingTenant(null);
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setTenantToToggle(null);
        }}
        onConfirm={confirmToggleTenant}
        title={tenantToToggle?.disabled ? 'Enable Account?' : 'Disable Account?'}
        message={
          tenantToToggle?.disabled
            ? `Are you sure you want to re-enable ${tenantToToggle?.name}? They will regain access to their account.`
            : `Are you sure you want to disable ${tenantToToggle?.name}? They will no longer be able to access their account.`
        }
        confirmText={tenantToToggle?.disabled ? 'Enable' : 'Disable'}
        cancelText="Cancel"
        variant={tenantToToggle?.disabled ? 'info' : 'warning'}
      />
    </div>
  );
}
