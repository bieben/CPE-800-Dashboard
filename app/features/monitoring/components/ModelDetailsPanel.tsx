'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/shared/components/ui/card';
import { Badge } from '@/features/shared/components/ui/badge';
import { useModels } from '@/features/models/context/ModelContext';

interface ModelStatus {
  status: 'active' | 'inactive' | 'failed' | string;
  metadata?: {
    upload_time: string;
    feature_names: string[];
    feature_count: number;
  };
  performance?: {
    total_predictions: number;
    avg_latency_ms: number;
    last_prediction: string;
  };
}

interface ModelDetailsProps {
  loading: boolean;
}

const MetricCard = ({ 
  title, 
  value, 
  unit = '' 
}: { 
  title: string; 
  value: number | string; 
  unit?: string 
}) => (
  <div className="bg-gray-50 p-3 rounded-md">
    <p className="text-xs font-medium text-gray-500">{title}</p>
    <p className="mt-1 text-lg font-semibold text-gray-900">
      {value}{unit}
    </p>
  </div>
);

const ModelDetailsPanel: React.FC<ModelDetailsProps> = ({ loading }) => {
  const modelsContext = useModels();
  const models = modelsContext?.models || [];
  const [modelStatuses, setModelStatuses] = useState<Record<string, ModelStatus>>({});
  const [error, setError] = useState<string | null>(null);
  
  const fetchModelStatuses = async () => {
    try {
      const response = await fetch('http://localhost:5000/models/status');
      
      if (!response.ok) {
        throw new Error('Failed to fetch model statuses');
      }
      
      const statusData = await response.json();
      console.log('API Response for model statuses:', statusData);
      
      // 灵活处理不同的API响应格式
      let modelsData: Record<string, ModelStatus> = {};
      
      // 情况1: 数组格式，第一个元素包含models对象
      if (Array.isArray(statusData) && statusData.length > 0 && statusData[0]?.models) {
        modelsData = statusData[0].models;
      } 
      // 情况2: 直接包含models对象
      else if (statusData?.models) {
        modelsData = statusData.models;
      }
      // 情况3: 本身就是模型状态的映射
      else if (typeof statusData === 'object' && statusData !== null) {
        // 检查所有顶级对象是否类似于模型状态
        for (const key in statusData) {
          const value = statusData[key];
          if (value && typeof value === 'object' && (value.status || value.metadata)) {
            modelsData[key] = value as ModelStatus;
          }
        }
      }
      
      setModelStatuses(modelsData);
    } catch (err) {
      console.error('Error fetching model statuses:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch model statuses');
    }
  };
  
  useEffect(() => {
    fetchModelStatuses();
    const interval = setInterval(fetchModelStatuses, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Model Details</CardTitle>
          <CardDescription>Loading model details...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-4 text-center text-gray-500">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Model Details</CardTitle>
          <CardDescription>Error loading model details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-4 text-center text-red-500">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Map our frontend models to their backend status
  const modelsWithStatus = models.map(model => {
    const backendModelId = model.model_id || model.name.toLowerCase().replace(/\s+/g, '_');
    const status = modelStatuses[backendModelId] || { status: 'unknown' };
    
    // 确保status对象有所有必要的属性
    if (!status.metadata) {
      status.metadata = {
        upload_time: 'Unknown',
        feature_names: [],
        feature_count: 0
      };
    }
    
    if (!status.performance) {
      status.performance = {
        total_predictions: 0,
        avg_latency_ms: 0,
        last_prediction: 'Never'
      };
    }
    
    return { ...model, backendStatus: status };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Details</CardTitle>
        <CardDescription>Status and metrics for all registered models</CardDescription>
      </CardHeader>
      <CardContent>
        {modelsWithStatus.length > 0 ? (
          <div className="space-y-4">
            {modelsWithStatus.map((model) => (
              <div key={model.id} className="border border-gray-200 rounded-md p-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-lg font-medium">{model.name}</h3>
                    <p className="text-sm text-gray-500">v{model.version}</p>
                  </div>
                  <Badge variant={
                    model.backendStatus.status === 'active' ? 'success' : 
                    model.backendStatus.status === 'inactive' ? 'secondary' : 
                    'destructive'
                  }>
                    {model.backendStatus.status}
                  </Badge>
                </div>
                
                {model.backendStatus.metadata && model.backendStatus.performance && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    <MetricCard 
                      title="Feature Count" 
                      value={model.backendStatus.metadata.feature_count || 0} 
                    />
                    <MetricCard 
                      title="Total Predictions" 
                      value={model.backendStatus.performance.total_predictions || 0} 
                    />
                    <MetricCard 
                      title="Avg Latency" 
                      value={parseFloat((model.backendStatus.performance.avg_latency_ms || 0).toString()).toFixed(2)}
                      unit="ms" 
                    />
                    <MetricCard 
                      title="Last Used" 
                      value={
                        !model.backendStatus.performance.last_prediction || 
                        model.backendStatus.performance.last_prediction === 'Never' ? 
                        'Never' : 
                        new Date(model.backendStatus.performance.last_prediction).toLocaleTimeString()
                      }
                    />
                  </div>
                )}
                
                {(!model.backendStatus.metadata || !model.backendStatus.performance) && (
                  <p className="text-sm text-yellow-600 mt-2">
                    This model has not been uploaded to the monitoring system yet or has incomplete metadata.
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-gray-500">
            No models found. Please add models from the Models page.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ModelDetailsPanel; 