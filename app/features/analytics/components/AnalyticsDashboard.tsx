'use client';

import { useEffect, useState } from 'react';
import { useModels } from '../../models/context/ModelContext';
import RoleGuard from '@/features/shared/components/RoleGuard';

interface ModelMetrics {
  loaded: number;
  predictions: number;
  latency: number;
  features?: {
    names: string[];
    count: number;
  };
}

interface Metrics {
  inference_requests_total: number;
  inference_latency_seconds: number;
  model_metrics: Record<string, ModelMetrics>;
}

export default function AnalyticsDashboard() {
  const { models } = useModels();
  const [metrics, setMetrics] = useState<Metrics>({
    inference_requests_total: 0,
    inference_latency_seconds: 0,
    model_metrics: {},
  });
  const [loading, setLoading] = useState(true);
  const [predictLoading, setPredictLoading] = useState(false);
  const [predictError, setPredictError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [alerts, setAlerts] = useState<Array<{
    modelId: string;
    message: string;
    timestamp: string;
    type: 'latency' | 'error' | 'resource';
  }>>([]);

  // Generate Grafana URL with auto-refresh
  const getGrafanaUrl = () => {
    const baseUrl = 'http://localhost:4000/d-solo/aeif7zg733caoe/test';
    const params = new URLSearchParams({
      orgId: '1',
      from: 'now-5m',
      to: 'now',
      timezone: 'browser',
      panelId: '1',
      refresh: '5s',
      __feature: 'dashboardSceneSolo',
    });
    return `${baseUrl}?${params.toString()}`;
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // 获取 Prometheus 指标
        const prometheusResponse = await fetch('http://localhost:5000/metrics', {
          headers: { 'Accept': 'text/plain' },
        });
        const prometheusData = await prometheusResponse.text();
        
        // 获取模型状态
        const modelStatusResponse = await fetch('http://localhost:5000/models/status');
        const modelStatusData = await modelStatusResponse.json();

        // 解析 Prometheus 指标
        const requestsMatch = prometheusData.match(/inference_requests_total (\d+)/);
        const latencyMatch = prometheusData.match(/inference_latency_seconds_sum (\d+\.\d+)/);
        const countMatch = prometheusData.match(/inference_latency_seconds_count (\d+)/);
        
        // 解析模型特定指标
        const modelMetrics: Record<string, ModelMetrics> = {};
        Object.entries(modelStatusData.models || {}).forEach(([modelId, info]: [string, any]) => {
          modelMetrics[modelId] = {
            loaded: 1,
            predictions: info.performance.total_predictions,
            latency: info.performance.avg_latency_ms / 1000,
            features: {
              names: info.metadata.feature_names,
              count: info.metadata.feature_count
            }
          };

          // 检查高延迟告警
          if (info.performance.avg_latency_ms > 1000) {
            setAlerts(prev => [...prev, {
              modelId,
              message: `High latency detected: ${info.performance.avg_latency_ms}ms`,
              timestamp: new Date().toISOString(),
              type: 'latency'
            }]);
          }
        });

        setMetrics({
          inference_requests_total: requestsMatch ? parseInt(requestsMatch[1]) : 0,
          inference_latency_seconds: latencyMatch && countMatch 
            ? parseFloat(latencyMatch[1]) / parseInt(countMatch[1])
            : 0,
          model_metrics: modelMetrics,
        });
      } catch (error) {
        console.error('Error fetching metrics:', error);
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          console.error('Failed to connect to the metrics server. Please make sure the Flask server is running.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePredict = async () => {
    if (!selectedModel) {
      setPredictError('Please select a model first');
      return;
    }

    setPredictLoading(true);
    setPredictError(null);
    try {
      // Get the model object to get the correct name
      const model = models.find(m => m.id === selectedModel);
      if (!model) {
        throw new Error('Selected model not found');
      }

      const response = await fetch('http://127.0.0.1:5000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_name: model.name,
          sepal_length: 5.1,
          sepal_width: 3.5,
          petal_length: 1.4,
          petal_width: 0.2
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Test inference response:', data);
    } catch (error) {
      console.error('Test inference failed:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        setPredictError('Failed to connect to the server. Please make sure the Flask server is running.');
      } else {
        setPredictError(error instanceof Error ? error.message : 'Failed to make prediction');
      }
    } finally {
      setPredictLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Grafana Panel */}
      <div className="bg-white overflow-hidden shadow-sm rounded-lg">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Overview</h2>
          <iframe
            src="http://localhost:3000/d-solo/aeif7zg733caoe/test"
            width="100%"
            height="400"
            frameBorder="0"
          />
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="bg-white overflow-hidden shadow-sm rounded-lg">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Metrics Summary</h2>
          {loading ? (
            <p>Loading metrics...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Total Requests</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {metrics.inference_requests_total.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Average Latency</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {(metrics.inference_latency_seconds * 1000).toFixed(2)}ms
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Active Models</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {Object.keys(metrics.model_metrics).length}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Total Predictions</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {Object.values(metrics.model_metrics)
                    .reduce((sum, m) => sum + m.predictions, 0)
                    .toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Model Details */}
      <div className="bg-white overflow-hidden shadow-sm rounded-lg">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Model Details</h2>
          <div className="grid grid-cols-1 gap-4">
            {Object.entries(metrics.model_metrics).map(([modelId, modelMetrics]) => (
              <div key={modelId} className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900">{modelId}</h3>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Predictions</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {modelMetrics.predictions.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Avg Latency</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {(modelMetrics.latency * 1000).toFixed(2)}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Features</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {modelMetrics.features?.count || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {modelMetrics.loaded > 0 ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                {modelMetrics.features?.names && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-500">Feature Names</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {modelMetrics.features.names.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white overflow-hidden shadow-sm rounded-lg">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Alerts</h2>
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    alert.type === 'latency'
                      ? 'bg-yellow-50 text-yellow-800'
                      : alert.type === 'error'
                      ? 'bg-red-50 text-red-800'
                      : 'bg-blue-50 text-blue-800'
                  }`}
                >
                  <div className="flex justify-between">
                    <p className="font-medium">{alert.modelId}</p>
                    <p className="text-sm">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <p className="mt-1 text-sm">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Flask Metrics Card */}
      <div className="bg-white overflow-hidden shadow-sm rounded-lg">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Flask Metrics</h2>
          
          {/* Model Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select a model</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} (v{model.version})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePredict}
            disabled={predictLoading || !selectedModel}
            className={`mt-4 px-4 py-2 rounded ${
              predictLoading || !selectedModel
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            {predictLoading ? 'Processing...' : '🔁 Trigger Test Inference'}
          </button>
          {predictError && (
            <div className="mt-2 text-red-600 text-sm">{predictError}</div>
          )}

          {loading ? (
            <p>Loading metrics...</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Requests</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {metrics.inference_requests_total.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Average Latency (s)</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {metrics.inference_latency_seconds.toFixed(3)}
                </p>
              </div>
            </div>
          )}

          {/* Model-specific metrics */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Model Metrics</h3>
            <div className="grid grid-cols-1 gap-4">
              {Object.entries(metrics.model_metrics).map(([modelName, modelMetrics]) => (
                <div key={modelName} className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900">{modelName}</h4>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <p className="text-sm font-medium text-gray-900">
                        {modelMetrics.loaded > 0 ? 'Loaded' : 'Not Loaded'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Predictions</p>
                      <p className="text-sm font-medium text-gray-900">
                        {modelMetrics.predictions.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Avg Latency (s)</p>
                      <p className="text-sm font-medium text-gray-900">
                        {modelMetrics.latency.toFixed(3)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Model Metrics Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {models.map((model) => (
          <div
            key={model.id}
            className="bg-white overflow-hidden shadow-sm rounded-lg"
          >
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    {model.name}
                  </h3>
                  <p className="text-sm text-gray-500">{model.type}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Requests</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {model.metrics.requests.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Latency</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {model.metrics.latency}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Error Rate</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {model.metrics.accuracy}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {model.status}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Metrics */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900">Detailed Metrics</h3>
          <div className="mt-6 border-t border-gray-200">
            {models.map((model) => (
              <div key={model.id} className="mt-6">
                <h4 className="text-base font-medium text-gray-900">
                  {model.name} - {model.type}
                </h4>
                <dl className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="px-4 py-5 bg-gray-50 shadow-sm rounded-lg overflow-hidden sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Requests
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                      {model.metrics.requests.toLocaleString()}
                    </dd>
                  </div>
                  <div className="px-4 py-5 bg-gray-50 shadow-sm rounded-lg overflow-hidden sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Latency
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                      {model.metrics.latency}
                    </dd>
                  </div>
                  <div className="px-4 py-5 bg-gray-50 shadow-sm rounded-lg overflow-hidden sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Accuracy
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                      {model.metrics.accuracy}
                    </dd>
                  </div>
                  <div className="px-4 py-5 bg-gray-50 shadow-sm rounded-lg overflow-hidden sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Last Updated
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                      {model.lastUpdated}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced analytics for admin users */}
      <RoleGuard 
        allowedRoles={['admin', 'super_admin']}
        fallback={
          <div className="text-sm text-gray-500 mt-4 px-4 py-3">
            Detailed analytics and export features are available to administrators.
          </div>
        }
      >
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900">Advanced Analytics</h3>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <h4 className="text-sm font-medium text-gray-500">Resource Usage</h4>
                {/* Add resource usage charts/metrics here */}
                <p className="mt-2 text-sm text-gray-700">Detailed resource utilization metrics.</p>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <h4 className="text-sm font-medium text-gray-500">Cost Analysis</h4>
                {/* Add cost analysis charts/metrics here */}
                <p className="mt-2 text-sm text-gray-700">Detailed cost and usage analysis.</p>
              </div>
            </div>
          </div>
        </div>
      </RoleGuard>
    </div>
  );
} 