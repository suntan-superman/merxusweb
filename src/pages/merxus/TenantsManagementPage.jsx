import React, { useState, useEffect } from 'react';
import { Users, Building, Home, Phone, AlertCircle, CheckCircle, XCircle, Edit2, PauseCircle, PlayCircle, DollarSign, History } from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { toast } from 'react-toastify';
import '../../utils/syncfusionRuntime';
import { GridComponent, ColumnsDirective, ColumnDirective, Page, Sort, Filter, Toolbar, ExcelExport, Inject } from '@syncfusion/ej2-react-grids';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import SelectField from '../../components/common/SelectField';
import { pauseSubscriptionForTenant, resumeSubscriptionForTenant, createRefundForTenant, cancelSubscriptionForTenant } from '../../api/billing';

function createRefundRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `refund_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export default function TenantsManagementPage() {
  const [activeTab, setActiveTab] = useState('restaurants');
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [tenantToToggle, setTenantToToggle] = useState(null);
  const [processingActionId, setProcessingActionId] = useState(null);
  const [refundTenant, setRefundTenant] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('requested_by_customer');
  const [refundRequestId, setRefundRequestId] = useState(null);
  const [processingRefund, setProcessingRefund] = useState(false);
  const [refundHistoryTenant, setRefundHistoryTenant] = useState(null);
  const [refundHistory, setRefundHistory] = useState([]);
  const [loadingRefundHistory, setLoadingRefundHistory] = useState(false);
  const [cancelTenant, setCancelTenant] = useState(null);
  const [cancelImmediately, setCancelImmediately] = useState(false);
  const [cancelReason, setCancelReason] = useState('admin_request');
  const [processingCancel, setProcessingCancel] = useState(false);

  const tabs = [
    { id: 'restaurants', label: 'Restaurants', icon: Building, collection: 'restaurants', type: 'Restaurant' },
    { id: 'agents', label: 'Real Estate Agents', icon: Home, collection: 'agents', type: 'Real Estate' },
    { id: 'offices', label: 'Voice/Office', icon: Phone, collection: 'offices', type: 'Voice' },
  ];

  const currentTab = tabs.find(t => t.id === activeTab);

  const normalizeEditableValue = (value) => {
    if (value == null) return '';
    const trimmed = String(value).trim();
    if (!trimmed || trimmed.toUpperCase() === 'N/A') return '';
    return trimmed;
  };

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const validateE164Phone = (value) => /^\+[1-9]\d{7,14}$/.test(value);

  const getSubscriptionSortValue = (sub) => {
    const toMillis = (value) => {
      if (!value) return 0;
      if (typeof value?.toDate === 'function') return value.toDate().getTime();
      if (value?.seconds) return value.seconds * 1000;
      if (value?._seconds) return value._seconds * 1000;
      const parsed = new Date(value).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    };

    return Math.max(
      toMillis(sub?.updatedAt),
      toMillis(sub?.createdAt),
      toMillis(sub?.currentPeriodEnd),
      toMillis(sub?.trialEndsAt)
    );
  };

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
        let billingPaused = false;
        let cancelAtPeriodEnd = false;
        let stripeSubscriptionId = null;
        try {
          const subsSnapshot = await getDocs(
            query(collection(db, 'subscriptions'), where('tenantId', '==', tenantDoc.id))
          );
          if (subsSnapshot.docs.length > 0) {
            const sub = subsSnapshot.docs
              .map((docSnap) => docSnap.data() || {})
              .sort((a, b) => getSubscriptionSortValue(b) - getSubscriptionSortValue(a))[0];
            billingPaused = !!sub.billingPaused;
            cancelAtPeriodEnd = !!sub.cancelAtPeriodEnd;
            stripeSubscriptionId = sub.stripeSubscriptionId || null;
            subscriptionStatus = billingPaused
              ? 'paused'
              : (cancelAtPeriodEnd && sub.status && sub.status !== 'canceled'
                  ? 'canceling'
                  : (sub.status || 'unknown'));
            trialEndsAt = sub.trialEndsAt?.toDate?.() || null;
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
          trialEndsAt,
          billingPaused,
          cancelAtPeriodEnd,
          stripeSubscriptionId,
          noRecurringChargesOverride: !!settings.noRecurringChargesOverride,
          type: currentTab.type,
          tenantType: currentTab.id === 'offices' ? 'voice' : currentTab.id === 'agents' ? 'real_estate' : 'restaurant',
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
    setEditErrors({});
    setEditFormData({
      name: normalizeEditableValue(tenant.name),
      email: normalizeEditableValue(tenant.email),
      phoneNumber: normalizeEditableValue(tenant.phoneNumber),
      twilioPhoneNumber: normalizeEditableValue(tenant.twilioPhoneNumber),
      noRecurringChargesOverride: !!tenant.noRecurringChargesOverride,
    });
  };

  const handleSaveTenant = async () => {
    if (!editingTenant || !editFormData) return;

    const normalizedName = normalizeEditableValue(editFormData.name);
    const normalizedEmail = normalizeEditableValue(editFormData.email).toLowerCase();
    const normalizedBusinessPhone = normalizeEditableValue(editFormData.phoneNumber);
    const normalizedAiPhone = normalizeEditableValue(editFormData.twilioPhoneNumber);
    const nextErrors = {};

    if (!normalizedName) {
      nextErrors.name = 'Business name is required.';
    }

    if (!normalizedEmail) {
      nextErrors.email = 'Email is required.';
    } else if (!validateEmail(normalizedEmail)) {
      nextErrors.email = 'Enter a valid email address, for example owner@example.com.';
    }

    if (normalizedBusinessPhone && !validateE164Phone(normalizedBusinessPhone)) {
      nextErrors.phoneNumber = 'Use E.164 format, for example +16615551234.';
    }

    if (normalizedAiPhone && !validateE164Phone(normalizedAiPhone)) {
      nextErrors.twilioPhoneNumber = 'Use E.164 format, for example +16615551234.';
    }

    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Please fix the highlighted tenant details before saving.');
      return;
    }

    setSavingEdit(true);
    try {
      const collectionName = currentTab.collection;
      
      // Update meta/settings document - save both phone fields consistently
      const settingsRef = doc(db, collectionName, editingTenant.id, 'meta', 'settings');
      const updateObj = {
        name: normalizedName,
        email: normalizedEmail,
        noRecurringChargesOverride: editFormData.noRecurringChargesOverride === true,
      };
      
      // Save both phone fields for all tenant types consistently
      updateObj.phoneNumber = normalizedBusinessPhone || '';
      updateObj.twilioPhoneNumber = normalizedAiPhone || '';
      
      await updateDoc(settingsRef, updateObj);

      const shouldDisableRecurringCharges =
        editFormData.noRecurringChargesOverride === true &&
        editingTenant.subscriptionStatus &&
        editingTenant.subscriptionStatus !== 'No Subscription' &&
        editingTenant.subscriptionStatus !== 'canceled' &&
        !editingTenant.cancelAtPeriodEnd;

      if (shouldDisableRecurringCharges) {
        await cancelSubscriptionForTenant({
          tenantId: editingTenant.id,
          tenantType: editingTenant.tenantType,
          reason: 'admin_test_override',
        });
      }

      // Update local state to reflect changes
      const updatedTenants = tenants.map(t => 
        t.id === editingTenant.id 
          ? { 
              ...t, 
              name: normalizedName, 
              email: normalizedEmail, 
              phoneNumber: normalizedBusinessPhone || 'N/A',
              twilioPhoneNumber: normalizedAiPhone || 'N/A',
              phone: normalizedAiPhone || normalizedBusinessPhone || 'N/A',
              noRecurringChargesOverride: editFormData.noRecurringChargesOverride === true,
              cancelAtPeriodEnd: shouldDisableRecurringCharges ? true : t.cancelAtPeriodEnd,
              subscriptionStatus:
                shouldDisableRecurringCharges && t.subscriptionStatus !== 'canceled'
                  ? 'canceling'
                  : t.subscriptionStatus,
            }
          : t
      );
      setTenants(updatedTenants);

      toast.success(
        shouldDisableRecurringCharges
          ? 'Tenant updated and recurring charges were disabled for future renewals.'
          : 'Tenant updated successfully!'
      );
      setEditingTenant(null);
      setEditFormData({});
      setEditErrors({});
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
      active: { color: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/35 dark:text-green-200 dark:border-green-500/50', icon: CheckCircle, label: 'Active' },
      trialing: { color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/35 dark:text-blue-200 dark:border-blue-500/50', icon: AlertCircle, label: 'Trial' },
      past_due: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/35 dark:text-yellow-200 dark:border-yellow-500/50', icon: AlertCircle, label: 'Past Due' },
      paused: { color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/35 dark:text-orange-200 dark:border-orange-500/50', icon: PauseCircle, label: 'Paused' },
      canceling: { color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/35 dark:text-amber-200 dark:border-amber-500/50', icon: AlertCircle, label: 'Ending' },
      canceled: { color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/35 dark:text-red-200 dark:border-red-500/50', icon: XCircle, label: 'Canceled' },
      'No Subscription': { color: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600', icon: AlertCircle, label: 'No Sub' },
      Unknown: { color: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600', icon: AlertCircle, label: 'Unknown' },
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
          <span className="rounded border border-red-300 bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 dark:border-red-500/50 dark:bg-red-900/35 dark:text-red-200">
            DISABLED
          </span>
        )}
        {getStatusBadge(props.subscriptionStatus)}
        {props.noRecurringChargesOverride && (
          <span className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/50 dark:bg-indigo-900/35 dark:text-indigo-200">
            No Renew
          </span>
        )}
      </div>
    );
  };

  const actionsTemplate = (props) => {
    const isPaused = props.billingPaused || props.subscriptionStatus === 'paused';
    const cancelableStatuses = ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'];
    const hasSubscription = cancelableStatuses.includes(String(props.subscriptionStatus || '').toLowerCase());
    const canCancel = hasSubscription && !props.cancelAtPeriodEnd;
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleEditTenant(props)}
          className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/30"
          title="Edit Tenant"
        >
          <Edit2 size={16} />
        </button>
        {hasSubscription && (
          <button
            onClick={() => (isPaused ? handleResumeBilling(props) : handlePauseBilling(props))}
            disabled={processingActionId === props.id}
            className={`p-2 rounded-lg transition-colors ${
              isPaused
                ? 'text-green-600 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-900/30'
                : 'text-orange-600 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-900/30'
            } ${processingActionId === props.id ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isPaused ? 'Resume Billing' : 'Pause Billing'}
          >
            {isPaused ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
          </button>
        )}
        {hasSubscription && (
          <button
            onClick={() => {
              setRefundTenant(props);
              setRefundAmount('');
              setRefundReason('requested_by_customer');
              setRefundRequestId(createRefundRequestId());
            }}
            className="rounded-lg p-2 text-purple-600 transition-colors hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-900/30"
            title="Issue Refund"
          >
            <DollarSign size={16} />
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => {
              setCancelTenant(props);
              setCancelImmediately(false);
              setCancelReason('admin_request');
            }}
            className="rounded-lg p-2 text-red-700 transition-colors hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/30"
            title="Cancel Subscription"
          >
            <XCircle size={16} />
          </button>
        )}
        {hasSubscription && (
          <button
            onClick={() => handleViewRefundHistory(props)}
            className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
            title="View Refund History"
          >
            <History size={16} />
          </button>
        )}
        <button
          onClick={() => handleDisableTenant(props)}
          className={`p-2 rounded-lg transition-colors ${
            props.disabled 
              ? 'text-green-600 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-900/30' 
              : 'text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/30'
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

  const noRecurringTemplate = (props) => {
    return props.noRecurringChargesOverride ? (
      <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/50 dark:bg-indigo-900/35 dark:text-indigo-200">
        Enabled
      </span>
    ) : (
      <span className="text-xs text-gray-400 dark:text-slate-500">-</span>
    );
  };

  const handlePauseBilling = async (tenant) => {
    if (!tenant?.id || !tenant?.tenantType) return;
    setProcessingActionId(tenant.id);
    try {
      await pauseSubscriptionForTenant({
        tenantId: tenant.id,
        tenantType: tenant.tenantType,
        reason: 'non_payment',
      });
      toast.success('Billing paused');
      loadTenants();
    } catch (error) {
      console.error('Error pausing billing:', error);
      toast.error('Failed to pause billing');
    } finally {
      setProcessingActionId(null);
    }
  };

  const handleResumeBilling = async (tenant) => {
    if (!tenant?.id || !tenant?.tenantType) return;
    setProcessingActionId(tenant.id);
    try {
      await resumeSubscriptionForTenant({
        tenantId: tenant.id,
        tenantType: tenant.tenantType,
      });
      toast.success('Billing resumed');
      loadTenants();
    } catch (error) {
      console.error('Error resuming billing:', error);
      toast.error('Failed to resume billing');
    } finally {
      setProcessingActionId(null);
    }
  };

  const handleSubmitRefund = async () => {
    if (!refundTenant) return;
    const parsed = Number.parseFloat(refundAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error('Enter a valid refund amount');
      return;
    }
    const amountCents = Math.round(parsed * 100);
    setProcessingRefund(true);
    try {
      await createRefundForTenant({
        tenantId: refundTenant.id,
        tenantType: refundTenant.tenantType,
        stripeSubscriptionId: refundTenant.stripeSubscriptionId || undefined,
        amountCents,
        reason: refundReason,
        requestId: refundRequestId || createRefundRequestId(),
      });
      toast.success('Refund issued');
      setRefundTenant(null);
      setRefundAmount('');
      setRefundReason('requested_by_customer');
      setRefundRequestId(null);
      loadTenants();
    } catch (error) {
      console.error('Error issuing refund:', error);
      toast.error(
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Failed to issue refund'
      );
    } finally {
      setProcessingRefund(false);
    }
  };

  const handleSubmitCancelSubscription = async () => {
    if (!cancelTenant?.id || !cancelTenant?.tenantType) return;

    setProcessingCancel(true);
    try {
      const result = await cancelSubscriptionForTenant({
        tenantId: cancelTenant.id,
        tenantType: cancelTenant.tenantType,
        stripeSubscriptionId: cancelTenant.stripeSubscriptionId || undefined,
        cancelImmediately,
        reason: cancelReason.trim() || 'admin_request',
      });
      setTenants((prev) =>
        prev.map((tenant) =>
          tenant.id === cancelTenant.id
            ? {
                ...tenant,
                cancelAtPeriodEnd: !!result?.cancelAtPeriodEnd,
                subscriptionStatus: cancelImmediately || result?.status === 'canceled' ? 'canceled' : 'canceling',
              }
            : tenant
        )
      );
      toast.success(
        cancelImmediately
          ? 'Subscription canceled immediately'
          : 'Subscription will cancel at period end'
      );
      setCancelTenant(null);
      setCancelImmediately(false);
      setCancelReason('admin_request');
      loadTenants();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error(error?.response?.data?.error || 'Failed to cancel subscription');
    } finally {
      setProcessingCancel(false);
    }
  };

  const handleViewRefundHistory = async (tenant) => {
    setRefundHistoryTenant(tenant);
    setLoadingRefundHistory(true);
    setRefundHistory([]);
    try {
      let refundsSnapshot;
      try {
        refundsSnapshot = await getDocs(
          query(
            collection(db, 'billingRefunds'),
            where('tenantId', '==', tenant.id),
            orderBy('createdAt', 'desc'),
            limit(25)
          )
        );
      } catch (indexError) {
        refundsSnapshot = await getDocs(
          query(
            collection(db, 'billingRefunds'),
            where('tenantId', '==', tenant.id)
          )
        );
      }

      const refunds = refundsSnapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));

      setRefundHistory(refunds);
    } catch (error) {
      console.error('Error loading refund history:', error);
      toast.error('Failed to load refund history');
    } finally {
      setLoadingRefundHistory(false);
    }
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
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-slate-100">Tenant Management</h1>
        <p className="text-gray-600 dark:text-slate-300">Manage all customer accounts across all platforms</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-200 dark:border-slate-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 ${
                isActive
                  ? 'text-green-600 border-green-600 dark:border-green-400 dark:text-green-300'
                  : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-100'
              }`}
            >
              <Icon size={20} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-300">Total Accounts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{tenants.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-300">Active</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {tenants.filter(t => !t.disabled && t.subscriptionStatus === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertCircle className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-300">Trial</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {tenants.filter(t => t.subscriptionStatus === 'trialing').length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <PauseCircle className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-300">Paused</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {tenants.filter(t => t.subscriptionStatus === 'paused' || t.billingPaused).length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-300">Disabled</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {tenants.filter(t => t.disabled).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Grid */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
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
                field="noRecurringChargesOverride"
                headerText="No Renew"
                width="110"
                template={noRecurringTemplate}
                headerTemplate={headerTemplate}
                allowFiltering={false}
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
                width="170"
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
          <div className="mx-4 w-full max-w-2xl rounded-lg bg-white p-6 dark:bg-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Edit Tenant: {editingTenant.name}</h2>
              <button
                onClick={() => {
                  setEditingTenant(null);
                  setEditFormData({});
                  setEditErrors({});
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-200"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mb-6 text-gray-600 dark:text-slate-300">
              Tenant ID: <code className="rounded bg-gray-100 px-2 py-1 dark:bg-slate-800 dark:text-slate-100">{editingTenant.id}</code>
            </p>
            
            <div className="mb-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  Business Name
                </label>
                <input
                  type="text"
                  value={editFormData.name || ''}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, name: e.target.value });
                    if (editErrors.name) setEditErrors((current) => ({ ...current, name: '' }));
                  }}
                  className={`w-full rounded-lg border px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 ${
                    editErrors.name ? 'border-red-400 bg-red-50 dark:border-red-500/50 dark:bg-red-900/30' : 'border-gray-300 dark:border-slate-600'
                  }`}
                />
                {editErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{editErrors.name}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  Email
                </label>
                <input
                  type="email"
                  value={editFormData.email || ''}
                  placeholder="owner@example.com"
                  autoComplete="email"
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, email: e.target.value });
                    if (editErrors.email) setEditErrors((current) => ({ ...current, email: '' }));
                  }}
                  className={`w-full rounded-lg border px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 ${
                    editErrors.email ? 'border-red-400 bg-red-50 dark:border-red-500/50 dark:bg-red-900/30' : 'border-gray-300 dark:border-slate-600'
                  }`}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Expected format: owner@example.com
                </p>
                {editErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{editErrors.email}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  Business Phone Number
                </label>
                <input
                  type="tel"
                  value={editFormData.phoneNumber || ''}
                  inputMode="tel"
                  placeholder="+16615551234"
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, phoneNumber: e.target.value });
                    if (editErrors.phoneNumber) setEditErrors((current) => ({ ...current, phoneNumber: '' }));
                  }}
                  className={`w-full rounded-lg border px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 ${
                    editErrors.phoneNumber ? 'border-red-400 bg-red-50 dark:border-red-500/50 dark:bg-red-900/30' : 'border-gray-300 dark:border-slate-600'
                  }`}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Main contact number for the business. Expected format: +16615551234
                </p>
                {editErrors.phoneNumber && (
                  <p className="mt-1 text-xs text-red-600">{editErrors.phoneNumber}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  AI Assistant Phone (Twilio)
                </label>
                <input
                  type="tel"
                  value={editFormData.twilioPhoneNumber || ''}
                  inputMode="tel"
                  placeholder="+16615551234"
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, twilioPhoneNumber: e.target.value });
                    if (editErrors.twilioPhoneNumber) setEditErrors((current) => ({ ...current, twilioPhoneNumber: '' }));
                  }}
                  className={`w-full rounded-lg border px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 ${
                    editErrors.twilioPhoneNumber ? 'border-red-400 bg-red-50 dark:border-red-500/50 dark:bg-red-900/30' : 'border-gray-300 dark:border-slate-600'
                  }`}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Phone number used for AI Assistant calls and voice interactions. Expected format: +16615551234
                </p>
                {editErrors.twilioPhoneNumber && (
                  <p className="mt-1 text-xs text-red-600">{editErrors.twilioPhoneNumber}</p>
                )}
              </div>

              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-500/50 dark:bg-indigo-900/30">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={editFormData.noRecurringChargesOverride === true}
                    onChange={(e) => {
                      setEditFormData({
                        ...editFormData,
                        noRecurringChargesOverride: e.target.checked,
                      });
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-900"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      No recurring charges override
                    </div>
                    <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">
                      Intended for internal admin and testing tenants. If this tenant already has an active Stripe
                      subscription, saving with this enabled will stop future renewals at the end of the current billing
                      period.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditingTenant(null);
                  setEditFormData({});
                  setEditErrors({});
                }}
                className="flex-1 rounded-lg bg-gray-200 px-4 py-2 text-gray-800 transition-colors hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
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

      {/* Cancel Subscription Modal */}
      {cancelTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-xl rounded-lg bg-white p-6 dark:bg-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Cancel Subscription</h2>
              <button
                onClick={() => {
                  setCancelTenant(null);
                  setCancelImmediately(false);
                  setCancelReason('admin_request');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-200"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <p className="font-medium text-red-900">{cancelTenant.name}</p>
                <p className="mt-1 text-sm text-red-800">
                  This will cancel the tenant&apos;s Stripe subscription.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  Cancellation Reason
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-red-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
                  placeholder="admin_request"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={cancelImmediately}
                  onChange={(e) => setCancelImmediately(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">Cancel immediately</p>
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    Leave this unchecked to stop renewal only at the end of the current billing period.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setCancelTenant(null);
                  setCancelImmediately(false);
                  setCancelReason('admin_request');
                }}
                className="flex-1 rounded-lg bg-gray-200 px-4 py-2 text-gray-800 transition-colors hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              >
                Close
              </button>
              <button
                onClick={handleSubmitCancelSubscription}
                disabled={processingCancel}
                className="flex-1 px-4 py-2 text-white transition-colors bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {processingCancel
                  ? 'Canceling...'
                  : (cancelImmediately ? 'Cancel Immediately' : 'End at Period End')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-xl rounded-lg bg-white p-6 dark:bg-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Issue Refund</h2>
              <button
                onClick={() => {
                  setRefundTenant(null);
                  setRefundAmount('');
                  setRefundReason('requested_by_customer');
                  setRefundRequestId(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-200"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mb-6 text-gray-600 dark:text-slate-300">
              Tenant: <span className="font-semibold">{refundTenant.name}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">Amount (USD)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => {
                    setRefundAmount(e.target.value);
                    setRefundRequestId(createRefundRequestId());
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
                  placeholder="0.00"
                />
              </div>
              <SelectField
                label="Reason"
                value={refundReason}
                onChange={(value) => {
                  setRefundReason(value);
                  setRefundRequestId(createRefundRequestId());
                }}
                options={[
                  { value: 'requested_by_customer', label: 'Requested by customer' },
                  { value: 'duplicate', label: 'Duplicate' },
                  { value: 'fraudulent', label: 'Fraudulent' },
                ]}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setRefundTenant(null);
                  setRefundAmount('');
                  setRefundReason('requested_by_customer');
                  setRefundRequestId(null);
                }}
                className="flex-1 rounded-lg bg-gray-200 px-4 py-2 text-gray-800 transition-colors hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRefund}
                disabled={processingRefund}
                className="flex-1 px-4 py-2 text-white transition-colors bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {processingRefund ? 'Processing...' : 'Issue Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund History Modal */}
      {refundHistoryTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-3xl rounded-lg bg-white p-6 dark:bg-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Refund History</h2>
              <button
                onClick={() => {
                  setRefundHistoryTenant(null);
                  setRefundHistory([]);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-200"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mb-4 text-gray-600 dark:text-slate-300">
              Tenant: <span className="font-semibold">{refundHistoryTenant.name}</span>
            </p>

            {loadingRefundHistory ? (
              <div className="py-8 text-center text-gray-500 dark:text-slate-400">Loading refunds...</div>
            ) : refundHistory.length === 0 ? (
              <div className="py-8 text-center text-gray-500 dark:text-slate-400">No refunds found.</div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto">
                {refundHistory.map((refund) => {
                  const createdAt = refund.createdAt?.toDate?.() || null;
                  const amount = (refund.amountCents || 0) / 100;
                  return (
                    <div key={refund.id} className="rounded-lg border border-gray-200 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-slate-100">${amount.toFixed(2)}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {createdAt ? createdAt.toLocaleString() : 'Unknown date'}
                          </p>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-purple-100 text-purple-700">
                          {refund.reason || 'requested_by_customer'}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500 dark:text-slate-400 space-y-1">
                        <div>Refund ID: {refund.stripeRefundId || '—'}</div>
                        <div>Invoice ID: {refund.stripeInvoiceId || '—'}</div>
                        <div>Payment Intent: {refund.stripePaymentIntentId || '—'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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


