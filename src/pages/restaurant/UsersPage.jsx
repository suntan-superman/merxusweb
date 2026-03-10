import TeamUsersWorkspace from '../../components/admin/TeamUsersWorkspace';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function UsersPage() {
  return (
    <ProtectedRoute requireAuth requireOwner>
      <TeamUsersWorkspace tenantType="restaurant" />
    </ProtectedRoute>
  );
}

