import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/shared/components/ui/card';
import { Badge } from '@/features/shared/components/ui/badge';
import { HealthStatus } from '../services/monitoringService';

interface HealthStatusPanelProps {
  healthStatus: HealthStatus | null;
  loading: boolean;
}

const HealthStatusPanel: React.FC<HealthStatusPanelProps> = ({ healthStatus, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
          <CardDescription>Loading health status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-4 text-center text-gray-500">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!healthStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
          <CardDescription>Health status unavailable</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <span className="text-yellow-500 inline-block">⚠</span>
            <span className="text-xl font-bold text-yellow-500">Unknown</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Status</CardTitle>
        <CardDescription>
          Last updated: {new Date(healthStatus.timestamp).toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          {healthStatus.status === 'healthy' ? (
            <>
              <span className="text-green-500 inline-block">✓</span>
              <span className="text-xl font-bold text-green-500">Healthy</span>
            </>
          ) : (
            <>
              <span className="text-red-500 inline-block">⚠</span>
              <span className="text-xl font-bold text-red-500">Unhealthy</span>
            </>
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Component Status</h4>
          <div className="space-y-2">
            {Object.entries(healthStatus.services).map(([name, status]) => (
              <div key={name} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400 inline-block">◻</span>
                  <span className="capitalize">{name}</span>
                </div>
                <Badge variant={status === 'up' ? 'success' : 'secondary'}>
                  {status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Models</h4>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold">{healthStatus.models.deployed}</span>
            <span className="text-sm text-gray-500">deployed</span>
            <span className="text-sm text-gray-500 mx-2">of</span>
            <span className="text-xl font-bold">{healthStatus.models.total}</span>
            <span className="text-sm text-gray-500">total</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HealthStatusPanel; 