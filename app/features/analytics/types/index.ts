export interface PerformanceMetric {
  timestamp: string;
  value: number;
}

export interface ModelMetrics {
  id: string;
  modelName: string;
  environment: string;
  metrics: {
    requestsPerMinute: PerformanceMetric[];
    latency: PerformanceMetric[];
    errorRate: PerformanceMetric[];
    cpuUsage: PerformanceMetric[];
    memoryUsage: PerformanceMetric[];
  };
  summary: {
    totalRequests: number;
    averageLatency: string;
    averageErrorRate: string;
    uptime: string;
    cost: string;
  };
} 