'use client';

import React, { useState } from 'react';
import { PredictiveAlert } from '../types/predictive';

interface AlertsPanelProps {
  alerts: PredictiveAlert[];
  onDismiss?: (alert: PredictiveAlert) => void;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  onDismiss
}) => {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Predictive Alerts</h3>
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-400">No active alerts</p>
        </div>
      </div>
    );
  }
  
  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(alert => alert.severity === filter);
  
  const getSeverityColor = (severity: PredictiveAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };
  
  const getSeverityTextColor = (severity: PredictiveAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-700';
      case 'warning':
        return 'text-yellow-700';
      case 'info':
        return 'text-blue-700';
      default:
        return 'text-gray-700';
    }
  };
  
  const getSeverityBadge = (severity: PredictiveAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Critical
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Warning
          </span>
        );
      case 'info':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Info
          </span>
        );
      default:
        return null;
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Predictive Alerts</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded-md ${
              filter === 'all' 
                ? 'bg-gray-200 text-gray-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`px-3 py-1 text-sm rounded-md ${
              filter === 'critical' 
                ? 'bg-red-100 text-red-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Critical ({alerts.filter(a => a.severity === 'critical').length})
          </button>
          <button
            onClick={() => setFilter('warning')}
            className={`px-3 py-1 text-sm rounded-md ${
              filter === 'warning' 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Warning ({alerts.filter(a => a.severity === 'warning').length})
          </button>
          <button
            onClick={() => setFilter('info')}
            className={`px-3 py-1 text-sm rounded-md ${
              filter === 'info' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Info ({alerts.filter(a => a.severity === 'info').length})
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-400">No alerts for current filter</p>
          </div>
        ) : (
          filteredAlerts.map((alert, index) => (
            <div 
              key={index} 
              className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className={`font-medium ${getSeverityTextColor(alert.severity)}`}>
                      {alert.resource}
                    </h4>
                    {getSeverityBadge(alert.severity)}
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{alert.message}</p>
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">
                      Prediction time: {formatDate(alert.timestamp)}
                    </span>
                    {alert.affected_models.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Affected models: {alert.affected_models.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                {onDismiss && (
                  <button
                    onClick={() => onDismiss(alert)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertsPanel; 