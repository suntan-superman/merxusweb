import TeamUsersWorkspace from '../../components/admin/TeamUsersWorkspace';
import ActivityLog from '../../components/voice/ActivityLog';

export default function VoiceUsersPage() {
  return (
    <TeamUsersWorkspace
      tenantType="voice"
      footer={(
        <div className="mt-2">
          <ActivityLog limit={20} />
        </div>
      )}
    />
  );
}

