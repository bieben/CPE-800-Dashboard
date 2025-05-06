'use client';

import ProtectedLayout from '@/features/shared/components/ProtectedLayout';
import FedoraDeployForm from '@/features/deploy/components/FedoraDeployForm';

export default function FedoraDeployPage() {
  return (
    <ProtectedLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          Deploy Fedora Server
        </h1>
        <FedoraDeployForm />
      </div>
    </ProtectedLayout>
  );
} 