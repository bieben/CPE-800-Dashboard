'use client';

import { useEffect, useState } from 'react';
import { useModels } from '../../models/context/ModelContext';

// Types
interface ModelMetrics {
  predictRequests: number;
  avgLatency: number;
  activeModels: number;
  modelMetrics: Record<string, ModelStatus>;
}

interface ModelStatus {
  status: 'active' | 'inactive' | 'unknown';
  metadata: {
    upload_time: string;
    feature_names: string[];
    feature_count: number;
  };
  performance: {
    total_predictions: number;
    avg_latency_ms: number;
    last_prediction: string;
  };
  deployment: {
    deployed: boolean;
    deploy_config: {
      resources: {
        cpu: string;
        memory: string;
        gpu: string;
      };
    };
    deploy_time: string;
    service?: {
      url: string;
      port: number;
      health?: any;
      uptime?: number;
    };
  };
  resources?: {
    cpu_usage_percent: number;
    memory_usage_bytes: number;
    memory_usage_percent: number;
    network_io?: {
      read_bytes: number;
      write_bytes: number;
    };
    network_io_rate?: number;
    pid?: number;
    port?: number;
    uptime?: number;
  };
}

interface Alert {
  modelId: string;
  message: string;
  timestamp: string;
  type: 'latency' | 'error' | 'resource';
}

interface PredictionState {
  selectedModel: string;
  features: Record<string, number>;
  loading: boolean;
  error: string | null;
  result: {
    prediction: number;
    latency: number;
    model_stats: {
      total_predictions: number;
      avg_latency: number;
    };
    note?: string;
    service_info?: {
      url: string;
      version?: string;
      load?: number;
    };
  } | null;
}

// Constants
const REFRESH_INTERVAL = 5000;
const LATENCY_THRESHOLD = 1000;

// Components
const MetricsCard = ({ title, value, unit = '' }: { title: string; value: number | string; unit?: string }) => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <p className="text-sm font-medium text-gray-500">{title}</p>
    <p className="mt-1 text-2xl font-semibold text-gray-900">
      {typeof value === 'number' ? value.toLocaleString() : value}{unit}
    </p>
  </div>
);

