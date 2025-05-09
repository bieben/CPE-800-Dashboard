'use client';

import React from 'react';
import { OptimizationResult } from '../types/predictive';

interface OptimizationResultsProps {
  results: OptimizationResult[];
}

const OptimizationResults: React.FC<OptimizationResultsProps> = ({
  results
}) => {
  if (!results || results.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Resource Optimization Suggestions</h3>
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-400">No optimization suggestions available</p>
        </div>
      </div>
    );
  }

  // Format numbers to two decimal places
  const formatNumber = (value: number | undefined) => {
    if (value === undefined || value === null) return '0.00';
    return value.toFixed(2);
  };
  
  // Calculate savings percentage
  const calculateSavingPercent = (current: number | undefined, suggested: number | undefined) => {
    if (!current || !suggested || current <= 0) return '0';
    const percent = ((current - suggested) / current) * 100;
    return percent.toFixed(0);
  };
  
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">Resource Optimization Suggestions</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resource Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Config
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Suggested Config
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.map((result, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {result.resource_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatNumber(result.current_allocation)} {result.unit}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                  {formatNumber(result.suggested_allocation)} {result.unit} 
                  <span className="ml-1 text-xs text-green-500">
                    ({calculateSavingPercent(result.current_allocation, result.suggested_allocation)}% ↓)
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Note: These suggestions are based on historical usage patterns and predictive analysis. Please verify system requirements before applying.</p>
      </div>
    </div>
  );
};

export default OptimizationResults; 