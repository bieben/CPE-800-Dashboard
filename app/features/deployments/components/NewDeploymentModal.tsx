'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useModels } from '@/features/models/context/ModelContext';
import type { DeploymentEnvironment, Deployment } from '../types';
import { useDeployments } from '../context/DeploymentContext';

interface NewDeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (modelId: string, environment: DeploymentEnvironment) => void;
  availableEnvironments: DeploymentEnvironment[];
}

export default function NewDeploymentModal({
  isOpen,
  onClose,
  onDeploy,
  availableEnvironments,
}: NewDeploymentModalProps) {
  const { models } = useModels();
  const { deployments } = useDeployments();
  const [selectedModel, setSelectedModel] = useState('');
  const [environment, setEnvironment] = useState<DeploymentEnvironment>(availableEnvironments[0]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check model status
  const checkModelStatus = async (modelName: string) => {
    try {
      const response = await fetch(`http://10.156.115.33:5000/model/status?model_name=${modelName}&environment=${environment}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to check model status');
      }

      const data = await response.json();
      setStatus(data.status);
      return data.status;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check model status');
      return null;
    }
  };

  // When the selected model changes, check its status
  const handleModelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = e.target.value;
    setSelectedModel(modelId);
    setError(null);
    setStatus(null);

    if (modelId) {
      const model = models.find(m => m.id === modelId);
      if (model) {
        await checkModelStatus(model.name);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel) return;

    try {
      const model = models.find(m => m.id === selectedModel);
      if (!model) {
        throw new Error('Model not found');
      }

      // Reset status before deployment
      setStatus(null);
      setError(null);

      // Execute deployment
      onDeploy(selectedModel, environment);
      
      // Check status with model name
      let deploymentStatus = 'Pending';
      let retries = 0;
      const maxRetries = 10;

      while (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const response = await fetch(`http://10.156.115.33:5000/model/status?model_name=${model.name}&environment=${environment}`);
        
        if (!response.ok) {
          throw new Error('Failed to check deployment status');
        }

        const data = await response.json();
        deploymentStatus = data.status;
        setStatus(deploymentStatus);

        if (deploymentStatus === 'Deployed') {
          onClose();
          break;
        }
        retries++;
      }

      if (deploymentStatus !== 'Deployed') {
        setError('Deployment timeout or failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy model');
    }
  };

  // Get deployments
  const fetchDeployments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get deployment status for each model
      const deploymentPromises = models.map(async (model) => {
        try {
          const response = await fetch(`http://10.156.115.33:5000/model/status?model_name=${model.name}`);
          if (!response.ok) {
            throw new Error('Failed to fetch deployment status');
          }
          const data = await response.json();
          
          return {
            id: `${model.id}-${environment}`,
            modelId: model.id,
            modelName: model.name,
            environment: environment.toLowerCase() as DeploymentEnvironment,
            status: data.status,
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
              latency: '0ms'
            }
          };
        } catch (err) {
          console.error(`Failed to fetch status for model ${model.name}:`, err);
          return null;
        }
      });

      const results = await Promise.all(deploymentPromises);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deployments');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and periodic refresh
  useEffect(() => {
    fetchDeployments();
    const interval = setInterval(fetchDeployments, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [models]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  Deploy New Model
                </Dialog.Title>
                <form onSubmit={handleSubmit} className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="model" className="block text-sm font-medium text-gray-700">
                        Select Model
                      </label>
                      <select
                        id="model"
                        value={selectedModel}
                        onChange={handleModelChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        required
                      >
                        <option value="">Select a model</option>
                        {models.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name} (v{model.version})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="environment" className="block text-sm font-medium text-gray-700">
                        Environment
                      </label>
                      <select
                        id="environment"
                        value={environment}
                        onChange={(e) => setEnvironment(e.target.value as DeploymentEnvironment)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      >
                        {availableEnvironments.map((env) => (
                          <option key={env} value={env}>
                            {env.charAt(0).toUpperCase() + env.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {status && (
                    <div className="mt-4 text-sm">
                      <span className="font-medium">Status:</span>{' '}
                      <span className={status === 'Deployed' ? 'text-green-600' : 'text-yellow-600'}>
                        {status}
                      </span>
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={status !== 'Deployed'}
                      className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                        status === 'Deployed'
                          ? 'bg-primary-600 hover:bg-primary-700'
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Deploy
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}