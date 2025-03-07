'use client';

import ProtectedLayout from '@/features/shared/components/ProtectedLayout';
import ModelsList from '@/features/models/components/ModelsList';

export default function ModelsPage() {
  return (
    <ProtectedLayout>
      <ModelsList />
    </ProtectedLayout>
  );
} 