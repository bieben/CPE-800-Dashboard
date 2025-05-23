'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import type { AddModelData } from '../types';

interface AddModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: AddModelData) => void;
}

export default function AddModelModal({
  isOpen,
  onClose,
  onAdd,
}: AddModelModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadToS3, setUploadToS3] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.ipynb')) {
        setError('Only .ipynb files are supported');
        return;
      }
      setFile(selectedFile);
      // Set model name from filename without extension
      const fileName = selectedFile.name.replace(/\.[^/.]+$/, '');
      if (name === '' || name === file?.name.replace(/\.[^/.]+$/, '')) {
        setName(fileName);
      }
      if (description === '') {
        setDescription(`Model uploaded from ${selectedFile.name}`);
      }
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a model file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('model_name', name);
      formData.append('model_description', description);
      formData.append('model_version', version);
      formData.append('model_file', file);

      // 并行发送两个请求，使用Promise.all
      const requests = [
        // 1. 上传到服务器本地
        fetch('http://10.156.115.33:5000/model/upload', {
          method: 'POST',
          body: formData,
        })
      ];
      
      // 如果启用了S3上传，添加S3上传请求
      if (uploadToS3) {
        // 创建一个新的FormData对象，因为同一个FormData不能在多个fetch中重用
        const s3FormData = new FormData();
        s3FormData.append('model_name', name);
        s3FormData.append('model_description', description);
        s3FormData.append('model_version', version);
        s3FormData.append('model_file', file);
        
        requests.push(
          fetch('http://10.156.115.33:5000/model/upload/s3', {
            method: 'POST',
            body: s3FormData,
          })
        );
      }

      const responses = await Promise.all(requests);
      
      // 检查两个请求是否都成功
      for (const response of responses) {
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload model');
        }
      }

      // 解析响应数据
      const [localData, s3Data] = await Promise.all(
        responses.map(response => response.json())
      );
      
      // 组合结果数据
      const resultData = {
        name: name,
        description,
        version,
        file,
        notebook_url: localData.notebook_url,
        // 如果上传到S3成功，添加S3信息
        s3_url: uploadToS3 ? s3Data?.public_url : undefined,
        s3_key: uploadToS3 ? s3Data?.s3_key : undefined,
      };

      // 调用onAdd回调，传入合并后的数据
      onAdd(resultData);

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload model');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setVersion('1.0.0');
      setFile(null);
      setError(null);
    }
  }, [isOpen]);

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
                  Add New Model
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Model File (.ipynb)
                    </label>
                    <input
                      type="file"
                      accept=".ipynb"
                      onChange={handleFileChange}
                      className="mt-1 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Model Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Version
                    </label>
                    <input
                      type="text"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      id="upload-to-s3"
                      type="checkbox"
                      checked={uploadToS3}
                      onChange={(e) => setUploadToS3(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="upload-to-s3" className="ml-2 block text-sm text-gray-700">
                      Also upload to S3 storage
                    </label>
                  </div>

                  {error && (
                    <div className="text-red-600 text-sm">{error}</div>
                  )}

                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                        uploading
                          ? 'bg-blue-300 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {uploading ? 'Uploading...' : 'Upload Model'}
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