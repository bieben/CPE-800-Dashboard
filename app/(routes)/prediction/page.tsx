'use client';

import React from 'react';
import ProtectedLayout from '@/features/shared/components/ProtectedLayout';
import PredictiveAnalytics from '@/features/analytics/components/PredictiveAnalytics';

export default function PredictionPage() {
  return (
    <ProtectedLayout>
      <PredictiveAnalytics />
    </ProtectedLayout>
  );
} 