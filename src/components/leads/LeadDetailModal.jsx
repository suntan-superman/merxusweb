// Lead Detail Modal - Full CRM features for real estate leads

import { useState, useEffect } from 'react';
import { updateLead } from '../../api/estate';
import { toast } from 'react-hot-toast';
import FormModal from '../common/FormModal';

export default function LeadDetailModal({ lead, onClose, onUpdate, flyerLogs = [] }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    notes: '',
    priority: 'cold',
    status: 'new',
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        notes: lead.notes || '',
        priority: lead.priority || 'cold',
        status: lead.status || 'new',
      });
    }
  }, [lead]);

  if (!lead) return null;

  const leadFlyerLogs = flyerLogs.filter(
    (log) => log.leadId === lead.id || log.recipientEmail === lead.email
  );

  async function handleSave() {
    try {
      setSaving(true);
      await updateLead(lead.id, formData);
      toast.success('Lead updated successfully');
      setEditMode(false);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to update lead:', error);
      toast.error('Failed to update lead');
    } finally {
      setSaving(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function formatDate(dateField) {
    if (!dateField) return 'N/A';
    try {
      let date;
      if (typeof dateField.toDate === 'function') {
        date = dateField.toDate();
      } else if (dateField.seconds) {
        date = new Date(dateField.seconds * 1000);
      } else if (dateField._seconds) {
        date = new Date(dateField._seconds * 1000);
      } else {
        date = new Date(dateField);
      }
      return date.toLocaleString();
    } catch {
      return 'Invalid Date';
    }
  }

  function handleCall() {
    if (lead.caller_phone || lead.phone) {
      window.location.href = `tel:${lead.caller_phone || lead.phone}`;
    } else {
      toast.error('No phone number available');
    }
  }

  function handleEmail() {
    if (lead.email) {
      window.location.href = `mailto:${lead.email}`;
    } else {
      toast.error('No email address available');
    }
  }

  function handleSMS() {
    if (lead.caller_phone || lead.phone) {
      window.location.href = `sms:${lead.caller_phone || lead.phone}`;
    } else {
      toast.error('No phone number available');
    }
  }

  const priorityColors = {
    hot: 'bg-red-100 text-red-800 border-red-300',
    warm: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    cold: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  const statusColors = {
    new: 'bg-green-100 text-green-800',
    contacted: 'bg-blue-100 text-blue-800',
    qualified: 'bg-purple-100 text-purple-800',
    converted: 'bg-indigo-100 text-indigo-800',
    lost: 'bg-gray-100 text-gray-800',
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      {!editMode ? (
        <>
          <button
            onClick={() => setEditMode(true)}
            className="btn-secondary"
          >
            ✏️ Edit
          </button>
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => {
              setEditMode(false);
              setFormData({
                notes: lead.notes || '',
                priority: lead.priority || 'cold',
                status: lead.status || 'new',
              });
            }}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      )}
    </div>
  );

  return (
    <FormModal
      isOpen={true}
      onClose={onClose}
      title={`Lead: ${lead.caller_name || lead.name || 'Unknown'}`}
      width="900px"
      resizable={true}
      storageKey="lead-detail-modal"
      headerActions={headerActions}
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'activity', 'flyers', 'transcript'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm capitalize
                  ${
                    activeTab === tab
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab}
                {tab === 'flyers' && leadFlyerLogs.length > 0 && (
                  <span className="ml-2 bg-primary-100 text-primary-600 py-0.5 px-2 rounded-full text-xs">
                    {leadFlyerLogs.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="py-4" style={{ minHeight: '400px' }}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {lead.caller_name || lead.name || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {lead.caller_phone || lead.phone || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {lead.email || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Source</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">
                      {lead.source || 'Phone Call'}
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={handleCall} className="btn-secondary text-sm">
                    📞 Call
                  </button>
                  <button onClick={handleEmail} className="btn-secondary text-sm">
                    📧 Email
                  </button>
                  <button onClick={handleSMS} className="btn-secondary text-sm">
                    💬 SMS
                  </button>
                </div>
              </div>

              {/* Lead Details */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Lead Details</h3>
                <div className="space-y-4">
                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    {editMode ? (
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className="input-field"
                      >
                        <option value="hot">🔥 Hot</option>
                        <option value="warm">⚡ Warm</option>
                        <option value="cold">❄️ Cold</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                          priorityColors[lead.priority] || priorityColors.cold
                        }`}
                      >
                        {lead.priority === 'hot' && '🔥 Hot'}
                        {lead.priority === 'warm' && '⚡ Warm'}
                        {lead.priority === 'cold' && '❄️ Cold'}
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    {editMode ? (
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="input-field"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="converted">Converted</option>
                        <option value="lost">Lost</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          statusColors[lead.status] || statusColors.new
                        }`}
                      >
                        {(lead.status || 'new').charAt(0).toUpperCase() + (lead.status || 'new').slice(1)}
                      </span>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    {editMode ? (
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows="4"
                        className="input-field"
                        placeholder="Add notes about this lead..."
                      />
                    ) : (
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {lead.notes || 'No notes added yet'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Property Interest */}
              {(lead.property_address || lead.propertyAddress || lead.interested_in) && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Property Interest</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {lead.property_address || lead.propertyAddress || lead.interested_in || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Activity Timeline</h3>
                <div className="space-y-4">
                  {/* Captured Event */}
                  <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600">📞</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Lead Captured</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(lead.captured_at || lead.createdAt)}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Via {lead.source || 'phone call'}
                      </p>
                    </div>
                  </div>

                  {/* Last Updated */}
                  {lead.updatedAt && (
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600">✏️</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Last Updated</p>
                        <p className="text-xs text-gray-500">{formatDate(lead.updatedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Flyers Tab */}
          {activeTab === 'flyers' && (
            <div className="space-y-4">
              {leadFlyerLogs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📧</div>
                  <p className="text-gray-500">No flyers sent to this lead yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-md font-semibold text-gray-900">Flyer Send History</h3>
                  {leadFlyerLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-white border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {log.status === 'sent' && (
                              <span className="text-green-500 text-xl">✅</span>
                            )}
                            {log.status === 'pending' && (
                              <span className="text-yellow-500 text-xl">⏳</span>
                            )}
                            {log.status === 'failed' && (
                              <span className="text-red-500 text-xl">❌</span>
                            )}
                            <span className="font-medium text-gray-900">
                              {log.listingAddress || 'Property'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Sent: {formatDate(log.sentAt || log.createdAt)}
                          </p>
                          {log.clickedAt && (
                            <p className="text-sm text-green-600 font-medium mt-1">
                              👆 Clicked: {formatDate(log.clickedAt)}
                            </p>
                          )}
                        </div>
                        {log.flyerUrl && (
                          <a
                            href={log.flyerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary text-sm"
                          >
                            📄 View
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Transcript Tab */}
          {activeTab === 'transcript' && (
            <div className="space-y-4">
              {lead.transcript || lead.transcriptSummary ? (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Call Transcript</h3>
                  
                  {/* Audio Player Placeholder */}
                  {lead.recordingUrl && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Call Recording</p>
                      <audio controls className="w-full">
                        <source src={lead.recordingUrl} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}

                  {/* Transcript Text */}
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {lead.transcript || lead.transcriptSummary}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📝</div>
                  <p className="text-gray-500">No transcript available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </FormModal>
  );
}
