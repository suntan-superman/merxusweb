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
  const [editFormData, setEditFormData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
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
            console.log(`[TenantsManagement] ${tenantDoc.id} - Found subscription with status: "${subscriptionStatus}"`);
          } else {
            subscriptionStatus = 'No Subscription';
            console.log(`[TenantsManagement] ${tenantDoc.id} - No subscription found`);
          }
        } catch (error) {
          console.error('Error loading subscription for', tenantDoc.id, error);
        }

        // Store both phone fields consistently for all tenant types
        tenantsList.push({
          id: tenantDoc.id,
          name: settings.name || tenantData.name || 'Unknown',
          email: settings.email || tenantData.email || 'N/A',
          // Always use twilioPhoneNumber for the primary display phone
          phone: settings.twilioPhoneNumber || settings.phoneNumber || 'N/A',
          phoneNumber: settings.phoneNumber || 'N/A', // Business phone
          twilioPhoneNumber: settings.twilioPhoneNumber || 'N/A', // AI phone
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

  const handleEditTenant = (tenant) => {
    setEditingTenant(tenant);
    setEditFormData({
      name: tenant.name,
      email: tenant.email,
      phoneNumber: tenant.phoneNumber,
      twilioPhoneNumber: tenant.twilioPhoneNumber,
    });
  };

  const handleSaveTenant = async () => {
    if (!editingTenant || !editFormData) return;

    setSavingEdit(true);
    try {
      const collectionName = currentTab.collection;
      
      // Update meta/settings document - save both phone fields consistently
      const settingsRef = doc(db, collectionName, editingTenant.id, 'meta', 'settings');
      const updateObj = {
        name: editFormData.name,
        email: editFormData.email,
      };
      
      // Save both phone fields for all tenant types consistently
      if (editFormData.phoneNumber && editFormData.phoneNumber !== 'N/A') {
        updateObj.phoneNumber = editFormData.phoneNumber;
      }
      if (editFormData.twilioPhoneNumber && editFormData.twilioPhoneNumber !== 'N/A') {
        updateObj.twilioPhoneNumber = editFormData.twilioPhoneNumber;
      }
      
      await updateDoc(settingsRef, updateObj);

      // Update local state to reflect changes
      const updatedTenants = tenants.map(t => 
        t.id === editingTenant.id 
          ? { 
              ...t, 
              name: editFormData.name, 
              email: editFormData.email, 
              phoneNumber: editFormData.phoneNumber,
              twilioPhoneNumber: editFormData.twilioPhoneNumber,
              phone: editFormData.twilioPhoneNumber || editFormData.phoneNumber // Display Twilio if available, else business phone
            }
          : t
      );
      setTenants(updatedTenants);

      toast.success('Tenant updated successfully!');
      setEditingTenant(null);
      setEditFormData({});
    } catch (error) {
      console.error('Error saving tenant:', error);
      toast.error('Failed to save tenant changes');
    } finally {
      setSavingEdit(false);
    }
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
          <span className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 border border-red-300 rounded">
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
          className="p-2 text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
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

  const headerTemplate = (props) => (
    <div style={{ fontSize: '12px', fontWeight: 'bold', padding: '12px 8px' }}>
      {props.headerText}
    </div>
  );

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Tenant Management</h1>
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
      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
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

        <div className="p-4 bg-white border border-gray-200 rounded-lg">
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

        <div className="p-4 bg-white border border-gray-200 rounded-lg">
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

        <div className="p-4 bg-white border border-gray-200 rounded-lg">
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
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-b-2 border-green-600 rounded-full animate-spin"></div>
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
              <ColumnDirective field="name" headerText="Name" width="200" headerTemplate={headerTemplate}/>
              <ColumnDirective field="email" headerText="Email" width="200" headerTemplate={headerTemplate} />
              <ColumnDirective field="phoneNumber" headerText="Business Phone" width="150" headerTemplate={headerTemplate}/>
              <ColumnDirective field="twilioPhoneNumber" headerText="AI Assistant Phone" width="160" headerTemplate={headerTemplate}/>
              <ColumnDirective 
                headerText="Status" 
                width="160"
                headerTemplate={headerTemplate}
                template={gridTemplate}
                allowFiltering={false}
              />
              <ColumnDirective 
                field="createdAt" 
                width="120"
                headerTemplate={headerTemplate}
                headerText="Created" 
                template={dateTemplate}
              />
              <ColumnDirective 
                headerText="Trial Left" 
                width="100"
                template={trialTemplate}
                headerTemplate={headerTemplate}
                allowFiltering={false}
              />
              <ColumnDirective 
                headerText="Actions" 
                width="120"
                headerTemplate={headerTemplate}
                template={actionsTemplate}
                allowSorting={false}
                allowFiltering={false}
              />
            </ColumnsDirective>
            <Inject services={[Page, Sort, Filter, Toolbar, ExcelExport]} />
          </GridComponent>
        )}
      </div>

      {/* Edit Modal */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl p-6 mx-4 bg-white rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Edit Tenant: {editingTenant.name}</h2>
              <button
                onClick={() => {
                  setEditingTenant(null);
                  setEditFormData({});
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mb-6 text-gray-600">
              Tenant ID: <code className="px-2 py-1 bg-gray-100 rounded">{editingTenant.id}</code>
            </p>
            
            <div className="mb-6 space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Business Name
                </label>
                <input
                  type="text"
                  value={editFormData.name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={editFormData.email || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Business Phone Number
                </label>
                <input
                  type="tel"
                  value={editFormData.phoneNumber || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Main contact number for the business
                </p>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  AI Assistant Phone (Twilio)
                </label>
                <input
                  type="tel"
                  value={editFormData.twilioPhoneNumber || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, twilioPhoneNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Phone number used for AI Assistant calls and voice interactions
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditingTenant(null);
                  setEditFormData({});
                }}
                className="flex-1 px-4 py-2 text-gray-800 transition-colors bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTenant}
                disabled={savingEdit}
                className="flex-1 px-4 py-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
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
