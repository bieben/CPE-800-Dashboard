'use client';

import React from 'react';
import PredictiveAnalytics from '../../features/analytics/components/PredictiveAnalytics';
import Navigation from '@/features/shared/components/Navigation';

export default function PredictivePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PredictiveAnalytics />
      </main>
    </div>
  );
}