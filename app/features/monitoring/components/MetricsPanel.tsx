import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/shared/components/ui/card';
import { Progress } from '@/features/shared/components/ui/progress';
import { Metrics } from '../services/monitoringService';

interface MetricsPanelProps {
  metrics: Metrics | null;
  loading: boolean;
}

const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Loading metrics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-4 text-center text-gray-500">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Metrics unavailable</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-4 text-center text-gray-500">
            Unable to load metrics data
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard 
          title="Total Requests" 
          value={metrics.requestsTotal} 
          icon="📊" 
        />
        <MetricCard 
          title="Predictions" 
          value={metrics.predictionsTotal} 
          icon="🔮" 
        />
        <MetricCard 
          title="Errors" 
          value={metrics.errorsTotal} 
          icon="⚠️" 
          textColor={metrics.errorsTotal > 0 ? 'text-red-600' : undefined}
        />
      </div>
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Latency Metrics</CardTitle>
          <CardDescription>Performance measurements in seconds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <LatencyBar 
              label="Average Latency" 
              value={metrics.avgLatency} 
              threshold={1.0} 
              unit="s" 
            />
            <LatencyBar 
              label="P95 Latency" 
              value={metrics.p95Latency} 
              threshold={1.0} 
              unit="s" 
            />
            <LatencyBar 
              label="P99 Latency" 
              value={metrics.p99Latency} 
              threshold={1.5} 
              unit="s" 
            />
          </div>
        </CardContent>
      </Card>
      
      {metrics.errorTypes && Object.keys(metrics.errorTypes).length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Error Breakdown</CardTitle>
            <CardDescription>Errors by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(metrics.errorTypes).map(([type, count]) => (
                <div key={type} className="border rounded-lg p-4">
                  <div className="text-sm font-medium mb-1 capitalize">
                    {type.replace(/_/g, ' ')}
                  </div>
                  <div className="text-2xl font-bold text-red-600">{count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

interface MetricCardProps {
  title: string;
  value: number;
  icon?: string | React.ReactNode;
  textColor?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, textColor }) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          {icon && <div className="text-gray-400">{icon}</div>}
          <div className={`text-2xl font-bold ${textColor || ''}`}>{value}</div>
        </div>
      </CardContent>
    </Card>
  );
};

interface LatencyBarProps {
  label: string;
  value: number;
  threshold: number;
  unit?: string;
}

const LatencyBar: React.FC<LatencyBarProps> = ({ label, value, threshold, unit = '' }) => {
  const isWarning = value > threshold;
  
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className={isWarning ? 'text-yellow-600 font-semibold' : ''}>
          {value.toFixed(3)}{unit}
        </span>
      </div>
      <Progress 
        value={(value / threshold) * 100} 
        className={`h-2 ${isWarning ? 'bg-yellow-500' : ''}`} 
      />
    </div>
  );
};

export default MetricsPanel; 