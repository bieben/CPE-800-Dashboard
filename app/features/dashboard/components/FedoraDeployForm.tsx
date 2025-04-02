'use client';

import { useState } from 'react';

export default function FedoraDeployForm() {
  const [formData, setFormData] = useState({
    server_ip: '',
    ssh_user: '',
    ssh_password: '',
    libraries: [] as string[]
  });
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/deploy/fedora', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        setStatus({
          type: 'success',
          message: 'Fedora Server deployed successfully! Redirecting to Jupyter Notebook...'
        });
        // Redirect to Jupyter after 2 seconds
        setTimeout(() => {
          // Ensure the server IP is properly formatted
          const serverIp = formData.server_ip.trim();
          const jupyterUrl = `http://${serverIp}:8080`;
          console.log(`Redirecting to: ${jupyterUrl}`);
          window.location.href = jupyterUrl;
        }, 2000);
      } else {
        setStatus({
          type: 'error',
          message: `Error: ${result.error}`
        });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      });
    }
  };

  const handleLibraryChange = (library: string) => {
    setFormData(prev => ({
      ...prev,
      libraries: prev.libraries.includes(library)
        ? prev.libraries.filter(l => l !== library)
        : [...prev.libraries, library]
    }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Deploy Fedora Server</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="server_ip" className="block text-sm font-medium text-gray-700">
            Server IP Address
          </label>
          <input
            type="text"
            id="server_ip"
            value={formData.server_ip}
            onChange={(e) => setFormData(prev => ({ ...prev, server_ip: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            placeholder="e.g., 192.168.1.100"
            required
          />
        </div>

        <div>
          <label htmlFor="ssh_user" className="block text-sm font-medium text-gray-700">
            SSH User
          </label>
          <input
            type="text"
            id="ssh_user"
            value={formData.ssh_user}
            onChange={(e) => setFormData(prev => ({ ...prev, ssh_user: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            placeholder="e.g., fedora"
            required
          />
        </div>

        <div>
          <label htmlFor="ssh_password" className="block text-sm font-medium text-gray-700">
            SSH Password
          </label>
          <input
            type="password"
            id="ssh_password"
            value={formData.ssh_password}
            onChange={(e) => setFormData(prev => ({ ...prev, ssh_password: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            placeholder="Enter Password"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Libraries to Install
          </label>
          <div className="space-y-2">
            {['pytorch', 'tensorflow', 'scikit-learn'].map((library) => (
              <div key={library} className="flex items-center">
                <input
                  type="checkbox"
                  id={library}
                  checked={formData.libraries.includes(library)}
                  onChange={() => handleLibraryChange(library)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor={library} className="ml-2 block text-sm text-gray-900">
                  {library.charAt(0).toUpperCase() + library.slice(1)}
                </label>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Deploy Fedora Server
        </button>

        {status.type && (
          <div className={`mt-4 p-4 rounded-md ${
            status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {status.message}
          </div>
        )}
      </form>
    </div>
  );
} 