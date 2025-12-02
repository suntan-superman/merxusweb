import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function CallRoutingPage() {
  const { officeId } = useAuth();
  const [loading, setLoading] = useState(false);

  // TODO: Implement routing rules API
  const [routingRules, setRoutingRules] = useState([]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Call Routing</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure how calls are routed based on caller needs
          </p>
        </div>
        <button className="btn-primary">
          + Add Routing Rule
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {routingRules.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔄</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Routing Rules
            </h3>
            <p className="text-gray-600 mb-6">
              Create routing rules to automatically direct calls to the right person or department
            </p>
            <button className="btn-primary">
              Create Your First Rule
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Routing rules will be displayed here */}
            <p className="text-gray-500">Routing rules will be displayed here</p>
          </div>
        )}
      </div>

      <div className="bg-primary-50 rounded-lg p-6 border border-primary-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          How Call Routing Works
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start">
            <span className="text-primary-600 mr-2">•</span>
            <span>When a caller asks for a specific department or person, the AI will route the call accordingly</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 mr-2">•</span>
            <span>You can set up rules to forward calls to specific phone numbers or extensions</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 mr-2">•</span>
            <span>If the target is unavailable, the AI can take a message or send to voicemail</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

