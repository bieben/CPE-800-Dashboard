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

  // 输出健康状态数据，便于调试
  console.log('Health status data:', healthStatus);

  // 设置服务状态优先级
  const getServiceStatus = (service: string, status: string): 'up' | 'warning' | 'down' => {
    // 对于API服务，必须是up状态
    if (service === 'api' && status !== 'up') return 'down';
    
    // 如果状态是up或running，返回up
    if (status === 'up' || status === 'running') return 'up';
    
    // 如果状态是warning，返回warning
    if (status === 'warning') return 'warning';
    
    // 对于collector这样的非关键服务，unknown状态视为正常
    if (service === 'collector' && status === 'unknown') return 'up';
    
    // 其他情况，返回down
    return 'down';
  };

  // 分析服务状态
  const servicesStatus = Object.entries(healthStatus.services).map(([name, status]) => ({
    name,
    status: getServiceStatus(name, status)
  }));
  
  // 检查是否有任何服务处于down状态
  const hasDownServices = servicesStatus.some(s => s.status === 'down');
  
  // 检查是否有任何服务处于warning状态
  const hasWarningServices = servicesStatus.some(s => s.status === 'warning');
  
  // 确定整体状态
  let overallStatus: 'healthy' | 'warning' | 'unhealthy' = 'healthy';
  if (hasDownServices) {
    overallStatus = 'unhealthy';
  } else if (hasWarningServices) {
    overallStatus = 'warning';
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
          {overallStatus === 'healthy' ? (
            <>
              <span className="text-green-500 inline-block">✓</span>
              <span className="text-xl font-bold text-green-500">Healthy</span>
            </>
          ) : overallStatus === 'warning' ? (
            <>
              <span className="text-yellow-500 inline-block">⚠</span>
              <span className="text-xl font-bold text-yellow-500">Warning</span>
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
            {servicesStatus.map(({ name, status }) => (
              <div key={name} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400 inline-block">◻</span>
                  <span className="capitalize">{name}</span>
                </div>
                <Badge 
                  variant={
                    status === 'up' 
                      ? 'success' 
                      : status === 'warning' 
                        ? 'warning' 
                        : 'destructive'
                  }
                >
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