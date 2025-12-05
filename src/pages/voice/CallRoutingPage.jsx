import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getRoutingRules, createRoutingRule, updateRoutingRule, deleteRoutingRule } from '../../api/voice';
import LoadingSpinner from '../../components/LoadingSpinner';
import RoutingRuleModal from '../../components/voice/RoutingRuleModal';
import { toast } from 'react-toastify';
import { Clock, Phone, MessageSquare, Shield, Trash2, Edit, Plus, ChevronRight } from 'lucide-react';

export default function CallRoutingPage() {
  const { officeId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [routingRules, setRoutingRules] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  useEffect(() => {
    if (officeId) {
      loadRoutingRules();
    }
  }, [officeId]);

  async function loadRoutingRules() {
    try {
      setLoading(true);
      const data = await getRoutingRules();
      setRoutingRules(data);
    } catch (error) {
      console.error('Error loading routing rules:', error);
      toast.error('Failed to load routing rules');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRule(ruleData) {
    try {
      setSaving(true);
      if (editingRule) {
        await updateRoutingRule(editingRule.id, ruleData);
        toast.success('Routing rule updated successfully');
      } else {
        await createRoutingRule(ruleData);
        toast.success('Routing rule created successfully');
      }
      await loadRoutingRules();
      setShowModal(false);
      setEditingRule(null);
    } catch (error) {
      console.error('Error saving routing rule:', error);
      toast.error('Failed to save routing rule');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRule(ruleId) {
    if (!window.confirm('Are you sure you want to delete this routing rule?')) {
      return;
    }

    try {
      await deleteRoutingRule(ruleId);
      toast.success('Routing rule deleted successfully');
      await loadRoutingRules();
    } catch (error) {
      console.error('Error deleting routing rule:', error);
      toast.error('Failed to delete routing rule');
    }
  }

  async function handleToggleEnabled(rule) {
    try {
      await updateRoutingRule(rule.id, { enabled: !rule.enabled });
      toast.success(rule.enabled ? 'Rule disabled' : 'Rule enabled');
      await loadRoutingRules();
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast.error('Failed to update rule');
    }
  }

  function openCreateModal() {
    setEditingRule(null);
    setShowModal(true);
  }

  function openEditModal(rule) {
    setEditingRule(rule);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingRule(null);
  }

  function getActionIcon(actionType) {
    switch (actionType) {
      case 'transfer':
        return <Phone size={16} className="text-green-600" />;
      case 'voicemail':
        return <MessageSquare size={16} className="text-blue-600" />;
      case 'message':
        return <MessageSquare size={16} className="text-purple-600" />;
      case 'department':
        return <Shield size={16} className="text-orange-600" />;
      default:
        return <ChevronRight size={16} className="text-gray-600" />;
    }
  }

  function getActionLabel(action) {
    switch (action.type) {
      case 'transfer':
        return `Transfer to ${action.transferNumber}`;
      case 'voicemail':
        return 'Send to Voicemail';
      case 'message':
        return 'Play Custom Message';
      case 'department':
        return `Route to ${action.department}`;
      default:
        return 'Unknown Action';
    }
  }

  function getConditionsLabel(conditions) {
    const parts = [];
    
    if (conditions.timeType && conditions.timeType !== 'all') {
      parts.push(conditions.timeType.replace('_', ' '));
    }
    
    if (conditions.intents?.length > 0) {
      parts.push(`Intents: ${conditions.intents.join(', ')}`);
    }
    
    if (conditions.callerIds?.length > 0) {
      parts.push(`${conditions.callerIds.length} caller(s)`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'All calls';
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Call Routing</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure how calls are routed based on time, intent, and caller
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          Add Routing Rule
        </button>
      </div>

      {routingRules.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔄</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Routing Rules
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Create routing rules to automatically direct calls to the right person or department based on time, intent, or caller ID
            </p>
            <button onClick={openCreateModal} className="btn-primary">
              Create Your First Rule
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {routingRules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-white rounded-lg shadow-sm border ${
                rule.enabled ? 'border-gray-200' : 'border-gray-300 bg-gray-50'
              } p-5 transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {rule.name}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        rule.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {rule.enabled ? 'Active' : 'Disabled'}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      Priority: {rule.priority}
                    </span>
                  </div>

                  {rule.description && (
                    <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-gray-400" />
                      <span className="text-gray-700 capitalize">
                        {getConditionsLabel(rule.conditions)}
                      </span>
                    </div>
                    <span className="text-gray-300">→</span>
                    <div className="flex items-center gap-2">
                      {getActionIcon(rule.action.type)}
                      <span className="text-gray-700">{getActionLabel(rule.action)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleEnabled(rule)}
                    className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                      rule.enabled
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {rule.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => openEditModal(rule)}
                    className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    title="Edit rule"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete rule"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Section */}
      <div className="bg-primary-50 rounded-lg p-6 border border-primary-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Shield size={20} className="text-primary-600" />
          How Call Routing Works
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start">
            <span className="text-primary-600 mr-2 font-bold">1.</span>
            <span>
              <strong>Rules are evaluated in priority order</strong> (0 = highest priority).
              The first matching rule is applied.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 mr-2 font-bold">2.</span>
            <span>
              <strong>Conditions determine when a rule applies</strong> based on time of day,
              detected intent, or caller ID.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 mr-2 font-bold">3.</span>
            <span>
              <strong>Actions define what happens</strong> when a rule matches: transfer to a
              phone number, send to voicemail, or play a custom message.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 mr-2 font-bold">4.</span>
            <span>
              <strong>Disabled rules are skipped</strong> but remain configured for easy
              re-activation.
            </span>
          </li>
        </ul>
      </div>

      {/* Common Routing Patterns */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Common Routing Patterns</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-1">After Hours Voicemail</h4>
            <p className="text-sm text-gray-600">
              Route all calls outside business hours to voicemail automatically
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-1">Sales Intent Transfer</h4>
            <p className="text-sm text-gray-600">
              Transfer calls with sales intent to your sales team's direct line
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-1">VIP Caller Priority</h4>
            <p className="text-sm text-gray-600">
              Route specific caller IDs directly to a manager or priority line
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-1">Department Routing</h4>
            <p className="text-sm text-gray-600">
              Direct support, billing, and general inquiries to different teams
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <RoutingRuleModal
          rule={editingRule}
          onSave={handleSaveRule}
          onClose={closeModal}
          saving={saving}
        />
      )}
    </div>
  );
}
