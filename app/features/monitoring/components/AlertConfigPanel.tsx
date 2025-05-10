'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/shared/components/ui/card';
import { getAlertsConfig, updateAlertsConfig } from '../services/monitoringService';

interface AlertConfigPanelProps {
  onConfigUpdate?: () => void;
}

const AlertConfigPanel: React.FC<AlertConfigPanelProps> = ({ onConfigUpdate }) => {
  const [cpuThreshold, setCpuThreshold] = useState<number>(80);
  const [memoryThreshold, setMemoryThreshold] = useState<number>(85);
  const [diskThreshold, setDiskThreshold] = useState<number>(90);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load configuration
  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const config = await getAlertsConfig();
        setCpuThreshold(config.cpu_threshold);
        setMemoryThreshold(config.memory_threshold);
        setDiskThreshold(config.disk_threshold);
        setError(null);
      } catch (err) {
        setError('Failed to load alert configuration');
        console.error('Error loading alert config:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // Save configuration
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const success = await updateAlertsConfig({
        cpu_threshold: cpuThreshold,
        memory_threshold: memoryThreshold,
        disk_threshold: diskThreshold
      });
      
      if (success) {
        setSuccessMessage('Alert configuration updated successfully');
        if (onConfigUpdate) {
          onConfigUpdate();
        }
      } else {
        setError('Failed to update configuration');
      }
    } catch (err) {
      setError('Error saving configuration');
      console.error('Error saving alert config:', err);
    } finally {
      setSaving(false);
      
      // Clear success message after 3 seconds
      if (successMessage) {
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert Configuration</CardTitle>
        <CardDescription>Set resource usage alert thresholds</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-4 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="cpu-threshold" className="block text-sm font-medium text-gray-700 mb-1">
                CPU Threshold ({cpuThreshold}%)
              </label>
              <input
                id="cpu-threshold"
                type="range"
                min="0"
                max="100"
                step="1"
                value={cpuThreshold}
                onChange={(e) => setCpuThreshold(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <div>
              <label htmlFor="memory-threshold" className="block text-sm font-medium text-gray-700 mb-1">
                Memory Threshold ({memoryThreshold}%)
              </label>
              <input
                id="memory-threshold"
                type="range"
                min="0"
                max="100"
                step="1"
                value={memoryThreshold}
                onChange={(e) => setMemoryThreshold(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <div>
              <label htmlFor="disk-threshold" className="block text-sm font-medium text-gray-700 mb-1">
                Disk Threshold ({diskThreshold}%)
              </label>
              <input
                id="disk-threshold"
                type="range"
                min="0"
                max="100"
                step="1"
                value={diskThreshold}
                onChange={(e) => setDiskThreshold(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
            )}
            
            {successMessage && (
              <div className="p-3 rounded bg-green-50 text-green-700 text-sm">{successMessage}</div>
            )}

            <div className="pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-4 py-2 rounded-md text-white ${
                  saving ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertConfigPanel; 