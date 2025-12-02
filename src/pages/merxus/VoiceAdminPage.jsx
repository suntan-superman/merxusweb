import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function VoiceAdminPage() {
  const navigate = useNavigate();
  const { userClaims } = useAuth();

  // Only super-admins should access this page
  if (userClaims?.role !== 'super_admin') {
    navigate('/merxus', { replace: true });
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Voice Service Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Manage voice service companies and oversee the voice platform
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-6xl mb-4">📞</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Voice Admin Portal</h2>
        <p className="text-gray-600 mb-6">
          The voice service admin dashboard is coming soon. You'll be able to:
        </p>
        <ul className="text-left max-w-md mx-auto space-y-2 text-gray-600 mb-8">
          <li>• View and manage all voice service companies</li>
          <li>• View voice service analytics</li>
          <li>• Create new voice service accounts</li>
          <li>• Manage voice service settings</li>
        </ul>
        <button
          onClick={() => navigate('/merxus')}
          className="btn-primary"
        >
          Go to Restaurant Portal
        </button>
      </div>
    </div>
  );
}

