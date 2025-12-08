import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchListings, updateListing, sendTestFlyer, fetchFlyerLogs } from '../../api/estate';
import LoadingSpinner from '../../components/LoadingSpinner';
import ListingForm from '../../components/listings/ListingForm';
import { toast } from 'react-toastify';
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
} from 'lucide-react';

export default function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [flyerLogs, setFlyerLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadListing();
    loadFlyerLogs();
  }, [id]);

  async function loadListing() {
    try {
      setLoading(true);
      const data = await fetchListings();
      const found = data.find((l) => l.id === id);
      if (found) {
        setListing(found);
      } else {
        toast.error('Listing not found');
        navigate('/estate/listings');
      }
    } catch (error) {
      console.error('Error loading listing:', error);
      toast.error('Failed to load listing');
    } finally {
      setLoading(false);
    }
  }

  async function loadFlyerLogs() {
    try {
      const logs = await fetchFlyerLogs({ limit: 200 });
      const thisListingLogs = logs.filter((log) => log.listingId === id);
      setFlyerLogs(thisListingLogs);
    } catch (error) {
      console.error('Error loading flyer logs:', error);
    }
  }

  async function handleSave(listingData) {
    try {
      const updated = await updateListing(id, listingData);
      setListing({ ...listing, ...updated });
      setShowEditModal(false);
      toast.success('Listing updated successfully');
    } catch (error) {
      console.error('Error updating listing:', error);
      toast.error('Failed to update listing');
    }
  }

  async function handleTestSend(listing) {
    const email = window.prompt('Enter a test email to send the flyer to:');
    if (!email) return;

    try {
      await sendTestFlyer(listing.id, email);
      toast.success(`Test flyer sent to ${email}`);
      await loadFlyerLogs();
    } catch (error) {
      console.error('Error sending test flyer:', error);
      toast.error('Failed to send test flyer');
    }
  }

  async function handleStatusChange(newStatus) {
    try {
      await updateListing(id, { status: newStatus });
      setListing({ ...listing, status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
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

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!listing) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Listing Not Found</h2>
        <p className="text-gray-600 mb-6">The listing you're looking for doesn't exist</p>
        <Link to="/estate/listings" className="btn-primary">
          Back to Listings
        </Link>
      </div>
    );
  }

  const hasFlyer = !!(listing.flyerUrl || listing.flyerURL);
  const photoUrl = listing.photos?.[0] || listing.photo || listing.photoUrl;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/estate/listings')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {photoUrl && (
          <div className="h-96 bg-gray-100 relative">
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
                    : 'bg-gray-500 text-white'
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {listing.address || listing.title || 'Untitled Listing'}
              </h1>
              {listing.city && listing.state && (
                <p className="text-lg text-gray-600 flex items-center gap-2">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-gray-200">
            {listing.bedrooms && (
              <div className="flex items-center gap-2">
                <Bed size={20} className="text-gray-400" />
                <div>
                  <div className="font-semibold text-gray-900">{listing.bedrooms}</div>
                  <div className="text-sm text-gray-600">Bedrooms</div>
                </div>
              </div>
            )}
            {listing.bathrooms && (
              <div className="flex items-center gap-2">
                <Bath size={20} className="text-gray-400" />
                <div>
                  <div className="font-semibold text-gray-900">{listing.bathrooms}</div>
                  <div className="text-sm text-gray-600">Bathrooms</div>
                </div>
              </div>
            )}
            {listing.sqft && (
              <div className="flex items-center gap-2">
                <Maximize size={20} className="text-gray-400" />
                <div>
                  <div className="font-semibold text-gray-900">
                    {listing.sqft.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Sq Ft</div>
                </div>
              </div>
            )}
            {listing.yearBuilt && (
              <div className="flex items-center gap-2">
                <Home size={20} className="text-gray-400" />
                <div>
                  <div className="font-semibold text-gray-900">{listing.yearBuilt}</div>
                  <div className="text-sm text-gray-600">Year Built</div>
                </div>
              </div>
            )}
          </div>

          {/* Status Selector */}
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Listing Status
            </label>
            <select
              value={listing.status || 'active'}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="input-field w-full md:w-64"
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="sold">Sold</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'details', label: 'Details', icon: FileText },
              { id: 'photos', label: 'Photos', icon: Eye },
              { id: 'openhouse', label: 'Open House', icon: Calendar },
              { id: 'activity', label: 'Activity', icon: Clock },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {listing.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{listing.description}</p>
                </div>
              )}

              {listing.highlights && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Highlights</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{listing.highlights}</p>
                </div>
              )}

              {listing.features && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Features</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{listing.features}</p>
                </div>
              )}

              {(listing.mls || listing.lotSize || listing.propertyType) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Additional Information
                  </h3>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {listing.mls && (
                      <>
                        <dt className="text-sm font-medium text-gray-500">MLS Number</dt>
                        <dd className="text-sm text-gray-900">{listing.mls}</dd>
                      </>
                    )}
                    {listing.propertyType && (
                      <>
                        <dt className="text-sm font-medium text-gray-500">Property Type</dt>
                        <dd className="text-sm text-gray-900">{listing.propertyType}</dd>
                      </>
                    )}
                    {listing.lotSize && (
                      <>
                        <dt className="text-sm font-medium text-gray-500">Lot Size</dt>
                        <dd className="text-sm text-gray-900">{listing.lotSize}</dd>
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

          {activeTab === 'photos' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Photos</h3>
              {listing.photos && listing.photos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {listing.photos.map((photo, index) => (
                    <div
                      key={index}
                      className="aspect-video bg-gray-100 rounded-lg overflow-hidden"
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
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Eye size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No photos uploaded yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'openhouse' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Open House</h3>
              {listing.open_house?.date ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <Calendar size={24} className="text-blue-600 mt-1" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">
                        {listing.open_house.date}
                      </div>
                      <div className="text-sm text-gray-700">
                        {listing.open_house.start} - {listing.open_house.end}
                      </div>
                      {listing.open_house.description && (
                        <div className="text-sm text-gray-600 mt-2">
                          {listing.open_house.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No open house scheduled</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              {flyerLogs.length > 0 ? (
                <div className="space-y-4">
                  {flyerLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <Mail size={20} className="text-gray-400 mt-1" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          Flyer {log.isTest ? 'Test ' : ''}Sent
                        </div>
                        <div className="text-sm text-gray-600">
                          To: {log.recipientEmail || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {log.sentAt?.toDate?.().toLocaleString() || 'Unknown date'}
                        </div>
                        <div className="mt-2">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              log.status === 'sent'
                                ? 'bg-green-100 text-green-800'
                                : log.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
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
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Clock size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No activity yet</p>
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