const ResourceInfo = ({ resources, modelResources }: { 
  resources: ModelStatus['deployment']['deploy_config']['resources'], 
  modelResources?: ModelStatus['resources'] 
}) => {
  if (!resources && !modelResources) {
    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-900">Resources</h4>
        <div className="mt-2 text-sm text-gray-500">No resource information available</div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-900">Resources</h4>
      <div className="mt-2 grid grid-cols-3 gap-4">
        {resources && Object.entries(resources).map(([key, value]) => (
          <div key={key}>
            <p className="text-xs text-gray-500">{key.toUpperCase()} (Allocated)</p>
            <p className="text-sm font-medium text-gray-900">{value || 'N/A'}</p>
          </div>
        ))}
        
        {modelResources && (
          <>
            <div>
              <p className="text-xs text-gray-500">CPU (Usage)</p>
              <p className="text-sm font-medium text-gray-900">{modelResources.cpu_usage_percent?.toFixed(2) || 0}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">MEMORY (Usage)</p>
              <p className="text-sm font-medium text-gray-900">
                {modelResources.memory_usage_bytes 
                  ? `${(modelResources.memory_usage_bytes / (1024 * 1024)).toFixed(2)} MB (${modelResources.memory_usage_percent?.toFixed(2)}%)`
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">NETWORK (I/O)</p>
              <p className="text-sm font-medium text-gray-900">
                {modelResources.network_io_rate !== undefined 
                  ? `${(modelResources.network_io_rate / 1024).toFixed(2)} KB/s`
                  : 'N/A'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ServiceInfo = ({ service }: { service: ModelStatus['deployment']['service'] }) => {
  if (!service) {
    return null;
  }

  return (
    <div className="mt-4 bg-blue-50 p-3 rounded-md">
      <h4 className="text-sm font-medium text-blue-900">Service Information</h4>
      <div className="mt-2 space-y-2">
        <div className="flex justify-between">
          <span className="text-xs text-blue-700">Endpoint:</span>
          <span className="text-sm font-medium text-blue-900">{service.url}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-blue-700">Port:</span>
          <span className="text-sm font-medium text-blue-900">{service.port}</span>
        </div>
        {service.uptime !== undefined && (
          <div className="flex justify-between">
            <span className="text-xs text-blue-700">Uptime:</span>
            <span className="text-sm font-medium text-blue-900">
              {Math.floor(service.uptime / 86400)}d {Math.floor((service.uptime % 86400) / 3600)}h {Math.floor((service.uptime % 3600) / 60)}m
            </span>
          </div>
        )}
        {service.health && (
          <div className="flex justify-between">
            <span className="text-xs text-blue-700">Health:</span>
            <span className="text-sm font-medium text-blue-900">{service.health.status || 'Unknown'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const AlertItem = ({ alert }: { alert: Alert }) => (
  <div className={`p-4 rounded-lg ${
    alert.type === 'latency' ? 'bg-yellow-50' :
    alert.type === 'error' ? 'bg-red-50' : 'bg-orange-50'
  }`}>
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-sm font-medium ${
          alert.type === 'latency' ? 'text-yellow-800' :
          alert.type === 'error' ? 'text-red-800' : 'text-orange-800'
        }`}>
          {alert.modelId}
        </p>
        <p className="mt-1 text-sm text-gray-600">{alert.message}</p>
      </div>
      <p className="text-sm text-gray-500">
        {new Date(alert.timestamp).toLocaleString()}
      </p>
    </div>
  </div>
);

export default function AnalyticsDashboard() {
  const { models } = useModels();
  const [metrics, setMetrics] = useState<ModelMetrics>({
    predictRequests: 0,
    avgLatency: 0,
    activeModels: 0,
    modelMetrics: {},
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [prediction, setPrediction] = useState<PredictionState>({
    selectedModel: '',
    features: {},
    loading: false,
    error: null,
    result: null,
  });
  const [featuresInput, setFeaturesInput] = useState('{}');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [featureTemplate, setFeatureTemplate] = useState<string[]>([]);

  const fetchMetrics = async () => {
    try {
      const [prometheusData, modelStatusResponse, modelResourcesResponse] = await Promise.all([
        fetch('http://localhost:5000/metrics').then(res => res.text()),
        fetch('http://localhost:5000/models/status').then(res => res.json()),
        fetch('http://localhost:5000/models/resources').then(res => res.json()),
      ]);

      // Parse Prometheus metrics - 使用正确的指标名称
      const predictRequestsRegex = /model_service_requests_total{endpoint="\/predict",model_id="([^"]+)"} (\d+\.\d+)/g;
      let predictRequests = 0;
      let match;
      
      while ((match = predictRequestsRegex.exec(prometheusData)) !== null) {
        predictRequests += parseFloat(match[2]);
      }

      // 计算平均响应时间
      let totalLatencySum = 0;
      let totalLatencyCount = 0;
      
      const latencySumTotalRegex = /model_service_response_time_seconds_sum{[^}]*} (\d+\.\d+)/g;
      const latencyCountTotalRegex = /model_service_response_time_seconds_count{[^}]*} (\d+\.\d+)/g;
      
      while ((match = latencySumTotalRegex.exec(prometheusData)) !== null) {
        totalLatencySum += parseFloat(match[1]);
      }
      
      while ((match = latencyCountTotalRegex.exec(prometheusData)) !== null) {
        totalLatencyCount += parseFloat(match[1]);
      }
      
      const avgLatency = totalLatencyCount > 0 ? totalLatencySum / totalLatencyCount : 0;

      // 从 Prometheus 获取活跃服务指标
      const activeServicesMatch = prometheusData.match(/active_model_services{[^}]*} (\d+)/);
      const activeServices = activeServicesMatch ? parseInt(activeServicesMatch[1]) : 0;

      // 解析各模型的预测请求计数
      const modelRequestCounts: Record<string, number> = {};
      const modelLatencySums: Record<string, number> = {};
      const requestCountRegex = /model_service_requests_total{endpoint="\/predict",model_id="([^"]+)"} (\d+\.\d+)/g;
      const latencySumRegex = /model_service_response_time_seconds_sum{endpoint="\/predict",model_id="([^"]+)"} (\d+\.\d+)/g;
      
      while ((match = requestCountRegex.exec(prometheusData)) !== null) {
        const modelId = match[1];
        const count = parseFloat(match[2]);
        modelRequestCounts[modelId] = count;
      }
      
      while ((match = latencySumRegex.exec(prometheusData)) !== null) {
        const modelId = match[1];
        const sum = parseFloat(match[2]);
        modelLatencySums[modelId] = sum;
      }
      
      // 正确解析API返回的数据格式
      let modelMetrics: Record<string, any> = {};
      
      console.log('Model status response:', modelStatusResponse);
      
      // 处理不同的API响应格式
      if (Array.isArray(modelStatusResponse) && modelStatusResponse.length > 0) {
        // 格式1: 数组，第一个元素包含models对象
        const [modelStatusData] = modelStatusResponse;
        if (modelStatusData?.models) {
          modelMetrics = modelStatusData.models;
        }
      } else if (modelStatusResponse?.models) {
        // 格式2: 直接包含models对象
        modelMetrics = modelStatusResponse.models;
      } else if (typeof modelStatusResponse === 'object' && modelStatusResponse !== null) {
        // 格式3: 本身就是模型状态的映射或其他格式
        if (Object.keys(modelStatusResponse).some(key => 
          typeof modelStatusResponse[key] === 'object' && 
          (modelStatusResponse[key]?.status || modelStatusResponse[key]?.metadata)
        )) {
          // 找到看起来像模型状态对象的键值
          for (const key in modelStatusResponse) {
            const value = modelStatusResponse[key];
            if (
              value && 
              typeof value === 'object' && 
              (value.status || value.metadata || value.performance)
            ) {
              modelMetrics[key] = value;
            }
          }
        } else {
          // 如果没有找到适合的结构，使用整个响应
          modelMetrics = modelStatusResponse;
        }
      } else {
        console.warn('Unexpected model status response format:', modelStatusResponse);
        // 创建一个默认的空的模型指标对象以防止错误
        modelMetrics = {};
      }
      
      // 处理资源使用信息
      console.log('Model resources response:', modelResourcesResponse);
      if (modelResourcesResponse?.data && typeof modelResourcesResponse.data === 'object') {
        // 删除系统级别的指标，只保留模型级别的指标
        const { system, ...modelResources } = modelResourcesResponse.data;
        
        // 将资源信息添加到每个模型的指标中
        Object.entries(modelResources).forEach(([modelId, resourceData]: [string, any]) => {
          if (modelMetrics[modelId]) {
            modelMetrics[modelId].resources = resourceData;
          }
        });
      }
      
      // 确保每个模型条目都有所需的结构
      Object.entries(modelMetrics).forEach(([modelId, info]: [string, any]) => {
        // 如果模型信息不完整，添加默认结构
        if (!info.performance) {
          info.performance = {
            total_predictions: 0,
            avg_latency_ms: 0,
            last_prediction: 'Never'
          };
        }
        
        if (!info.metadata) {
          info.metadata = {
            upload_time: 'Unknown',
            feature_names: [],
            feature_count: 0
          };
        }
        
        // 更新模型统计数据，使用从metrics获取的预测次数
        if (modelRequestCounts[modelId] !== undefined) {
          info.performance.total_predictions = Math.floor(modelRequestCounts[modelId]);
          
          // 如果有请求数，更新最近预测时间
          if (modelRequestCounts[modelId] > 0 && info.performance.last_prediction === 'Never') {
            info.performance.last_prediction = new Date().toISOString();
          }
          
          // 更新平均延迟
          if (modelLatencySums[modelId] !== undefined && modelRequestCounts[modelId] > 0) {
            info.performance.avg_latency_ms = (modelLatencySums[modelId] / modelRequestCounts[modelId]) * 1000;
          }
        }
      });

      Object.entries(modelMetrics).forEach(([modelId, info]: [string, any]) => {
        if (info?.performance?.avg_latency_ms > LATENCY_THRESHOLD) {
          setAlerts(prev => [
            ...prev.filter(a => !(a.modelId === modelId && a.type === 'latency')),
            {
              modelId,
              message: `High latency detected: ${info.performance.avg_latency_ms.toFixed(2)}ms`,
              timestamp: new Date().toISOString(),
              type: 'latency'
            }
          ]);
        }
      });

      setMetrics({
        predictRequests,
        avgLatency,
        activeModels: activeServices || Object.values(modelMetrics).filter((m: any) => m.status === 'active').length,
        modelMetrics,
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const handlePredict = async () => {
    if (!prediction.selectedModel || !Object.keys(prediction.features).length) {
      setPrediction(prev => ({ ...prev, error: 'Please select a model and configure features' }));
      return;
    }

    setPrediction(prev => ({ ...prev, loading: true, error: null }));

    try {
      const model = models.find(m => m.id === prediction.selectedModel);
      if (!model) throw new Error('Selected model not found');

      const modelId = model.name.toLowerCase().replace(/\s+/g, '_');
      
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelId,
          features: Object.values(prediction.features),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Prediction failed with status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // 添加模型统计信息到预测结果
      const enhancedData = {
        ...data,
        model_stats: {
          total_predictions: 0,  // 这个会在刷新度量后更新
          avg_latency: data.latency
        }
      };

      setPrediction(prev => ({ ...prev, result: enhancedData }));
      
      // 成功预测后立即刷新度量数据，不使用延迟
      await fetchMetrics();
      
      // 使用最新的指标更新预测结果中的统计信息
      if (metrics.modelMetrics[modelId]) {
        const updatedStats = {
          ...enhancedData,
          model_stats: {
            total_predictions: metrics.modelMetrics[modelId]?.performance?.total_predictions || 0,
            avg_latency: metrics.modelMetrics[modelId]?.performance?.avg_latency_ms 
              ? metrics.modelMetrics[modelId].performance.avg_latency_ms / 1000 
              : data.latency
          }
        };
        setPrediction(prev => ({ ...prev, result: updatedStats }));
      }
    } catch (error) {
      setPrediction(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Prediction failed'
      }));
    } finally {
      setPrediction(prev => ({ ...prev, loading: false }));
    }
  };

  const handleFeaturesInput = (value: string) => {
    setFeaturesInput(value);
    if (featureTemplate.length > 0) {
      try {
        const parsedFeatures = JSON.parse(value);
        const validation = validateFeatures(value, featureTemplate);
        setValidationError(validation.error);
        if (validation.isValid) {
          // Ensure features are set in template order
          const orderedFeatures = featureTemplate.reduce((acc: Record<string, number>, feature: string) => {
            acc[feature] = parsedFeatures[feature];
            return acc;
          }, {});
          
          setPrediction(prev => ({
            ...prev,
            features: orderedFeatures
          }));
        }
      } catch (e) {
        setValidationError('Invalid JSON format');
      }
    }
  };

  const handleModelSelect = async (modelId: string) => {
    setPrediction(prev => ({ ...prev, selectedModel: modelId }));
    
    const model = models.find(m => m.id === modelId);
    if (model) {
      try {
        const response = await fetch('http://localhost:5000/models/status');
        const responseData = await response.json();
        console.log('API Response in handleModelSelect:', responseData);
        
        const modelKey = model.name.toLowerCase().replace(/\s+/g, '_');
        
        // 灵活处理不同的API响应格式
        let modelInfo = null;
        
        // 格式1: 数组格式，第一个元素包含models对象
        if (Array.isArray(responseData) && responseData.length > 0) {
          if (responseData[0]?.models && responseData[0].models[modelKey]) {
            modelInfo = responseData[0].models[modelKey];
          }
        } 
        // 格式2: 直接包含models对象
        else if (responseData?.models && responseData.models[modelKey]) {
          modelInfo = responseData.models[modelKey];
        }
        // 格式3: 本身就是模型状态的映射
        else if (typeof responseData === 'object' && responseData !== null) {
          if (responseData[modelKey]) {
            modelInfo = responseData[modelKey];
          }
        }
        
        if (modelInfo?.metadata?.feature_names) {
          const features = modelInfo.metadata.feature_names;
          setFeatureTemplate(features);
          
          // Create initial feature object with all values set to 0
          const template = features.reduce((acc: Record<string, number>, feature: string) => {
            acc[feature] = 0;
            return acc;
          }, {});
          
          // Update feature configuration
          setPrediction(prev => ({
            ...prev,
            features: template
          }));
          
          // Update input box JSON
          const formattedTemplate = JSON.stringify(template, null, 2);
          setFeaturesInput(formattedTemplate);
        } else {
          setValidationError('Unable to get model feature information');
        }
      } catch (error) {
        console.error('Failed to fetch model features:', error);
        setValidationError('Failed to get model feature information');
      }
    }
  };

  const validateFeatures = (input: string, expectedFeatures: string[]) => {
    try {
      const features = JSON.parse(input);
      
      if (typeof features !== 'object' || Array.isArray(features) || features === null) {
        return { isValid: false, error: 'Input must be a JSON object' };
      }

      const missingFeatures = expectedFeatures.filter(f => !(f in features));
      if (missingFeatures.length > 0) {
        return { 
          isValid: false, 
          error: `Missing required features: ${missingFeatures.join(', ')}` 
        };
      }

      const extraFeatures = Object.keys(features).filter(f => !expectedFeatures.includes(f));
      if (extraFeatures.length > 0) {
        return { 
          isValid: false, 
          error: `Unexpected features found: ${extraFeatures.join(', ')}` 
        };
      }

      const nonNumberFeatures = Object.entries(features)
        .filter(([_, value]) => typeof value !== 'number')
        .map(([key]) => key);
      
      if (nonNumberFeatures.length > 0) {
        return { 
          isValid: false, 
          error: `Features must be numbers: ${nonNumberFeatures.join(', ')}` 
        };
      }

      return { isValid: true, error: null };
    } catch (e) {
      return { isValid: false, error: 'Invalid JSON format' };
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="bg-white overflow-hidden shadow-sm rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricsCard title="Total Predictions" value={Math.floor(metrics.predictRequests)} />
          <MetricsCard title="Average Latency" value={(metrics.avgLatency * 1000).toFixed(2)} unit="ms" />
          <MetricsCard title="Active Models" value={metrics.activeModels} />
        </div>
      </div>

      {/* Model Details */}
      <div className="bg-white overflow-hidden shadow-sm rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Model Details</h2>
        <div className="space-y-4">
          {Object.entries(metrics.modelMetrics).map(([modelId, modelInfo]) => (
            <div key={modelId} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-gray-900">{modelId}</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  modelInfo?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {modelInfo?.status || 'unknown'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricsCard 
                  title="Total Predictions" 
                  value={modelInfo?.performance?.total_predictions || 0} 
                />
                <MetricsCard 
                  title="Avg Latency" 
                  value={`${modelInfo?.performance?.avg_latency_ms?.toFixed(2) || '0.00'}ms`} 
                />
                <MetricsCard 
                  title="Last Prediction" 
                  value={modelInfo?.performance?.last_prediction ? 
                    new Date(modelInfo.performance.last_prediction).toLocaleString() : 'Never'} 
                />
                <MetricsCard 
                  title="Features" 
                  value={modelInfo?.metadata?.feature_count || 0} 
                />
              </div>

              {modelInfo?.deployment?.deploy_config && (
                <ResourceInfo 
                  resources={modelInfo.deployment.deploy_config.resources} 
                  modelResources={modelInfo.resources}
                />
              )}
              {modelInfo?.deployment?.service && (
                <ServiceInfo service={modelInfo.deployment.service} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Prediction Test Panel */}
      <div className="bg-white overflow-hidden shadow-sm rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Prediction Test</h2>
        <div className="space-y-4">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Model
            </label>
            <select
              value={prediction.selectedModel}
              onChange={(e) => handleModelSelect(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="">Select a model</option>
              {models
                .filter(model => model.status === 'running')
                .map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} (v{model.version})
                  </option>
                ))}
            </select>
          </div>

          {/* Feature Configuration */}
          {prediction.selectedModel && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900">Configure Features</h3>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Features JSON
                  </label>
                  {featureTemplate.length > 0 && (
                    <span className="text-xs text-gray-500">
                      Required features: {featureTemplate.length}
                    </span>
                  )}
                </div>
                <textarea
                  value={featuresInput}
                  onChange={(e) => handleFeaturesInput(e.target.value)}
                  className={`block w-full rounded-md shadow-sm sm:text-sm font-mono ${
                    validationError 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  rows={8}
                  placeholder="Enter features as JSON object"
                />
                {validationError ? (
                  <p className="mt-2 text-sm text-red-600">
                    {validationError}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">
                    Enter feature values as a JSON object with the required feature names
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Predict Button and Results */}
          <div className="mt-4">
            <button
              onClick={handlePredict}
              disabled={prediction.loading || !prediction.selectedModel}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                prediction.loading || !prediction.selectedModel
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {prediction.loading ? 'Processing...' : 'Make Prediction'}
            </button>

            {prediction.error && (
              <div className="mt-2 text-sm text-red-600">
                {prediction.error}
              </div>
            )}

            {prediction.result && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <h4 className="text-sm font-medium text-gray-900">Prediction Result</h4>
                <div className="mt-2 space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Prediction: </span>
                    <span className="text-sm font-medium text-gray-900">
                      {typeof prediction.result.prediction === 'number' 
                        ? prediction.result.prediction.toFixed(4)
                        : prediction.result.prediction}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Response Time: </span>
                    <span className="text-sm font-medium text-gray-900">
                      {(prediction.result.latency * 1000).toFixed(2)}ms
                    </span>
                  </div>
                  {prediction.result.model_stats && (
                    <>
                      <div>
                        <span className="text-sm text-gray-500">Total Predictions: </span>
                        <span className="text-sm font-medium text-gray-900">
                          {prediction.result.model_stats.total_predictions.toLocaleString()}
                          <button 
                            onClick={fetchMetrics} 
                            className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                            title="Refresh metrics"
                          >
                            ↻
                          </button>
                        </span>
                      </div>
                      {prediction.result.model_stats.avg_latency > 0 && (
                        <div>
                          <span className="text-sm text-gray-500">Average Latency: </span>
                          <span className="text-sm font-medium text-gray-900">
                            {`${(prediction.result.model_stats.avg_latency * 1000).toFixed(2)}ms`}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {prediction.result.note && (
                    <div>
                      <span className="text-sm text-gray-500">Note: </span>
                      <span className="text-sm italic text-gray-600">
                        {prediction.result.note}
                      </span>
                    </div>
                  )}
                  {prediction.result.service_info && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <h5 className="text-sm font-medium text-gray-900">Service Information</h5>
                      <div className="mt-1 space-y-1">
                        {prediction.result.service_info.url && (
                          <div>
                            <span className="text-xs text-gray-500">Endpoint: </span>
                            <span className="text-xs font-medium text-gray-700">
                              {prediction.result.service_info.url}
                            </span>
                          </div>
                        )}
                        {prediction.result.service_info.version && (
                          <div>
                            <span className="text-xs text-gray-500">Version: </span>
                            <span className="text-xs font-medium text-gray-700">
                              {prediction.result.service_info.version}
                            </span>
                          </div>
                        )}
                        {prediction.result.service_info.load !== undefined && (
                          <div>
                            <span className="text-xs text-gray-500">Current Load: </span>
                            <span className="text-xs font-medium text-gray-700">
                              {prediction.result.service_info.load.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white overflow-hidden shadow-sm rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Alerts</h2>
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <p className="text-sm text-gray-500">No active alerts</p>
          ) : (
            alerts.map((alert, index) => (
              <AlertItem key={`${alert.modelId}-${alert.timestamp}-${index}`} alert={alert} />
            ))
          )}
        </div>
      </div>
    </div>
  );
} 