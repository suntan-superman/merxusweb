import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock } from 'lucide-react';

const TrialBanner = ({ subscription }) => {
  const [daysRemaining, setDaysRemaining] = useState(null);

  useEffect(() => {
    if (subscription?.trialEndsAt) {
      const trialEnd = new Date(subscription.trialEndsAt);
      const today = new Date();
      const diffTime = trialEnd - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysRemaining(diffDays);
    }
  }, [subscription]);

  // Don't show banner if not in trial or if trial is over
  if (subscription?.status !== 'trial' || !daysRemaining) {
    return null;
  }

  // Show urgent warning if 3 days or less remaining
  const isUrgent = daysRemaining <= 3;

  return (
    <div className={`${isUrgent ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'} border-b px-4 py-3`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap">
        <div className="flex items-center">
          {isUrgent ? (
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          ) : (
            <Clock className="h-5 w-5 text-blue-600 mr-2" />
          )}
          <span className={`text-sm font-medium ${isUrgent ? 'text-red-900' : 'text-blue-900'}`}>
            {isUrgent ? (
              <>
                <strong>Trial Ending Soon!</strong> Only {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining in your free trial.
              </>
            ) : (
              <>
                <strong>Free Trial Active</strong> - {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
              </>
            )}
          </span>
        </div>
        <Link
          to="/billing"
          className={`${
            isUrgent 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          } px-4 py-2 rounded-md text-sm font-medium transition-colors ml-4 mt-2 sm:mt-0`}
        >
          Upgrade Now
        </Link>
      </div>
    </div>
  );
};

export default TrialBanner;
