import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { fetchAllVoices, updateVoice, getVoice } from '../../api/merxus';
import VoicesTable from '../../components/merxus/VoicesTable';
import VoiceDetail from '../../components/merxus/VoiceDetail';

// Helper to safely extract string value from field (handles objects)
const safeString = (value, defaultValue = 'N/A') => {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    // If it's an object with a name or value property, extract it
    return value.name || value.value || JSON.stringify(value);
  }
  return String(value || defaultValue);
};

export default function VoicesPage() {
  const location = useLocation();
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [loadingVoice, setLoadingVoice] = useState(false);
  const [search, setSearch] = useState('');
  const [showDisabled, setShowDisabled] = useState(false);

  async function load() {
    try {
      setError(null);
      setLoading(true);
      
      // Read directly from Firestore offices collection (same as TenantsManagementPage)
      const officesRef = collection(db, 'offices');
      const snapshot = await getDocs(officesRef);
      
      const voicesList = [];
      for (const officeDoc of snapshot.docs) {
        const officeData = officeDoc.data();
        
        // Load settings from meta/settings subcollection
        let settings = {};
        try {
          const settingsRef = collection(db, 'offices', officeDoc.id, 'meta');
          const settingsSnapshot = await getDocs(settingsRef);
          if (settingsSnapshot.docs.length > 0) {
            settings = settingsSnapshot.docs[0].data();
          }
        } catch (error) {
          console.error('Error loading settings for', officeDoc.id, error);
        }
        
        // Extract category and industry from businessType object if it exists
        let category = settings.category || officeData.category || 'N/A';
        let industry = settings.industry || officeData.industry || 'N/A';
        let businessType = settings.businessType || officeData.businessType || {};
        
        // If businessType is an object with category/industry, extract those
        if (typeof businessType === 'object' && businessType !== null) {
          category = businessType.category || category;
          industry = businessType.industry || industry;
        }
        
        voicesList.push({
          id: officeDoc.id,
          officeId: officeDoc.id,
          name: settings.name || officeData.name || 'Unknown',
          email: settings.email || officeData.email || 'N/A',
          phoneNumber: settings.phoneNumber || officeData.phoneNumber || 'N/A',
          twilioPhoneNumber: settings.twilioPhoneNumber || officeData.twilioPhoneNumber || 'N/A',
          address: settings.address || officeData.address || 'N/A',
          category: safeString(category, 'N/A'),
          industry: safeString(industry, 'N/A'),
          timezone: settings.timezone || officeData.timezone || 'America/Los_Angeles',
          website: settings.website || officeData.website || 'N/A',
          businessType: safeString(businessType.category || businessType, 'N/A'),
          aiConfig: officeData.aiConfig || { model: 'gpt-4o-mini' },
          disabled: officeData.disabled || false,
          createdAt: officeData.createdAt?.toDate() || new Date(),
        });
      }
      
      // Sort by creation date (newest first)
      voicesList.sort((a, b) => b.createdAt - a.createdAt);
      setVoices(voicesList);
    } catch (err) {
      console.error('Error loading voice services:', err);
      setError(`Failed to load voice services: ${err.message || 'Unknown error'}`);
      setVoices([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    if (location.state?.message) {
      setSuccess(location.state.message);
      setTimeout(() => setSuccess(null), 5000);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  async function handleSelectVoice(voice) {
    // Just use the voice data we already have from Firestore
    // No API call needed
    setSelectedVoice(voice);
  }

  async function handleUpdate(voiceId, updates) {
    try {
      setError(null);
      setSuccess(null);
      await updateVoice(voiceId, updates);
      await load();
      // Refresh the selected voice with new data
      const updatedVoice = voices.find(v => v.id === voiceId || v.officeId === voiceId);
      if (updatedVoice) {
        setSelectedVoice(updatedVoice);
      }
      setSuccess('Voice service updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError(`Failed to update voice service: ${err.message || 'Unknown error'}`);
    }
  }

  const filtered = voices.filter((v) => {
    if (!showDisabled && v.disabled) return false;

    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.name?.toLowerCase().includes(q) ||
      v.officeId?.toLowerCase().includes(q) ||
      v.email?.toLowerCase().includes(q) ||
      v.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Voice Services</h1>
          <p className="mt-2 text-gray-600">
            Manage all voice service accounts and settings
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 space-x-4">
          <input
            type="text"
            placeholder="Search voice services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 input-field"
          />
          <label className="flex items-center space-x-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showDisabled}
              onChange={(e) => setShowDisabled(e.target.checked)}
              className="border-gray-300 rounded text-primary-600 focus:ring-primary-500"
            />
            <span>Show disabled</span>
          </label>
          <a
            href="/merxus/voices/new"
            className="btn-primary whitespace-nowrap"
          >
            + Create Voice Service
          </a>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 text-sm text-red-700 border border-red-200 rounded-md bg-red-50">
          {error}
        </div>
      )}

      {success && (
        <div className="px-4 py-3 text-sm border rounded-md bg-primary-50 border-primary-200 text-primary-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className={selectedVoice ? 'lg:col-span-2' : 'lg:col-span-3'}>
          {loading ? (
            <div className="py-12 text-center text-gray-600">Loading voice services...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-600">
              {voices.length === 0 ? 'No voice services found.' : 'No results match your search.'}
            </div>
          ) : (
            <VoicesTable
              voices={filtered}
              onSelect={handleSelectVoice}
              selectedId={selectedVoice?.id || selectedVoice?.officeId}
            />
          )}
        </div>

        {selectedVoice && (
          <div>
            <VoiceDetail
              voice={selectedVoice}
              onUpdate={handleUpdate}
              loading={loadingVoice}
            />
          </div>
        )}
      </div>
    </div>
  );
}
