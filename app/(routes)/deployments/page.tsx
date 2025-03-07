'use client';

import ProtectedLayout from '@/features/shared/components/ProtectedLayout';
import DeploymentsList from '@/features/deployments/components/DeploymentsList';

export default function DeploymentsPage() {
  return (
    <ProtectedLayout>
      <DeploymentsList />
    </ProtectedLayout>
  );
} 