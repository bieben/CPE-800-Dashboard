'use client';

import type { Model } from '../types';
import Link from 'next/link';

interface ModelDetailsProps {
  model: Model;
  isOpen: boolean;
  onClose: () => void;
}

export default function ModelDetails({ model, isOpen, onClose }: ModelDetailsProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">{model.name}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mt-4 grid grid-cols-1 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Description</h3>
              <p className="mt-1 text-sm text-gray-900">{model.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Version</h3>
                <p className="mt-1 text-sm text-gray-900">v{model.version}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <p className="mt-1 text-sm text-gray-900">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    model.status === 'running'
                      ? 'bg-green-100 text-green-800'
                      : model.status === 'stopped'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {model.status}
                  </span>
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Created By</h3>
                <p className="mt-1 text-sm text-gray-900">{model.createdBy}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
                <p className="mt-1 text-sm text-gray-900">{new Date(model.lastUpdated).toLocaleDateString()}</p>
              </div>
            </div>
            
            {/* 模型文件访问链接 */}
            <div className="mt-4 border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-500">Access Model</h3>
              
              {model.notebook_url && (
                <div className="mt-2">
                  <h4 className="text-xs font-medium text-gray-500">Jupyter Notebook</h4>
                  <div className="mt-1 flex items-center">
                    <Link 
                      href={model.notebook_url} 
                      target="_blank"
                      className="text-blue-600 hover:text-blue-800 text-sm truncate max-w-xs"
                    >
                      {model.notebook_url}
                    </Link>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(model.notebook_url)}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                      title="Copy URL"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              
              {/* S3存储信息 */}
              {model.s3_url && (
                <div className="mt-4">
                  <h4 className="text-xs font-medium text-gray-500">S3 Storage</h4>
                  <div className="mt-1 space-y-2">
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 w-20">URL:</span>
                      <Link 
                        href={model.s3_url} 
                        target="_blank"
                        className="text-blue-600 hover:text-blue-800 text-sm truncate max-w-xs"
                      >
                        {model.s3_url}
                      </Link>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(model.s3_url)}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                        title="Copy URL"
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                      </button>
                    </div>
                    
                    {model.s3_key && (
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 w-20">S3 Key:</span>
                        <span className="text-sm text-gray-900 truncate max-w-xs">{model.s3_key}</span>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(model.s3_key || '')}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                          title="Copy Key"
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 