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
      // 使用真实API获取模型状态
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE_URL}/models/status`);
      
      if (!response.ok) {
        throw new Error(`Error fetching model statuses: ${response.statusText}`);
      }
      
      // 防止JSON解析错误
      const text = await response.text();
      // 处理NaN值和其他可能导致JSON解析错误的内容
      const sanitizedText = text.replace(/: ?NaN/g, ': 0')
                               .replace(/: ?Infinity/g, ': 1e6')
                               .replace(/: ?-Infinity/g, ': -1e6');
      
      let data;
      try {
        data = JSON.parse(sanitizedText);
      } catch (e) {
        console.error('JSON parse error:', e, 'Raw response:', text);
        throw new Error('Invalid JSON response from server');
      }
      
      console.log('API Response for model statuses:', data);
      
      // 处理不同的API响应格式
      let modelsData: Record<string, ModelStatus> = {};
      
      // 如果有models对象
      if (data.models) {
        modelsData = data.models;
      } 
      // 如果本身就是模型状态的映射
      else if (typeof data === 'object' && data !== null) {
        // 检查所有顶级对象是否类似于模型状态
        for (const key in data) {
          const value = data[key];
          if (value && typeof value === 'object' && (value.status || value.metadata)) {
            modelsData[key] = value as ModelStatus;
          }
        }
      }
      
      setModelStatuses(modelsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching model statuses:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch model statuses');
      
      // 如果API无法访问，仍然显示前端知道的模型，但显示其状态为未知
      const fallbackStatuses: Record<string, ModelStatus> = {};
      models.forEach(model => {
        fallbackStatuses[model.model_id || model.name.toLowerCase().replace(/\s+/g, '_')] = {
          status: 'unknown',
          metadata: {
            upload_time: 'Unknown',
            feature_names: [],
            feature_count: 0
          },
          performance: {
            total_predictions: 0,
            avg_latency_ms: 0,
            last_prediction: 'Never'
          }
        };
      });
      setModelStatuses(fallbackStatuses);
    }
  };
  
  useEffect(() => {
    fetchModelStatuses();
    const interval = setInterval(fetchModelStatuses, 30000); // 每30秒刷新一次
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

  // 将前端模型与后端状态匹配
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
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Model Details</CardTitle>
            <CardDescription>Status and metrics for all registered models</CardDescription>
          </div>
          <button
            onClick={fetchModelStatuses}
            className="p-2 rounded-full hover:bg-gray-100"
            disabled={loading}
          >
            <span className={`inline-block ${loading ? 'animate-spin' : ''}`}>⟳</span>
          </button>
        </div>
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
                    model.backendStatus.status === 'unknown' ? 'outline' :
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