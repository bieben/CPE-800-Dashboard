import axios from 'axios';

export interface HealthStatus {
  status: string;
  timestamp: string;
  services: {
    api: string;
    [key: string]: string;
  };
  components_initialized: boolean;
  models: {
    total: number;
    deployed: number;
  };
}

export interface Metrics {
  requestsTotal: number;
  predictionsTotal: number;
  errorsTotal: number;
  errorTypes: {
    [key: string]: number;
  };
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
}

export interface AlertRule {
  name: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  status: 'firing' | 'resolved';
  value: number;
  threshold: number;
  since: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * 获取模型服务健康状态
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.data;
  } catch (error) {
    console.error('Error fetching health status:', error);
    throw new Error('Failed to fetch health status');
  }
}

/**
 * 从Prometheus获取指标数据
 */
export async function getMetrics(): Promise<Metrics> {
  try {
    // 在实际环境中，这里应该调用Prometheus API或我们自己的API端点
    // 获取原始指标数据，然后对其进行处理
    const response = await axios.get(`${API_BASE_URL}/metrics`);
    const metricsText = response.data;
    
    // 解析Prometheus格式的指标数据
    const requestsTotal = extractMetricValue(metricsText, 'model_service_requests_total');
    const predictionsTotal = extractMetricValue(metricsText, 'model_service_requests_total{endpoint="/predict"}');
    const errorsTotal = extractMetricValue(metricsText, 'model_errors_total');
    
    // 解析错误类型
    const errorTypes: { [key: string]: number } = {};
    const errorTypeRegex = /model_errors_total{error_type="([^"]+)"[^}]*} (\d+)/g;
    let match;
    while ((match = errorTypeRegex.exec(metricsText)) !== null) {
      const errorType = match[1];
      const count = parseInt(match[2], 10);
      errorTypes[errorType] = count;
    }
    
    // 解析延迟指标
    const avgLatency = extractMetricValue(metricsText, 'model_request_latency_seconds_sum') / 
                     Math.max(1, extractMetricValue(metricsText, 'model_request_latency_seconds_count'));
    
    const p95Latency = extractMetricValue(metricsText, 'model_request_latency_seconds{quantile="0.95"}');
    const p99Latency = extractMetricValue(metricsText, 'model_request_latency_seconds{quantile="0.99"}');
    
    return {
      requestsTotal,
      predictionsTotal,
      errorsTotal,
      errorTypes,
      avgLatency,
      p95Latency,
      p99Latency
    };
  } catch (error) {
    console.error('Error fetching metrics:', error);
    throw new Error('Failed to fetch metrics');
  }
}

/**
 * 获取当前活跃的告警
 */
export async function getAlerts(): Promise<AlertRule[]> {
  try {
    // 在实际环境中，这里应该调用Alertmanager API
    const response = await axios.get(`${API_BASE_URL}/alerts`);
    return response.data;
  } catch (error) {
    console.error('Error fetching alerts:', error);
    throw new Error('Failed to fetch alerts');
  }
}

/**
 * 从Prometheus指标文本中提取特定指标的值
 */
function extractMetricValue(metricsText: string, metricName: string): number {
  const regex = new RegExp(`${metricName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^{]* (\\d+(?:\\.\\d+)?)`);
  const match = metricsText.match(regex);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * 模拟数据用于开发阶段
 */
export function getMockHealthStatus(): HealthStatus {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      api: 'up',
      collector: 'up',
      model: 'up',
      optimizer: 'up',
      exporter: 'using in-memory fallback'
    },
    components_initialized: true,
    models: {
      total: 2,
      deployed: 1
    }
  };
}

export function getMockMetrics(): Metrics {
  return {
    requestsTotal: 125,
    predictionsTotal: 110,
    errorsTotal: 15,
    errorTypes: {
      'input_validation': 7,
      'prediction_timeout': 3,
      'model_not_found': 5
    },
    avgLatency: 0.35,
    p95Latency: 0.85,
    p99Latency: 1.2
  };
}

export function getMockAlerts(): AlertRule[] {
  return [
    {
      name: 'High Latency',
      severity: 'warning',
      description: 'Service response time is higher than expected',
      status: 'resolved',
      value: 0.8,
      threshold: 1.0,
      since: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    },
    {
      name: 'Error Rate',
      severity: 'critical',
      description: 'High error rate detected',
      status: 'resolved',
      value: 1,
      threshold: 3,
      since: new Date(Date.now() - 45 * 60 * 1000).toISOString()
    }
  ];
} 