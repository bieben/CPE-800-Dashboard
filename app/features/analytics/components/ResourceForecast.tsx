'use client';

import React, { useState, useMemo } from 'react';
import { ResourcePrediction } from '../types/predictive';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  ComposedChart
} from 'recharts';

interface ResourceForecastProps {
  resourceName: string;
  predictions: ResourcePrediction[];
  actualData?: ResourcePrediction[];
  unit?: string;
  height?: number;
}

const ResourceForecast: React.FC<ResourceForecastProps> = ({
  resourceName,
  predictions,
  actualData = [],
  unit = '',
  height = 300
}) => {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('6h');
  
  // Process data using useMemo
  const chartData = useMemo(() => {
    if (!predictions || predictions.length === 0) return [];
    
    // Limit data points based on selected time range
    let timeLimit: number;
    switch (timeRange) {
      case '1h':
        timeLimit = 60 * 60 * 1000; // 1 hour (milliseconds)
        break;
      case '24h':
        timeLimit = 24 * 60 * 60 * 1000; // 24 hours (milliseconds)
        break;
      case '6h':
      default:
        timeLimit = 6 * 60 * 60 * 1000; // 6 hours (milliseconds)
    }
    
    // Merge prediction and actual data
    const now = new Date().getTime();
    const filteredPredictions = predictions.filter(p => {
      const predTime = new Date(p.timestamp).getTime();
      return predTime <= (now + timeLimit) && predTime >= now;
    });
    
    const filteredActual = actualData.filter(p => {
      const actualTime = new Date(p.timestamp).getTime();
      return actualTime >= (now - timeLimit) && actualTime <= now;
    });
    
    // Convert to chart data format
    const mergedData = [
      ...filteredActual.map(a => ({
        timestamp: new Date(a.timestamp),
        actual: a.actual_value || 0,
        predicted: null,
        lower: null,
        upper: null
      })),
      ...filteredPredictions.map(p => ({
        timestamp: new Date(p.timestamp),
        actual: null,
        predicted: p.predicted_value || 0,
        lower: p.lower_bound || 0,
        upper: p.upper_bound || 0
      }))
    ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // 确保数据点之间有合理的时间间隔
    const timeStep = timeLimit / 20; // 将时间范围分成20个点
    const interpolatedData = [];
    
    for (let i = 0; i < 20; i++) {
      const targetTime = now + (i * timeStep);
      const nearestPoint = mergedData.find(p => 
        Math.abs(p.timestamp.getTime() - targetTime) < timeStep / 2
      );
      
      if (nearestPoint) {
        interpolatedData.push(nearestPoint);
      } else {
        interpolatedData.push({
          timestamp: new Date(targetTime),
          actual: null,
          predicted: null,
          lower: null,
          upper: null
        });
      }
    }
    
    return interpolatedData;
  }, [predictions, actualData, timeRange]);
  
  // Format tooltip content
  const formatTooltip = (value: any, name: string) => {
    if (value === null || value === undefined) return '-';
    return `${Number(value).toFixed(2)} ${unit}`;
  };
  
  // Format X-axis time
  const formatXAxis = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">{resourceName} Forecast</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeRange('1h')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeRange === '1h' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            1 Hour
          </button>
          <button
            onClick={() => setTimeRange('6h')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeRange === '6h' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            6 Hours
          </button>
          <button
            onClick={() => setTimeRange('24h')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeRange === '24h' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            24 Hours
          </button>
        </div>
      </div>
      
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatXAxis}
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value}${unit}`}
            />
            <Tooltip 
              labelFormatter={(label) => new Date(label).toLocaleString()}
              formatter={formatTooltip}
            />
            <Legend />
            
            {/* Display prediction bounds */}
            <Area 
              type="monotone" 
              dataKey="upper" 
              stroke="none" 
              fill="#93c5fd" 
              fillOpacity={0.2} 
              name="Upper Bound" 
              isAnimationActive={false}
            />
            <Area 
              type="monotone" 
              dataKey="lower" 
              stroke="none" 
              fill="#93c5fd" 
              fillOpacity={0.2} 
              name="Lower Bound" 
              isAnimationActive={false}
            />
            
            {/* Display actual and predicted values */}
            <Line 
              type="monotone" 
              dataKey="actual" 
              stroke="#3b82f6" 
              dot={true} 
              name="Actual"
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="predicted" 
              stroke="#f97316" 
              strokeDasharray="5 5" 
              dot={false} 
              name="Predicted"
              strokeWidth={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400">No forecast data available</p>
        </div>
      )}
    </div>
  );
};

export default ResourceForecast; 