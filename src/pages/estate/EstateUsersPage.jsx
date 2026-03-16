import TeamUsersWorkspace from '../../components/admin/TeamUsersWorkspace';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function EstateUsersPage() {
  return (
    <ProtectedRoute requireAuth requireManager>
      <TeamUsersWorkspace tenantType="real_estate" />
    </ProtectedRoute>
  );
}

