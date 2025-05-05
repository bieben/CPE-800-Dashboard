'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useModels } from '@/features/models/context/ModelContext';
import { useDeployments } from '../context/DeploymentContext';
import type { DeploymentEnvironment, Deployment } from '../types';

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
  const { updateDeployment, deployments } = useDeployments();
  const [selectedModel, setSelectedModel] = useState('');
  const [environment, setEnvironment] = useState<DeploymentEnvironment>(availableEnvironments[0]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [deploymentList, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(false);

  // Check model status
  const checkModelStatus = async (modelId: string) => {
    try {
      const model = models.find(m => m.id === modelId);
      if (!model) {
        throw new Error('Model not found');
      }

      const backendModelId = model.model_id || model.name.toLowerCase().replace(/\s+/g, '_');
      const response = await fetch('http://localhost:5000/models/status');
      
      if (!response.ok) {
        throw new Error('Failed to check model status');
      }

      const statusData = await response.json();
      const modelStatus = statusData[0].models[backendModelId];

      if (!modelStatus) {
        throw new Error(`Model ${model.name} is not uploaded to the monitoring system. Please upload it first.`);
      }

      // Check model status and provide specific error information
      if (!modelStatus.metadata || !modelStatus.metadata.feature_names) {
        throw new Error(`Model ${model.name} metadata is incomplete. Please check the model file.`);
      }

      if (modelStatus.status === 'failed') {
        throw new Error(`Model ${model.name} is in failed state. Please check the model logs.`);
      }

      // Allow deployment for both inactive and active models
      if (modelStatus.status === 'inactive') {
        setStatus(`Ready to deploy (${modelStatus.metadata.feature_count} features)`);
      } else if (modelStatus.status === 'active') {
        setStatus(`Active (${modelStatus.metadata.feature_count} features)`);
      } else {
        throw new Error(`Model ${model.name} is in ${modelStatus.status} state. Please check the model status.`);
      }

      return {
        isReady: true,
        model,
        backendModelId,
        metadata: modelStatus.metadata,
        performance: modelStatus.performance
      };
    } catch (error) {
      console.error('Error checking model status:', error);
      setError(error instanceof Error ? error.message : 'Failed to check model status');
      setStatus(null);
      return { isReady: false };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Check if the model is ready for deployment
      const statusCheck = await checkModelStatus(selectedModel);
      if (!statusCheck.isReady) {
        return; // Error message already set in checkModelStatus
      }

      // Call the parent's onDeploy callback with model information
      await onDeploy(selectedModel, environment);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to deploy model');
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = e.target.value;
    setSelectedModel(modelId);
    setError(null);
    setStatus(null);

    if (modelId) {
      await checkModelStatus(modelId);
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
          const response = await fetch(`http://localhost:5000/models/status?model_name=${model.name}`);
          if (!response.ok) {
            throw new Error('Failed to fetch deployment status');
          }
          const data = await response.json();
          
          return {
            id: model.id,
            modelId: model.id,
            environment: 'Development',
            status: data.status,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          };
        } catch (err) {
          console.error(`Failed to fetch status for model ${model.name}:`, err);
          return null;
        }
      });

      const results = await Promise.all(deploymentPromises);
      setDeployments(results.filter((d): d is Deployment => d !== null));
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
                      disabled={loading || !selectedModel}
                      className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                        loading || !selectedModel
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-primary-600 hover:bg-primary-700'
                      }`}
                    >
                      {loading ? 'Deploying...' : 'Deploy'}
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