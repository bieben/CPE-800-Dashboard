'use client';

import { useState } from 'react';
import RoleGuard from '@/features/shared/components/RoleGuard';
import { useDeployments } from '../context/DeploymentContext';
import { useModels } from '@/features/models/context/ModelContext';
import { useAuth } from '@/features/auth/hooks/useAuth';
import NewDeploymentModal from './NewDeploymentModal';
import type { DeploymentEnvironment } from '../types';

export default function DeploymentsList() {
  const { models } = useModels();
  const { deployments, addDeployment, deleteDeployment } = useDeployments();
  const { user } = useAuth();
  const [isNewDeploymentModalOpen, setIsNewDeploymentModalOpen] = useState(false);

  // 根据用户角色获取可用的环境
  const getAvailableEnvironments = (userRole: string): DeploymentEnvironment[] => {
    switch (userRole) {
      case 'admin':
      case 'super_admin':
        return ['development', 'staging', 'production'];
      case 'user':
      default:
        return ['development'];
    }
  };

  const handleDeploy = (modelId: string, environment: DeploymentEnvironment) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;

    // 检查用户是否有权限在选定环境中部署
    const availableEnvironments = getAvailableEnvironments(user?.role || 'user');
    if (!availableEnvironments.includes(environment)) {
      alert('You do not have permission to deploy to this environment');
      return;
    }

    const newDeployment = {
      id: `${modelId}-${environment}-${Date.now()}`,
      modelId,
      modelName: model.name,
      environment,
      status: 'pending' as const,
      version: model.version,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      resources: {
        cpu: '2 cores',
        memory: '8GB',
        gpu: 'N/A',
      },
      metrics: {
        uptime: '0%',
        requests: 0,
        latency: '0ms',
      },
      description: `Deployment of ${model.name} in ${environment} environment`,
    };

    addDeployment(newDeployment);
  };

  const handleDelete = (deploymentId: string) => {
    const deployment = deployments.find(d => d.id === deploymentId);
    if (!deployment) return;

    // 检查用户是否有权限删除此部署
    if (user?.role === 'user' && deployment.environment !== 'development') {
      alert('You can only delete deployments in the development environment');
      return;
    }

    if (window.confirm('Are you sure you want to delete this deployment?')) {
      deleteDeployment(deploymentId);
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-xl font-semibold text-gray-900">Deployments</h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all model deployments in your account.
              {user?.role === 'user' && (
                <span className="text-gray-500 ml-1">
                  (You can deploy to development environment)
                </span>
              )}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              onClick={() => setIsNewDeploymentModalOpen(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              New Deployment
            </button>
          </div>
        </div>

        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                      Model
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Environment
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Version
                    </th>
                    <RoleGuard allowedRoles={['admin', 'super_admin']}>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                        <span className="sr-only">Actions</span>
                      </th>
                    </RoleGuard>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {deployments.map((deployment) => (
                    <tr key={deployment.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                        <div className="font-medium text-gray-900">{deployment.modelName}</div>
                        <div className="text-gray-500">{deployment.description}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          deployment.environment === 'production'
                            ? 'bg-blue-100 text-blue-800'
                            : deployment.environment === 'staging'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {deployment.environment}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          deployment.status === 'running'
                            ? 'bg-green-100 text-green-800'
                            : deployment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : deployment.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {deployment.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        v{deployment.version}
                      </td>
                      <RoleGuard allowedRoles={['admin', 'super_admin']}>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                          <button 
                            onClick={() => handleDelete(deployment.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </RoleGuard>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <RoleGuard 
          allowedRoles={['admin', 'super_admin']}
          fallback={
            <div className="text-sm text-gray-500 mt-4 px-4 py-3">
              Note: Regular users can only deploy to and manage deployments in the development environment.
              Contact an administrator for staging or production deployments.
            </div>
          }
        >
          <div className="px-4 py-3 mt-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-900">Deployment Management</h3>
            <p className="mt-1 text-sm text-gray-500">
              As an administrator, you can manage deployments across all environments.
            </p>
          </div>
        </RoleGuard>
      </div>

      <NewDeploymentModal
        isOpen={isNewDeploymentModalOpen}
        onClose={() => setIsNewDeploymentModalOpen(false)}
        onDeploy={handleDeploy}
        availableEnvironments={getAvailableEnvironments(user?.role || 'user')}
      />
    </div>
  );
} 