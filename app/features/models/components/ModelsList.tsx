'use client';

import { useState } from 'react';
import { useModels } from '../context/ModelContext';
import { useAuth } from '@/features/auth/hooks/useAuth';
import AddModelModal from './AddModelModal';
import EditModelModal from './EditModelModal';
import type { Model } from '../types';

interface ModelWithPermissions extends Model {
  isOwner: boolean;
  canEdit: boolean;
}

export default function ModelsList() {
  const { models, addModel, updateModel, deleteModel } = useModels();
  const { user } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);

  const handleDelete = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;

    // 检查用户是否有权限删除此模型
    if (user?.role === 'user' && model.createdBy !== user.email) {
      alert('You do not have permission to delete this model');
      return;
    }

    if (window.confirm('Are you sure you want to delete this model?')) {
      deleteModel(modelId);
    }
  };

  const handleEdit = (model: Model) => {
    // 检查用户是否有权限编辑此模型
    if (user?.role === 'user' && model.createdBy !== user.email) {
      alert('You do not have permission to edit this model');
      return;
    }

    setSelectedModel(model);
    setIsEditModalOpen(true);
  };

  // 显示所有模型，但标记哪些是用户自己的
  const displayedModels: ModelWithPermissions[] = models.map(model => ({
    ...model,
    isOwner: model.createdBy === user?.email,
    canEdit: user?.role === 'admin' || user?.role === 'super_admin' || model.createdBy === user?.email
  }));

  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-xl font-semibold text-gray-900">Models</h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all models in the system that can be deployed.
              {user?.role === 'user' && (
                <span className="text-gray-500 ml-1">
                  Models you own are marked with an owner badge.
                </span>
              )}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Add Model
            </button>
          </div>
        </div>

        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th key="name" scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                      Name
                    </th>
                    <th key="version" scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Version
                    </th>
                    <th key="createdBy" scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Created By
                    </th>
                    <th key="lastUpdated" scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Last Updated
                    </th>
                    <th key="status" scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th key="actions" scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayedModels.map((model) => (
                    <tr key={model.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                        <div className="flex items-center">
                          <div>
                            <div className="font-medium text-gray-900">{model.name}</div>
                            <div className="text-gray-500">{model.description}</div>
                          </div>
                          {model.isOwner && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                              Owner
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        v{model.version}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {model.createdBy}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(model.lastUpdated).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          model.status === 'running'
                            ? 'bg-green-100 text-green-800'
                            : model.status === 'stopped'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {model.status}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                        {model.canEdit ? (
                          <>
                            <button
                              onClick={() => handleEdit(model)}
                              className="text-primary-600 hover:text-primary-900 mr-4"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(model.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-400">No permission</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {displayedModels.length === 0 && (
                <div className="text-center py-4 text-sm text-gray-500">
                  No models found. Click "Add Model" to create your first model.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AddModelModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={(modelData) => {
          if (!user?.email) return;
          const createData = {
            ...modelData,
            createdBy: user.email,
            lastUpdated: new Date().toISOString(),
            status: 'stopped' as const,
            type: 'custom',
            metrics: {
              requests: 0,
              latency: '0ms',
              accuracy: '0%'
            }
          };
          addModel(createData);
          setIsAddModalOpen(false);
        }}
      />

      {selectedModel && (
        <EditModelModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedModel(null);
          }}
          onUpdate={(modelData) => {
            updateModel(selectedModel.id, {
              ...modelData,
              lastUpdated: new Date().toISOString(),
            });
            setIsEditModalOpen(false);
            setSelectedModel(null);
          }}
          model={selectedModel}
        />
      )}
    </div>
  );
}