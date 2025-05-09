'use client';

import React, { useState, useEffect } from 'react';
import { usePredictive } from '../context/PredictiveContext';

const SystemMetricsPanel: React.FC = () => {
  const { currentMetrics, lastUpdated, isLoading, fetchSystemMetrics } = usePredictive();
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);

  // 组件加载时自动加载数据
  useEffect(() => {
    console.log('SystemMetricsPanel - Initial render');
    handleRefresh();
  }, []);

  const handleRefresh = () => {
    console.log('SystemMetricsPanel - Refreshing data');
    fetchSystemMetrics().catch(err => {
      console.error("Error fetching system metrics:", err);
    });
    setDataLoaded(true);
  };

  // 添加调试日志
  console.log('SystemMetricsPanel - Current state:', { 
    currentMetrics, 
    dataLoaded, 
    isLoading, 
    lastUpdated 
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">System Metrics</h2>
        
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </span>
          )}
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-sm hover:bg-gray-200 disabled:bg-gray-50"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      {!dataLoaded && !isLoading && (
        <div className="bg-blue-50 text-blue-700 p-4 rounded-md my-4">
          <p>Loading system metrics data...</p>
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
                <span className="ml-1 text-sm text-gray-300">{index === 2 ? 'MB/s' : '%'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SystemMetricsPanel; 