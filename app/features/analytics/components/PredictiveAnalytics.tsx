'use client';

import React, { useState, useEffect } from 'react';
import ResourceForecast from './ResourceForecast';
import OptimizationResults from './OptimizationResults';
import AlertsPanel from './AlertsPanel';
import { usePredictive } from '../context/PredictiveContext';
import { OptimizationResult, PredictionTriggerOptions } from '../types/predictive';

const PredictiveAnalytics: React.FC = () => {
  const { 
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
  } = usePredictive();
  
  const [predictionSettings, setPredictionSettings] = useState<PredictionTriggerOptions>({
    horizon: 30,
    use_cache: true
  });
  
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  
  // Check if data needs to be loaded when component mounts
  useEffect(() => {
    // Not loading data automatically, waiting for user to trigger manually
    // Just setting state to indicate component has initialized
    setDataLoaded(false);
  }, []);
  
  const handleRefresh = () => {
    fetchPredictions().catch(err => {
      console.error("Error fetching predictions:", err);
    });
    fetchSystemMetrics().catch(err => {
      console.error("Error fetching metrics:", err);
    });
    setDataLoaded(true);
  };
  
  const handleTriggerId = () => {
    triggerPrediction(predictionSettings).catch(err => {
      console.error("Error triggering prediction:", err);
    });
    setDataLoaded(true);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Predictive Analytics</h2>
        
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </span>
          )}
          
          <div className="flex items-center space-x-2">
            <select
              value={predictionSettings.horizon}
              onChange={(e) => setPredictionSettings(prev => ({
                ...prev,
                horizon: parseInt(e.target.value)
              }))}
              className="text-sm border border-gray-300 rounded-md p-1"
            >
              <option value={15}>Predict 15 mins</option>
              <option value={30}>Predict 30 mins</option>
              <option value={60}>Predict 1 hour</option>
              <option value={180}>Predict 3 hours</option>
              <option value={360}>Predict 6 hours</option>
            </select>
            
            <button
              onClick={handleTriggerId}
              disabled={isLoading}
              className="px-4 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isLoading ? 'Processing...' : 'Run Prediction'}
            </button>
            
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-sm hover:bg-gray-200 disabled:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          Error: {error}
        </div>
      )}
      
      {!dataLoaded && !isLoading && (
        <div className="bg-blue-50 text-blue-700 p-4 rounded-md my-4">
          <p>Click "Refresh" or "Run Prediction" button to load data.</p>
          <p className="text-sm mt-1">Note: Some data may be temporarily unavailable due to backend service issues.</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {currentMetrics.length > 0 ? (
          currentMetrics.map((metric, index) => (
            <div key={index} className={`p-6 rounded-lg shadow-sm 
              ${metric.status === 'normal' ? 'bg-white' : 
                metric.status === 'warning' ? 'bg-yellow-50' : 'bg-red-50'}`}>
              <h3 className="text-sm font-medium text-gray-500 uppercase">{metric.name}</h3>
              <div className="mt-2 flex items-baseline">
                <span className={`text-3xl font-semibold 
                  ${metric.status === 'normal' ? 'text-gray-900' : 
                    metric.status === 'warning' ? 'text-yellow-800' : 'text-red-800'}`}>
                  {metric.value.toFixed(2)}
                </span>
                <span className="ml-1 text-sm text-gray-500">{metric.unit}</span>
              </div>
            </div>
          ))
        ) : (
          // Display empty state metric cards
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="p-6 rounded-lg shadow-sm bg-white">
              <h3 className="text-sm font-medium text-gray-500 uppercase">
                {index === 0 ? 'CPU Usage' : index === 1 ? 'Memory Usage' : 'Network Traffic'}
              </h3>
              <div className="mt-2 flex items-baseline">
                <span className="text-3xl font-semibold text-gray-300">--</span>
                <span className="ml-1 text-sm text-gray-300">%</span>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.keys(predictions).length > 0 ? (
          Object.entries(predictions).map(([resourceName, predictionData]) => (
            <ResourceForecast
              key={resourceName}
              resourceName={resourceName}
              predictions={predictionData}
              unit={resourceName.includes('cpu') ? '%' : 
                    resourceName.includes('memory') ? 'MB' : 
                    resourceName.includes('latency') ? 'ms' : ''}
            />
          ))
        ) : (
          // Display empty state forecast charts
          <>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">CPU Usage Forecast</h3>
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-400">No forecast data available</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Memory Usage Forecast</h3>
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-400">No forecast data available</p>
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <OptimizationResults 
          results={optimizationResults}
        />
        
        <AlertsPanel 
          alerts={alerts}
          onDismiss={() => {}} // Implement alert dismissal logic
        />
      </div>
    </div>
  );
};

export default PredictiveAnalytics; 