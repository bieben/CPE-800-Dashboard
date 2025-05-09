'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  ResourcePrediction,
  OptimizationResult,
  PredictiveAlert,
  PredictionResponse,
  PredictionTriggerOptions,
  ResourceMetric
} from '../types/predictive';

interface PredictiveContextType {
  predictions: Record<string, ResourcePrediction[]>;
  optimizationResults: OptimizationResult[];
  currentMetrics: ResourceMetric[];
  alerts: PredictiveAlert[];
  lastUpdated: string | null;
  isLoading: boolean;
  error: string | null;
  fetchPredictions: () => Promise<void>;
  triggerPrediction: (options: PredictionTriggerOptions) => Promise<void>;
  fetchSystemMetrics: () => Promise<void>;
}

const PredictiveContext = createContext<PredictiveContextType | undefined>(undefined);

export const usePredictive = () => {
  const context = useContext(PredictiveContext);
  if (context === undefined) {
    throw new Error('usePredictive must be used within a PredictiveProvider');
  }
  return context;
};

export const PredictiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [predictions, setPredictions] = useState<Record<string, ResourcePrediction[]>>({});
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<ResourceMetric[]>([]);
  const [alerts, setAlerts] = useState<PredictiveAlert[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 获取最新预测
  const fetchPredictions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5001/api/v1/predictions/latest');
      
      if (!response.ok) {
        throw new Error(`Error fetching predictions: ${response.statusText}`);
      }
      
      // 获取原始文本响应
      const text = await response.text();
      
      // 处理 NaN 值
      const sanitizedText = text.replace(/: ?NaN/g, ': 0');
      
      // 解析 JSON
      let data;
      try {
        data = JSON.parse(sanitizedText);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        throw new Error('Invalid JSON response from server');
      }
      
      if (data.status === 'success' && data.data) {
        // 确保 predictions 存在且是一个数组
        const predictionsArray = Array.isArray(data.data.predictions) ? data.data.predictions : [];
        
        // 处理预测数据
        const predictionData: Record<string, ResourcePrediction[]> = {
          'requests': predictionsArray.map((item: any) => ({
            timestamp: item.timestamp || new Date().toISOString(),
            resource: 'requests',
            predicted_value: Number(item.requests_total) || 0,
            lower_bound: Number(item.requests_total_lower) || 0,
            upper_bound: Number(item.requests_total_upper) || 0
          })),
          'latency': predictionsArray.map((item: any) => ({
            timestamp: item.timestamp || new Date().toISOString(),
            resource: 'latency',
            predicted_value: Number(item.latency_p95) || 0,
            lower_bound: Number(item.latency_p95_lower) || 0,
            upper_bound: Number(item.latency_p95_upper) || 0
          }))
        };
        
        setPredictions(predictionData);
        
        // 处理优化结果
        const optimizationData = data.data.optimization || {};
        setOptimizationResults([{
          resource_type: 'CPU',
          current_allocation: optimizationData.utilization?.cpu || 0,
          suggested_allocation: optimizationData.cpu_allocation || 0,
          estimated_savings: 0,
          unit: '%'
        }, {
          resource_type: 'Memory',
          current_allocation: optimizationData.utilization?.memory || 0,
          suggested_allocation: optimizationData.memory_allocation || 0,
          estimated_savings: 0,
          unit: '%'
        }, {
          resource_type: 'Network',
          current_allocation: optimizationData.utilization?.network || 0,
          suggested_allocation: optimizationData.network_allocation || 0,
          estimated_savings: 0,
          unit: '%'
        }]);
        
        setLastUpdated(data.data.timestamp || new Date().toISOString());
        
        // 生成基于预测的告警
        generateAlertsFromPredictions(predictionData);
      } else {
        throw new Error('Invalid prediction data format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error in fetchPredictions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 触发新的预测
  const triggerPrediction = useCallback(async (options: PredictionTriggerOptions) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 先使用直接的 fetch，然后捕获错误
      const response = await fetch('http://localhost:5001/api/v1/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });
      
      if (!response.ok) {
        throw new Error(`Error triggering prediction: ${response.statusText}`);
      }
      
      // 获取原始文本响应
      const text = await response.text();
      
      // 处理 NaN 值
      const sanitizedText = text.replace(/: ?NaN/g, ': 0');
      
      // 解析 JSON
      let data;
      try {
        data = JSON.parse(sanitizedText);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        throw new Error('Invalid JSON response from server');
      }
      
      if (data.status === 'success' && data.data && Array.isArray(data.data.predictions)) {
        // 预测成功后获取新数据
        await fetchPredictions();
      } else {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format from prediction service');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error in triggerPrediction:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPredictions]);

  // 获取当前系统指标
  const fetchSystemMetrics = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:5001/api/v1/predictions/latest');
      
      if (!response.ok) {
        throw new Error(`Error fetching metrics: ${response.statusText}`);
      }
      
      const text = await response.text();
      const sanitizedText = text.replace(/: ?NaN/g, ': 0');
      const data = JSON.parse(sanitizedText);
      
      if (data.status === 'success' && data.data) {
        const utilization = data.data.optimization?.utilization || {};
        
        // 将原始指标转换为ResourceMetric格式
        const metricItems: ResourceMetric[] = [
          {
            name: 'CPU Usage',
            value: Number(utilization.cpu) || 0,
            unit: '%',
            status: Number(utilization.cpu) > 80 ? 'critical' : Number(utilization.cpu) > 60 ? 'warning' : 'normal'
          },
          {
            name: 'Memory Usage',
            value: Number(utilization.memory) || 0,
            unit: '%',
            status: Number(utilization.memory) > 90 ? 'critical' : Number(utilization.memory) > 75 ? 'warning' : 'normal'
          },
          {
            name: 'Network Usage',
            value: Number(utilization.network) || 0,
            unit: '%',
            status: Number(utilization.network) > 90 ? 'critical' : Number(utilization.network) > 75 ? 'warning' : 'normal'
          }
        ];
        
        setCurrentMetrics(metricItems);
      }
    } catch (err) {
      console.error('Error fetching system metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 生成基于预测的告警
  const generateAlertsFromPredictions = (predictions: Record<string, ResourcePrediction[]>) => {
    const newAlerts: PredictiveAlert[] = [];
    
    // 安全检查，确保predictions是对象且非空
    if (!predictions || typeof predictions !== 'object') {
      return;
    }
    
    // 遍历每个资源的预测
    Object.entries(predictions).forEach(([resource, predictionList]) => {
      // 确保predictionList是数组
      if (Array.isArray(predictionList)) {
        // 检查是否有预测值超过阈值
        const criticalPredictions = predictionList.filter(p => {
          if (resource.includes('cpu') && p.predicted_value > 85) return true;
          if (resource.includes('memory') && p.predicted_value > 90) return true;
          if (resource.includes('latency') && p.predicted_value > 500) return true;
          return false;
        });
        
        if (criticalPredictions.length > 0) {
          // 创建新的告警
          const firstCritical = criticalPredictions[0];
          newAlerts.push({
            resource,
            message: `Predicted ${resource} usage will exceed critical threshold (${firstCritical.predicted_value.toFixed(2)})`,
            severity: 'critical',
            timestamp: new Date().toISOString(),
            affected_models: ['all'] // 这里简化处理，实际应当根据影响的模型列表填充
          });
        }
      }
    });
    
    // 更新告警状态
    setAlerts(prev => [...prev, ...newAlerts]);
  };

  const value = {
    predictions,
    optimizationResults,
    currentMetrics,
    alerts,
    lastUpdated,
    isLoading,
    error,
    fetchPredictions,
    triggerPrediction,
    fetchSystemMetrics
  };

  return (
    <PredictiveContext.Provider value={value}>
      {children}
    </PredictiveContext.Provider>
  );
}; 