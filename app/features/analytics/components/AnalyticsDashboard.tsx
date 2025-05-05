'use client';

import { useEffect, useState } from 'react';
import { useModels } from '../../models/context/ModelContext';

// Types
interface ModelMetrics {
  totalRequests: number;
  avgLatency: number;
  activeModels: number;
  modelMetrics: Record<string, ModelStatus>;
}

interface ModelStatus {
  status: 'active' | 'inactive';
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

const ResourceInfo = ({ resources }: { resources: ModelStatus['deployment']['deploy_config']['resources'] }) => {
  if (!resources) {
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
        {Object.entries(resources).map(([key, value]) => (
          <div key={key}>
            <p className="text-xs text-gray-500">{key.toUpperCase()}</p>
            <p className="text-sm font-medium text-gray-900">{value || 'N/A'}</p>
          </div>
        ))}
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
    totalRequests: 0,
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
      const [prometheusData, modelStatus] = await Promise.all([
        fetch('http://localhost:5000/metrics').then(res => res.text()),
        fetch('http://localhost:5000/models/status').then(res => res.json()),
      ]);

      // Parse Prometheus metrics
      const totalRequests = (prometheusData.match(/model_inference_requests_total{[^}]*} (\d+)/g) || [])
        .reduce((sum, match) => sum + parseInt(match.match(/(\d+)$/)?.[1] || '0'), 0);

      const latencyMatch = prometheusData.match(/model_inference_latency_seconds_sum{[^}]*} (\d+\.\d+)/);
      const latencyCountMatch = prometheusData.match(/model_inference_latency_seconds_count{[^}]*} (\d+)/);
      const avgLatency = latencyMatch && latencyCountMatch
        ? parseFloat(latencyMatch[1]) / parseInt(latencyCountMatch[1])
        : 0;

      // Update metrics and check for alerts
      const [statusData] = modelStatus;
      const modelMetrics = statusData.models || {};
      
      Object.entries(modelMetrics).forEach(([modelId, info]: [string, any]) => {
        if (info.performance.avg_latency_ms > LATENCY_THRESHOLD) {
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
        totalRequests,
        avgLatency,
        activeModels: Object.values(modelMetrics).filter((m: any) => m.status === 'active').length,
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

      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: model.name.toLowerCase().replace(/\s+/g, '_'),
          features: Object.values(prediction.features),
        }),
      });

      const [data, statusCode] = await response.json();
      
      if (statusCode === 500 || data.error) {
        throw new Error(data.error || 'Prediction request failed');
      }

      setPrediction(prev => ({ ...prev, result: data }));
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
        const [data] = await response.json();
        const modelInfo = data.models[model.name.toLowerCase().replace(/\s+/g, '_')];
        
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
          <MetricsCard title="Total Requests" value={metrics.totalRequests} />
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
                <ResourceInfo resources={modelInfo.deployment.deploy_config.resources} />
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