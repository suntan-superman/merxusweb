import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  useListing, 
  useUpdateListing, 
  useFlyerLogs, 
  useSendTestFlyer,
  useLeads,
  useShowings,
} from '../../hooks/useEstateQueries';
import LoadingSpinner from '../../components/LoadingSpinner';
import ListingForm from '../../components/listings/ListingForm';
import SelectField from '../../components/common/SelectField';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Edit,
  Share2,
  Download,
  Archive,
  ExternalLink,
  MapPin,
  Bed,
  Bath,
  Maximize,
  DollarSign,
  Calendar,
  Eye,
  Mail,
  Phone,
  Clock,
  FileText,
  Home,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

export default function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');
  const [showEditModal, setShowEditModal] = useState(false);

  // React Query hooks
  const { 
    data: listing, 
    isLoading, 
    isError,
    error 
  } = useListing(id);
  
  const { 
    data: allFlyerLogs = [] 
  } = useFlyerLogs({ limit: 200 });

  const {
    data: allLeads = [],
  } = useLeads();

  const {
    data: allShowings = [],
  } = useShowings();
  
  const updateListingMutation = useUpdateListing();
  const sendTestFlyerMutation = useSendTestFlyer();

  // Filter data for this listing
  const flyerLogs = allFlyerLogs.filter?.((log) => log.listingId === id) || [];
  const listingLeads = allLeads.filter?.((lead) => lead.listingId === id) || [];
  const listingShowings = allShowings.filter?.((showing) => showing.listingId === id) || [];

  // Calculate metrics
  const metrics = {
    totalLeads: listingLeads.length,
    newLeads: listingLeads.filter(l => l.status === 'new').length,
    contactedLeads: listingLeads.filter(l => l.status === 'contacted').length,
    qualifiedLeads: listingLeads.filter(l => l.status === 'qualified').length,
    totalShowings: listingShowings.length,
    upcomingShowings: listingShowings.filter(s => new Date(s.date) >= new Date()).length,
    completedShowings: listingShowings.filter(s => s.status === 'completed').length,
    flyersSent: flyerLogs.length,
  };

  function handleSave(listingData) {
    updateListingMutation.mutate(
      { listingId: id, listing: listingData },
      {
        onSuccess: () => {
          setShowEditModal(false);
        },
      }
    );
  }

  function handleTestSend(listingToSend) {
    const email = window.prompt('Enter a test email to send the flyer to:');
    if (!email) return;

    sendTestFlyerMutation.mutate({
      listingId: listingToSend.id,
      testEmail: email,
    });
  }

  function handleStatusChange(newStatus) {
    updateListingMutation.mutate({
      listingId: id,
      listing: { status: newStatus },
    });
  }

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: listing.address || listing.title,
        text: `Check out this property: ${listing.address}`,
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  }

  function handleDownloadFlyer() {
    if (listing?.flyerUrl || listing?.flyerURL) {
      window.open(listing.flyerUrl || listing.flyerURL, '_blank');
    } else {
      toast.error('No flyer available for this listing');
    }
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError || !listing) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">Listing Not Found</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-6">
          {error?.message || "The listing you're looking for doesn't exist"}
        </p>
        <Link to="/estate/listings" className="btn-primary">
          Back to Listings
        </Link>
      </div>
    );
  }

  const hasFlyer = !!(listing.flyerUrl || listing.flyerURL);
  const photoUrl = listing.photos?.[0] || listing.photo || listing.photoUrl;

  return (
    <div className="flex flex-col gap-6 text-gray-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/estate/listings')}
          className="flex items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Listings
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleShare} className="btn-secondary flex items-center gap-2">
            <Share2 size={18} />
            Share
          </button>
          {hasFlyer && (
            <button onClick={handleDownloadFlyer} className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              Flyer
            </button>
          )}
          <button
            onClick={() => setShowEditModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Edit size={18} />
            Edit
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 border border-gray-200 dark:border-slate-700 overflow-hidden">
        {photoUrl && (
          <div className="h-96 bg-gray-100 dark:bg-slate-800 relative">
            <img
              src={photoUrl}
              alt={listing.address || 'Property'}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 flex gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  listing.status === 'active'
                    ? 'bg-green-500 text-white'
                    : listing.status === 'pending'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-500 dark:bg-slate-600 text-white'
                }`}
              >
                {listing.status || 'active'}
              </span>
            </div>
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                {listing.address || listing.title || 'Untitled Listing'}
              </h1>
              {listing.city && listing.state && (
                <p className="text-lg text-gray-600 dark:text-slate-400 flex items-center gap-2">
                  <MapPin size={18} />
                  {listing.city}, {listing.state} {listing.zip}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary-600">
                {listing.price ? `$${listing.price.toLocaleString()}` : 'Price Not Set'}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-gray-200 dark:border-slate-700">
            {listing.bedrooms && (
              <div className="flex items-center gap-2">
                <Bed size={20} className="text-gray-400 dark:text-slate-500" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-slate-100">{listing.bedrooms}</div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">Bedrooms</div>
                </div>
              </div>
            )}
            {listing.bathrooms && (
              <div className="flex items-center gap-2">
                <Bath size={20} className="text-gray-400 dark:text-slate-500" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-slate-100">{listing.bathrooms}</div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">Bathrooms</div>
                </div>
              </div>
            )}
            {listing.sqft && (
              <div className="flex items-center gap-2">
                <Maximize size={20} className="text-gray-400 dark:text-slate-500" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-slate-100">
                    {listing.sqft.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">Sq Ft</div>
                </div>
              </div>
            )}
            {listing.yearBuilt && (
              <div className="flex items-center gap-2">
                <Home size={20} className="text-gray-400 dark:text-slate-500" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-slate-100">{listing.yearBuilt}</div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">Year Built</div>
                </div>
              </div>
            )}
          </div>

          {/* Status Selector */}
          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Listing Status
            </label>
            <SelectField
              value={listing.status || 'active'}
              onChange={handleStatusChange}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'pending', label: 'Pending' },
                { value: 'sold', label: 'Sold' },
                { value: 'withdrawn', label: 'Withdrawn' },
              ]}
              containerClassName="w-full md:w-64"
            />
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">{metrics.totalLeads}</div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Total Leads</div>
            </div>
          </div>
          {metrics.newLeads > 0 && (
            <div className="mt-2 text-xs text-blue-600 font-medium">
              {metrics.newLeads} new
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar size={20} className="text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">{metrics.totalShowings}</div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Showings</div>
            </div>
          </div>
          {metrics.upcomingShowings > 0 && (
            <div className="mt-2 text-xs text-green-600 font-medium">
              {metrics.upcomingShowings} upcoming
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Mail size={20} className="text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">{metrics.flyersSent}</div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Flyers Sent</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp size={20} className="text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">{metrics.qualifiedLeads}</div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Qualified</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 border border-gray-200 dark:border-slate-700">
        <div className="border-b border-gray-200 dark:border-slate-700">
          <nav className="flex space-x-4 md:space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
            {[
              { id: 'details', label: 'Details', icon: FileText },
              { id: 'leads', label: 'Leads', icon: Users, count: metrics.totalLeads },
              { id: 'showings', label: 'Showings', icon: Calendar, count: metrics.totalShowings },
              { id: 'photos', label: 'Photos', icon: Eye },
              { id: 'openhouse', label: 'Open House', icon: Calendar },
              { id: 'activity', label: 'Activity', icon: Clock, count: metrics.flyersSent },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                  ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-600'
                  }
                `}
              >
                <tab.icon size={18} />
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {listing.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Description</h3>
                  <p className="text-gray-700 dark:text-slate-300 whitespace-pre-wrap">{listing.description}</p>
                </div>
              )}

              {listing.highlights && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Highlights</h3>
                  <p className="text-gray-700 dark:text-slate-300 whitespace-pre-wrap">{listing.highlights}</p>
                </div>
              )}

              {listing.features && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Features</h3>
                  <p className="text-gray-700 dark:text-slate-300 whitespace-pre-wrap">{listing.features}</p>
                </div>
              )}

              {(listing.mls || listing.lotSize || listing.propertyType) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
                    Additional Information
                  </h3>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {listing.mls && (
                      <>
                        <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">MLS Number</dt>
                        <dd className="text-sm text-gray-900 dark:text-slate-100">{listing.mls}</dd>
                      </>
                    )}
                    {listing.propertyType && (
                      <>
                        <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Property Type</dt>
                        <dd className="text-sm text-gray-900 dark:text-slate-100">{listing.propertyType}</dd>
                      </>
                    )}
                    {listing.lotSize && (
                      <>
                        <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Lot Size</dt>
                        <dd className="text-sm text-gray-900 dark:text-slate-100">{listing.lotSize}</dd>
                      </>
                    )}
                  </dl>
                </div>
              )}

              {hasFlyer && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-green-900 mb-1">
                        Flyer Available
                      </h3>
                      <p className="text-sm text-green-700">
                        A downloadable flyer has been uploaded for this listing
                      </p>
                    </div>
                    <button
                      onClick={handleDownloadFlyer}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Download size={18} />
                      Download
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'leads' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Lead Inquiries</h3>
                <Link 
                  to="/estate/leads" 
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  View All Leads →
                </Link>
              </div>
              {listingLeads.length > 0 ? (
                <div className="space-y-4">
                  {listingLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-slate-800/60 rounded-lg border border-gray-100 dark:border-slate-800"
                    >
                      <div className={`p-2 rounded-full ${
                        lead.status === 'new' ? 'bg-blue-100' :
                        lead.status === 'contacted' ? 'bg-yellow-100' :
                        lead.status === 'qualified' ? 'bg-green-100' :
                        'bg-gray-100 dark:bg-slate-800'
                      }`}>
                        {lead.status === 'new' ? (
                          <AlertCircle size={20} className="text-blue-600" />
                        ) : lead.status === 'qualified' ? (
                          <CheckCircle size={20} className="text-green-600" />
                        ) : (
                          <Users size={20} className="text-gray-600 dark:text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 dark:text-slate-100">
                            {lead.name || lead.callerName || 'Unknown'}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                            lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                            lead.status === 'qualified' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200'
                          }`}>
                            {lead.status || 'new'}
                          </span>
                        </div>
                        {(lead.phone || lead.callerNumber) && (
                          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-slate-400 mb-1">
                            <Phone size={14} />
                            {lead.phone || lead.callerNumber}
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-slate-400 mb-1">
                            <Mail size={14} />
                            {lead.email}
                          </div>
                        )}
                        {lead.notes && (
                          <p className="text-sm text-gray-700 dark:text-slate-300 mt-2">{lead.notes}</p>
                        )}
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                          {lead.createdAt?.toDate?.().toLocaleDateString() || 
                           (lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'Unknown date')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/60 rounded-lg">
                  <Users size={48} className="mx-auto text-gray-400 dark:text-slate-500 mb-4" />
                  <p className="text-gray-600 dark:text-slate-400">No leads for this listing yet</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                    Leads will appear here when potential buyers inquire about this property
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'showings' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Scheduled Showings</h3>
                <Link 
                  to="/estate/showings" 
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  View All Showings →
                </Link>
              </div>
              {listingShowings.length > 0 ? (
                <div className="space-y-4">
                  {listingShowings.map((showing) => {
                    const showingDate = showing.date ? new Date(showing.date) : null;
                    const isPast = showingDate && showingDate < new Date();
                    
                    return (
                      <div
                        key={showing.id}
                        className={`flex items-start gap-4 p-4 rounded-lg border ${
                          isPast ? 'bg-gray-50 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700' : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className={`p-2 rounded-full ${
                          showing.status === 'completed' ? 'bg-green-100' :
                          showing.status === 'cancelled' ? 'bg-red-100' :
                          isPast ? 'bg-gray-100 dark:bg-slate-800' : 'bg-blue-100'
                        }`}>
                          {showing.status === 'completed' ? (
                            <CheckCircle size={20} className="text-green-600" />
                          ) : showing.status === 'cancelled' ? (
                            <XCircle size={20} className="text-red-600" />
                          ) : (
                            <Calendar size={20} className={isPast ? 'text-gray-600 dark:text-slate-400' : 'text-blue-600'} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 dark:text-slate-100">
                              {showingDate?.toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                            {showing.time && (
                              <span className="text-gray-600 dark:text-slate-400">at {showing.time}</span>
                            )}
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              showing.status === 'completed' ? 'bg-green-100 text-green-800' :
                              showing.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              isPast ? 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {showing.status || (isPast ? 'past' : 'scheduled')}
                            </span>
                          </div>
                          {(showing.clientName || showing.agentName) && (
                            <div className="text-sm text-gray-600 dark:text-slate-400">
                              {showing.clientName && <span>Client: {showing.clientName}</span>}
                              {showing.clientName && showing.agentName && <span> • </span>}
                              {showing.agentName && <span>Agent: {showing.agentName}</span>}
                            </div>
                          )}
                          {showing.notes && (
                            <p className="text-sm text-gray-700 dark:text-slate-300 mt-2">{showing.notes}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/60 rounded-lg">
                  <Calendar size={48} className="mx-auto text-gray-400 dark:text-slate-500 mb-4" />
                  <p className="text-gray-600 dark:text-slate-400">No showings scheduled</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                    Showings for this property will appear here
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'photos' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Property Photos</h3>
              {listing.photos && listing.photos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {listing.photos.map((photo, index) => (
                    <div
                      key={index}
                      className="aspect-video bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden"
                    >
                      <img
                        src={photo}
                        alt={`Property ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/60 rounded-lg">
                  <Eye size={48} className="mx-auto text-gray-400 dark:text-slate-500 mb-4" />
                  <p className="text-gray-600 dark:text-slate-400">No photos uploaded yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'openhouse' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Open House</h3>
              {listing.open_house?.date ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <Calendar size={24} className="text-blue-600 mt-1" />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-slate-100 mb-1">
                        {listing.open_house.date}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-slate-300">
                        {listing.open_house.start} - {listing.open_house.end}
                      </div>
                      {listing.open_house.description && (
                        <div className="text-sm text-gray-600 dark:text-slate-400 mt-2">
                          {listing.open_house.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/60 rounded-lg">
                  <Calendar size={48} className="mx-auto text-gray-400 dark:text-slate-500 mb-4" />
                  <p className="text-gray-600 dark:text-slate-400">No open house scheduled</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Recent Activity</h3>
              {flyerLogs.length > 0 ? (
                <div className="space-y-4">
                  {flyerLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-slate-800/60 rounded-lg"
                    >
                      <Mail size={20} className="text-gray-400 dark:text-slate-500 mt-1" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-slate-100">
                          Flyer {log.isTest ? 'Test ' : ''}Sent
                        </div>
                        <div className="text-sm text-gray-600 dark:text-slate-400">
                          To: {log.recipientEmail || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                          {log.sentAt?.toDate?.().toLocaleString() || 'Unknown date'}
                        </div>
                        <div className="mt-2">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              log.status === 'sent'
                                ? 'bg-green-100 text-green-800'
                                : log.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200'
                            }`}
                          >
                            {log.status || 'sent'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/60 rounded-lg">
                  <Clock size={48} className="mx-auto text-gray-400 dark:text-slate-500 mb-4" />
                  <p className="text-gray-600 dark:text-slate-400">No activity yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <ListingForm
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleSave}
          editing={listing}
          onTestSend={handleTestSend}
        />
      )}
    </div>
  );
}

