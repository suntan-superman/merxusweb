import TeamUsersWorkspace from '../../components/admin/TeamUsersWorkspace';
import ActivityLog from '../../components/voice/ActivityLog';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function VoiceUsersPage() {
  return (
    <ProtectedRoute requireAuth requireManager>
      <TeamUsersWorkspace
        tenantType="voice"
        footer={(
          <div className="mt-2">
            <ActivityLog limit={20} />
          </div>
        )}
      />
    </ProtectedRoute>
  );
}

