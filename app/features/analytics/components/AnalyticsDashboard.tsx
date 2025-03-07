'use client';

import { useModels } from '../../models/context/ModelContext';
import RoleGuard from '@/features/shared/components/RoleGuard';

export default function AnalyticsDashboard() {
  const { models } = useModels();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
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