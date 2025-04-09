'use client';

import { useEffect, useState } from 'react';
import { useModels } from '../../models/context/ModelContext';
import RoleGuard from '@/features/shared/components/RoleGuard';

interface ModelMetrics {
  loaded: number;
  predictions: number;
  latency: number;
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
        const response = await fetch('http://127.0.0.1:5000/metrics', {
          method: 'GET',
          headers: {
            'Accept': 'text/plain',
          },
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.status} ${response.statusText}`);
        }
        const data = await response.text();
        console.log('Received metrics data:', data);
        
        // Parse Prometheus metrics
        const requestsMatch = data.match(/inference_requests_total (\d+)/);
        const latencyMatch = data.match(/inference_latency_seconds_sum (\d+\.\d+)/);
        const countMatch = data.match(/inference_latency_seconds_count (\d+)/);
        
        // Parse per-model metrics
        const modelMetrics: Record<string, ModelMetrics> = {};
        const modelLoadedRegex = /model_loaded{model_name="([^"]+)"} (\d+)/g;
        const modelPredictionsRegex = /model_predictions_total{model_name="([^"]+)"} (\d+)/g;
        const modelLatencyRegex = /model_latency_seconds_sum{model_name="([^"]+)"} (\d+\.\d+)/g;
        const modelLatencyCountRegex = /model_latency_seconds_count{model_name="([^"]+)"} (\d+)/g;
        
        let match;
        while ((match = modelLoadedRegex.exec(data)) !== null) {
          const modelName = match[1];
          modelMetrics[modelName] = {
            loaded: parseInt(match[2]),
            predictions: 0,
            latency: 0,
          };
        }
        
        while ((match = modelPredictionsRegex.exec(data)) !== null) {
          const modelName = match[1];
          if (!modelMetrics[modelName]) {
            modelMetrics[modelName] = { loaded: 0, predictions: 0, latency: 0 };
          }
          modelMetrics[modelName].predictions = parseInt(match[2]);
        }
        
        while ((match = modelLatencyRegex.exec(data)) !== null) {
          const modelName = match[1];
          if (!modelMetrics[modelName]) {
            modelMetrics[modelName] = { loaded: 0, predictions: 0, latency: 0 };
          }
          const latencySum = parseFloat(match[2]);
          const latencyCountMatch = new RegExp(`model_latency_seconds_count{model_name="${modelName}"} (\\d+)`).exec(data);
          const latencyCount = latencyCountMatch ? parseInt(latencyCountMatch[1]) : 0;
          modelMetrics[modelName].latency = latencyCount > 0 ? latencySum / latencyCount : 0;
        }
        
        const requests = requestsMatch ? parseInt(requestsMatch[1]) : 0;
        const latencySum = latencyMatch ? parseFloat(latencyMatch[1]) : 0;
        const latencyCount = countMatch ? parseInt(countMatch[1]) : 0;
        const avgLatency = latencyCount > 0 ? latencySum / latencyCount : 0;
        
        setMetrics({
          inference_requests_total: requests,
          inference_latency_seconds: avgLatency,
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
    const interval = setInterval(fetchMetrics, 5000); // Refresh every 5 seconds

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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Grafana Dashboard</h2>
          <div className="w-full">
            <iframe
              src={getGrafanaUrl()}
              width="750"
              height="400"
              frameBorder="0"
            />
          </div>
        </div>
      </div>

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