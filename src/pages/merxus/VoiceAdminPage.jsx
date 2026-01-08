import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function VoiceAdminPage() {
  const navigate = useNavigate();
  const { userClaims } = useAuth();

  useEffect(() => {
    // Only super-admins should access this page
    if (userClaims?.role !== 'super_admin') {
      navigate('/merxus', { replace: true });
      return;
    }

    // Redirect to the voices management page
    navigate('/merxus/voices', { replace: true });
  }, [navigate, userClaims]);

  return null;
}

