import React from 'react';
import Navigation from '@/features/shared/components/Navigation';

export default function MonitoringLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      {children}
    </div>
  )
} 