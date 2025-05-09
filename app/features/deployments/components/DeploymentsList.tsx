'use client';

import { useState } from 'react';
import RoleGuard from '@/features/shared/components/RoleGuard';
import { useDeployments } from '../context/DeploymentContext';
import { useModels } from '@/features/models/context/ModelContext';
import { useAuth } from '@/features/auth/hooks/useAuth';
import NewDeploymentModal from './NewDeploymentModal';
import type { DeploymentEnvironment } from '../types';

export default function DeploymentsList() {
  const { models, updateModel } = useModels();
  const { deployments, addDeployment, deleteDeployment, updateDeployment } = useDeployments();
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

  const handleDeploy = async (modelId: string, environment: DeploymentEnvironment) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;

    // Check if the user has permission to deploy in the selected environment
    const availableEnvironments = getAvailableEnvironments(user?.role || 'user');
    if (!availableEnvironments.includes(environment)) {
      alert('You do not have permission to deploy to this environment');
      return;
    }

    try {
      // Create initial deployment record with pending status
      const deploymentId = `${modelId}-${environment}-${Date.now()}`;
      const initialDeployment = {
        id: deploymentId,
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
          gpu: 'N/A'
        },
        metrics: {
          uptime: '0%',
          requests: 0,
          latency: '0ms',
        },
        description: `Deploying ${model.name} to ${environment} environment...`,
      };

      // Add deployment record
      addDeployment(initialDeployment);

      // Call backend deployment API
      const backendModelId = model.model_id || model.name.toLowerCase().replace(/\s+/g, '_');
      const response = await fetch('http://localhost:5000/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_id: backendModelId,
          environment: environment.toLowerCase()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deploy model');
      }

      const deployData = await response.json();

      // Update deployment with success status
      const updatedDeployment = {
        ...initialDeployment,
        status: 'running' as const,
        resources: deployData?.config?.resources || initialDeployment.resources,
        description: deployData?.message 
          ? `${deployData.message}. Deployed in ${environment} environment`
          : `Successfully deployed in ${environment} environment`,
      };

      // Update deployment record
      updateDeployment(deploymentId, updatedDeployment);

      // Update model status
      updateModel(modelId, {
        status: 'running',
        lastUpdated: new Date().toISOString(),
        metrics: {
          requests: 0,
          latency: '0ms',
          accuracy: '0%'
        }
      });

      // Get updated model status from monitoring system
      try {
        const statusResponse = await fetch('http://localhost:5000/models/status');
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log('Model status response in handleDeploy:', statusData);
          
          // 尝试从不同格式的响应中获取模型状态
          let modelStatus: any = null;
          
          // 处理不同格式的响应结构
          if (Array.isArray(statusData) && statusData.length > 0) {
            // 格式1: 响应是数组
            if (statusData[0]?.models && statusData[0].models[backendModelId]) {
              modelStatus = statusData[0].models[backendModelId];
            }
          } else if (statusData?.models && statusData.models[backendModelId]) {
            // 格式2: 响应包含models对象
            modelStatus = statusData.models[backendModelId];
          } else if (typeof statusData === 'object' && statusData !== null) {
            // 格式3: 直接包含模型ID作为键
            if (statusData[backendModelId]) {
              modelStatus = statusData[backendModelId];
            }
          }
          
          if (modelStatus) {
            const metrics = {
              requests: modelStatus.performance?.total_predictions || 0,
              latency: `${modelStatus.performance?.avg_latency_ms || 0}ms`,
              accuracy: modelStatus.performance?.accuracy || '0%'
            };
            
            updateModel(modelId, { metrics });
          }
        }
      } catch (statusError) {
        console.warn('Error fetching model status after deployment:', statusError);
        // 这不会影响部署过程，只是日志记录
      }

    } catch (error) {
      console.error('Deployment failed:', error);
      
      // Update deployment with failed status
      const failedDeployment = {
        ...deployments.find(d => d.modelId === modelId && d.environment === environment),
        status: 'failed' as const,
        description: `Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastUpdated: new Date().toISOString(),
      };

      if (failedDeployment.id) {
        updateDeployment(failedDeployment.id, failedDeployment);
      }

      // Update model status
      updateModel(modelId, { 
        status: 'failed'
      });

      alert(error instanceof Error ? error.message : 'Failed to deploy model');
    }
  };

  const handleDelete = async (deploymentId: string) => {
    const deployment = deployments.find(d => d.id === deploymentId);
    if (!deployment) return;

    // Check if the user has permission to delete the deployment
    if (user?.role === 'user' && deployment.environment !== 'development') {
      alert('You can only delete deployments in the development environment');
      return;
    }

    if (window.confirm('Are you sure you want to stop this deployment?')) {
      try {
        // Call backend API to stop the deployment
        const model = models.find(m => m.id === deployment.modelId);
        if (!model) {
          throw new Error('Associated model not found');
        }

        const backendModelId = model.model_id || model.name.toLowerCase().replace(/\s+/g, '_');
        const response = await fetch(`http://localhost:5000/stop_deployment/${backendModelId}`, {
          method: 'POST',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to stop deployment');
        }

        // Delete the deployment record
        deleteDeployment(deploymentId);

        // Check if this model has any other active deployments
        const otherActiveDeployments = deployments.some(d => 
          d.modelId === deployment.modelId && 
          d.id !== deploymentId && 
          d.status === 'running'
        );

        // Only update model status if this was the last active deployment
        if (!otherActiveDeployments) {
          updateModel(deployment.modelId, {
            status: 'stopped',
            lastUpdated: new Date().toISOString(),
            metrics: {
              requests: 0,
              latency: '0ms',
              accuracy: '0%'
            }
          });
        }
      } catch (error) {
        console.error('Error stopping deployment:', error);
        alert(error instanceof Error ? error.message : 'Failed to stop deployment');
      }
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