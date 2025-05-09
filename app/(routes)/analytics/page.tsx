'use client';

import ProtectedLayout from '@/features/shared/components/ProtectedLayout';
import SystemMetricsPanel from '@/features/analytics/components/SystemMetricsPanel';
import AnalyticsDashboard from '@/features/analytics/components/AnalyticsDashboard';

export default function AnalyticsPage() {
  return (
    <ProtectedLayout>
      <SystemMetricsPanel />
      <div className="h-8" />
      <AnalyticsDashboard />
    </ProtectedLayout>
  );
} 