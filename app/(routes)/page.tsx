'use client';

import ProtectedLayout from '@/features/shared/components/ProtectedLayout';
import Dashboard from '@/features/dashboard/components/Dashboard';

export default function Home() {
  return (
    <ProtectedLayout>
      <Dashboard />
    </ProtectedLayout>
  );
} 