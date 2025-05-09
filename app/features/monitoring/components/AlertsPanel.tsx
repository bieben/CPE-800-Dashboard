import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/shared/components/ui/card';
import { Badge } from '@/features/shared/components/ui/badge';
import { Progress } from '@/features/shared/components/ui/progress';
import { AlertRule } from '../services/monitoringService';

interface AlertsPanelProps {
  alerts: AlertRule[];
  loading: boolean;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, loading }) => {
  const firingAlerts = alerts.filter(alert => alert.status === 'firing');
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alert Rules</CardTitle>
          <CardDescription>Loading alerts...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-4 text-center text-gray-500">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Alert Rules</CardTitle>
            <CardDescription>Configured alert rules from Prometheus</CardDescription>
          </div>
          {firingAlerts.length > 0 ? (
            <Badge variant="destructive">
              {firingAlerts.length} Firing
            </Badge>
          ) : (
            <Badge variant="success">All Clear</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="py-4 text-center text-gray-500">
            No alerts configured
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    {alert.status === 'firing' ? (
                      <span className={`inline-block ${alert.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'}`}>⚠</span>
                    ) : (
                      <span className="text-green-500 inline-block">✓</span>
                    )}
                    <span className="font-medium">{alert.name}</span>
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'warning'}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <Badge variant={alert.status === 'firing' ? 'destructive' : 'outline'}>
                    {alert.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mb-2">{alert.description}</p>
                <div className="flex items-center text-sm">
                  <span className="inline-block mr-1 text-gray-400">🕒</span>
                  <span>Since {new Date(alert.since).toLocaleString()}</span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Current: {alert.value}</span>
                    <span>Threshold: {alert.threshold}</span>
                  </div>
                  <Progress 
                    value={(alert.value / alert.threshold) * 100} 
                    className={`h-2 ${alert.status === 'firing' ? 'bg-red-500' : ''}`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsPanel; 