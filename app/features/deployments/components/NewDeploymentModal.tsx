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
  const { models, updateModel } = useModels();
  const { updateDeployment, deployments } = useDeployments();
  const [selectedModel, setSelectedModel] = useState('');
  const [environment, setEnvironment] = useState<DeploymentEnvironment>(availableEnvironments[0]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [deploymentList, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploymentType, setDeploymentType] = useState<'notebook' | 'api'>('notebook');
  const [modelClassName, setModelClassName] = useState('');
  const [deploymentStatus, setDeploymentStatus] = useState<string | null>(null);
  const [apiEndpoint, setApiEndpoint] = useState<string | null>(null);

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

  // Deploy model as API
  const deployModelAsApi = async (modelName: string, modelFilename: string, modelClassName: string) => {
    try {
      const url = new URL('http://10.156.115.33:5000/deploy_model');
      url.searchParams.append('model_name', modelName);
      url.searchParams.append('model_filename', modelFilename);
      url.searchParams.append('model_code_name', modelClassName);
      url.searchParams.append('environment', environment);

      const response = await fetch(url.toString(), {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deploy model as API');
      }

      const data = await response.json();
      setDeploymentStatus('Deployed');
      setApiEndpoint(data.url);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy model as API');
      setDeploymentStatus('Failed');
      return null;
    }
  };

  // When the selected model changes, check its status
  const handleModelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = e.target.value;
    setSelectedModel(modelId);
    setError(null);
    setStatus(null);
    setDeploymentStatus(null);
    setApiEndpoint(null);

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

      // Check model status first
      const currentStatus = await checkModelStatus(model.name);
      
      if (currentStatus === 'Deployed' || currentStatus === 'Pending') {
        // Create deployment record
        onDeploy(selectedModel, environment);
        const deployment = deployments.find(d => d.modelId === selectedModel && d.environment === environment);
        
        if (deploymentType === 'notebook') {
          // Execute notebook deployment
          // Wait for deployment to complete
          let deploymentStatus = 'Pending';
          let retries = 0;
          const maxRetries = 10;  // Maximum number of retries

          while (deploymentStatus === 'Pending' && retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000));  // Wait for 2 seconds
            const status = await checkModelStatus(model.name);
            deploymentStatus = status;
            retries++;
          }

          if (deploymentStatus === 'Deployed') {
            // Get the model to access its notebook_url
            if (!model || !model.notebook_url) {
              setError('Notebook URL not found');
              return;
            }
            
            // Update deployment status
            if (deployment) {
              updateDeployment(deployment.id, { status: 'running' });
            }
            
            // Update model status
            updateModel(selectedModel, { status: 'running' });
            
            // Open notebook URL in a new tab
            window.open(model.notebook_url, '_blank');
            onClose();
          } else {
            setError('Deployment timeout or failed');
            // Update deployment status to failed
            if (deployment) {
              updateDeployment(deployment.id, { status: 'failed' });
            }
            // Update model status to failed
            updateModel(selectedModel, { status: 'failed' });
          }
        } else if (deploymentType === 'api') {
          // Deploy as API
          if (!modelClassName) {
            setError('Model class name is required for API deployment');
            return;
          }

          // Get the notebook filename from the URL
          const notebookFilename = model.notebook_url ? model.notebook_url.split('/').pop() : null;
          if (!notebookFilename) {
            setError('Could not determine notebook filename');
            return;
          }

          setDeploymentStatus('Pending');
          const apiResult = await deployModelAsApi(model.name, notebookFilename, modelClassName);
          
          if (apiResult) {
            // Update deployment status
            if (deployment) {
              updateDeployment(deployment.id, { 
                status: 'running',
                description: `API Deployment of ${model.name} - Endpoint: ${apiResult.url}` 
              });
            }
            
            // Update model status
            updateModel(selectedModel, { status: 'running' });
            
            // Wait a bit before closing to show success message
            setTimeout(() => {
              onClose();
            }, 3000);
          } else {
            // Update deployment status to failed
            if (deployment) {
              updateDeployment(deployment.id, { status: 'failed' });
            }
            // Update model status to failed
            updateModel(selectedModel, { status: 'failed' });
          }
        }
      } else if (currentStatus === 'Model Not Found') {
        setError('Model not found in the system');
      } else if (currentStatus === 'No notebook found for model') {
        setError('Model files are missing');
      } else {
        setError('Model is not ready for deployment');
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
                      <label htmlFor="deploymentType" className="block text-sm font-medium text-gray-700">
                        Deployment Type
                      </label>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center">
                          <input
                            id="notebook-type"
                            name="deploymentType"
                            type="radio"
                            checked={deploymentType === 'notebook'}
                            onChange={() => setDeploymentType('notebook')}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                          />
                          <label htmlFor="notebook-type" className="ml-3 block text-sm text-gray-700">
                            Deploy as Notebook (Interactive)
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="api-type"
                            name="deploymentType"
                            type="radio"
                            checked={deploymentType === 'api'}
                            onChange={() => setDeploymentType('api')}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                          />
                          <label htmlFor="api-type" className="ml-3 block text-sm text-gray-700">
                            Deploy as API Endpoint
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    {deploymentType === 'api' && (
                      <div>
                        <label htmlFor="modelClassName" className="block text-sm font-medium text-gray-700">
                          Model Class Name
                        </label>
                        <input
                          type="text"
                          id="modelClassName"
                          value={modelClassName}
                          onChange={(e) => setModelClassName(e.target.value)}
                          placeholder="e.g. ObjectDetector"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          required={deploymentType === 'api'}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          The name of the Python class in your notebook that implements the model
                        </p>
                      </div>
                    )}
                    
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
                      <span className="font-medium">Model Status:</span>{' '}
                      <span className={status === 'Deployed' ? 'text-green-600' : 'text-yellow-600'}>
                        {status}
                      </span>
                    </div>
                  )}
                  
                  {deploymentStatus && (
                    <div className="mt-4 text-sm">
                      <span className="font-medium">Deployment Status:</span>{' '}
                      <span className={deploymentStatus === 'Deployed' ? 'text-green-600' : 'text-yellow-600'}>
                        {deploymentStatus}
                      </span>
                    </div>
                  )}
                  
                  {apiEndpoint && (
                    <div className="mt-4 p-3 bg-green-50 rounded-md">
                      <span className="block text-sm font-medium text-green-800">
                        API Endpoint Created!
                      </span>
                      <a 
                        href={apiEndpoint} 
                        target="_blank" 
                        className="mt-1 block text-sm text-blue-600 hover:text-blue-800 truncate"
                      >
                        {apiEndpoint}
                      </a>
                      <p className="mt-1 text-xs text-green-700">
                        Your model has been deployed as an API endpoint. Add <code>/predict</code> to the URL for making predictions.
                      </p>
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
                      disabled={(deploymentType === 'notebook' && status !== 'Deployed') || 
                               (deploymentType === 'api' && (status !== 'Deployed' || !modelClassName))}
                      className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                        (deploymentType === 'notebook' && status === 'Deployed') || 
                        (deploymentType === 'api' && status === 'Deployed' && modelClassName)
                          ? 'bg-primary-600 hover:bg-primary-700'
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {deploymentStatus === 'Pending' ? 'Deploying...' : 'Deploy'}
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