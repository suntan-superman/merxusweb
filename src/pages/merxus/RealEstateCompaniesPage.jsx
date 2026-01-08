import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { fetchAllRealEstateCompanies, updateRealEstateCompany, getRealEstateCompany } from '../../api/realEstate';
import RealEstateCompaniesTable from '../../components/merxus/RealEstateCompaniesTable';
import RealEstateCompanyDetail from '../../components/merxus/RealEstateCompanyDetail';

// Helper to safely extract string value from field (handles objects)
const safeString = (value, defaultValue = 'N/A') => {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    // If it's an object with a name or value property, extract it
    return value.name || value.value || JSON.stringify(value);
  }
  return String(value || defaultValue);
};

export default function RealEstateCompaniesPage() {
  const location = useLocation();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [search, setSearch] = useState('');
  const [showDisabled, setShowDisabled] = useState(false);

  async function load() {
    try {
      setError(null);
      setLoading(true);
      
      // Read directly from Firestore agents collection (same as TenantsManagementPage)
      const agentsRef = collection(db, 'agents');
      const snapshot = await getDocs(agentsRef);
      
      const companiesList = [];
      for (const agentDoc of snapshot.docs) {
        const agentData = agentDoc.data();
        
        // Load settings from meta/settings subcollection
        let settings = {};
        try {
          const settingsRef = collection(db, 'agents', agentDoc.id, 'meta');
          const settingsSnapshot = await getDocs(settingsRef);
          if (settingsSnapshot.docs.length > 0) {
            settings = settingsSnapshot.docs[0].data();
          }
        } catch (error) {
          console.error('Error loading settings for', agentDoc.id, error);
        }
        
        companiesList.push({
          id: agentDoc.id,
          agentId: agentDoc.id,
          name: settings.name || agentData.name || 'Unknown',
          email: settings.email || agentData.email || 'N/A',
          phone: safeString(settings.phone || agentData.phone, 'N/A'),
          brokerage: safeString(settings.brokerage || agentData.brokerage, 'N/A'),
          yearsExperience: settings.yearsExperience || agentData.yearsExperience || 0,
          homesSold: settings.homesSold || agentData.homesSold || 0,
          activeListings: settings.activeListings || agentData.activeListings || 0,
          awards: settings.awards || agentData.awards || [],
          neighborhoods: settings.neighborhoods || agentData.neighborhoods || [],
          markets: settings.markets || agentData.markets || [],
          brand: safeString(settings.brand || agentData.brand, 'N/A'),
          disabled: agentData.disabled || false,
          createdAt: agentData.createdAt?.toDate() || new Date(),
        });
      }
      
      // Sort by creation date (newest first)
      companiesList.sort((a, b) => b.createdAt - a.createdAt);
      setCompanies(companiesList);
    } catch (err) {
      console.error('Error loading real estate companies:', err);
      setError(`Failed to load real estate companies: ${err.message || 'Unknown error'}`);
      setCompanies([]);
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

  async function handleSelectCompany(company) {
    // Just use the company data we already have from Firestore
    // No API call needed
    setSelectedCompany(company);
  }

  async function handleUpdate(companyId, updates) {
    try {
      setError(null);
      setSuccess(null);
      await updateRealEstateCompany(companyId, updates);
      await load();
      // Refresh the selected company with new data
      const updatedCompany = companies.find(c => c.id === companyId || c.agentId === companyId);
      if (updatedCompany) {
        setSelectedCompany(updatedCompany);
      }
      setSuccess('Company updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError(`Failed to update company: ${err.message || 'Unknown error'}`);
    }
  }

  const filtered = companies.filter((c) => {
    if (!showDisabled && c.disabled) return false;

    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.officeId?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phoneNumber?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Real Estate Companies</h1>
          <p className="mt-2 text-gray-600">
            Manage all real estate company accounts and settings
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 space-x-4">
          <input
            type="text"
            placeholder="Search companies..."
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
            href="/merxus/real-estate/new"
            className="btn-primary whitespace-nowrap"
          >
            + Create Company
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
        <div className={selectedCompany ? 'lg:col-span-2' : 'lg:col-span-3'}>
          {loading ? (
            <div className="py-12 text-center text-gray-600">Loading real estate companies...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-600">
              {companies.length === 0 ? 'No real estate companies found.' : 'No results match your search.'}
            </div>
          ) : (
            <RealEstateCompaniesTable
              companies={filtered}
              onSelect={handleSelectCompany}
              selectedId={selectedCompany?.id || selectedCompany?.officeId}
            />
          )}
        </div>

        {selectedCompany && (
          <div>
            <RealEstateCompanyDetail
              company={selectedCompany}
              onUpdate={handleUpdate}
              loading={loadingCompany}
            />
          </div>
        )}
      </div>
    </div>
  );
}
