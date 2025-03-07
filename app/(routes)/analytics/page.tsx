'use client';

import ProtectedLayout from '@/features/shared/components/ProtectedLayout';
import AnalyticsDashboard from '@/features/analytics/components/AnalyticsDashboard';

export default function AnalyticsPage() {
  return (
    <ProtectedLayout>
      <AnalyticsDashboard />
    </ProtectedLayout>
  );
} 