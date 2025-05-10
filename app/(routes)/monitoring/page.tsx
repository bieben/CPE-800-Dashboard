'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/features/shared/components/ui/alert';

import HealthStatusPanel from '@/features/monitoring/components/HealthStatusPanel';
import AlertsPanel from '@/features/monitoring/components/AlertsPanel';
import AlertConfigPanel from '@/features/monitoring/components/AlertConfigPanel';
import MetricsPanel from '@/features/monitoring/components/MetricsPanel';
import LogsPanel from '@/features/monitoring/components/LogsPanel';
import ModelDetailsPanel from '@/features/monitoring/components/ModelDetailsPanel';

import { 
  getHealthStatus, 
  getMetrics, 
  getAlerts,
  getMockHealthStatus,
  getMockMetrics,
  getMockAlerts,
  HealthStatus,
  Metrics,
  AlertRule
} from '@/features/monitoring/services/monitoringService';

const MonitoringPage = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  
  const [loading, setLoading] = useState({
    health: true,
    metrics: true,
    alerts: true,
    logs: false
  });
  
  const [error, setError] = useState<string | null>(null);
  const [refreshTime, setRefreshTime] = useState<string>('');

  const fetchData = async () => {
    setLoading({
      health: true,
      metrics: true,
      alerts: true,
      logs: false // 日志加载状态将由LogsPanel组件自己管理
    });
    
    try {
      // 使用实际API获取数据
      
      // 获取健康状态
      try {
        const healthData = await getHealthStatus();
        setHealthStatus(healthData);
        setLoading(prev => ({ ...prev, health: false }));
      } catch (err) {
        console.error('Error fetching health status:', err);
        setHealthStatus(getMockHealthStatus()); // 失败时回退到模拟数据
        setLoading(prev => ({ ...prev, health: false }));
      }
      
      // 获取指标数据
      try {
        const metricsData = await getMetrics();
        setMetrics(metricsData);
        setLoading(prev => ({ ...prev, metrics: false }));
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setMetrics(getMockMetrics()); // 失败时回退到模拟数据
        setLoading(prev => ({ ...prev, metrics: false }));
      }
      
      // 获取告警数据
      try {
        const alertsData = await getAlerts();
        setAlerts(alertsData);
        setLoading(prev => ({ ...prev, alerts: false }));
      } catch (err) {
        console.error('Error fetching alerts:', err);
        setAlerts(getMockAlerts()); // 失败时回退到模拟数据
        setLoading(prev => ({ ...prev, alerts: false }));
      }
      
      setRefreshTime(new Date().toLocaleTimeString());
      setError(null);
    } catch (err) {
      console.error('Error fetching monitoring data:', err);
      setError('Failed to fetch monitoring data');
      
      // 确保所有加载状态都设置为完成
      setLoading({
        health: false,
        metrics: false,
        alerts: false,
        logs: false
      });
    }
  };

  useEffect(() => {
    fetchData();
    
    // 设置定时刷新
    const interval = setInterval(fetchData, 60000); // 每60秒刷新一次
    
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  const handleConfigUpdate = () => {
    // 当配置更新后，重新获取告警数据
    setLoading(prev => ({ ...prev, alerts: true }));
    getAlerts()
      .then(alertsData => {
        setAlerts(alertsData);
      })
      .catch(err => {
        console.error('Error fetching alerts after config update:', err);
        setAlerts(getMockAlerts());
      })
      .finally(() => {
        setLoading(prev => ({ ...prev, alerts: false }));
      });
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Model Service Monitoring</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            Last updated: {refreshTime || 'N/A'}
          </span>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-full hover:bg-gray-100"
            disabled={Object.values(loading).some(Boolean)}
          >
            <span className={`inline-block ${Object.values(loading).some(Boolean) ? 'animate-spin' : ''}`}>⟳</span>
          </button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <span className="inline-block mr-2">⚠️</span>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HealthStatusPanel 
              healthStatus={healthStatus} 
              loading={loading.health} 
            />
            <AlertsPanel 
              alerts={alerts.filter(a => a.status === 'firing')} 
              loading={loading.alerts} 
            />
          </div>
          <MetricsPanel 
            metrics={metrics} 
            loading={loading.metrics} 
          />
          <ModelDetailsPanel
            loading={loading.metrics}
          />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <MetricsPanel 
            metrics={metrics} 
            loading={loading.metrics} 
          />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AlertsPanel 
              alerts={alerts} 
              loading={loading.alerts} 
            />
            <AlertConfigPanel 
              onConfigUpdate={handleConfigUpdate}
            />
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <LogsPanel 
            loading={false} 
            onRefresh={handleRefresh} 
          />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default MonitoringPage; 