export interface PerformanceMetric {
  timestamp: string;
  value: number;
}

export interface ModelStatus {
  status: 'active' | 'inactive';
  metadata: {
    upload_time: string;
    feature_names: string[];
    feature_count: number;
  };
  performance: {
    total_predictions: number;
    avg_latency_ms: number;
    last_prediction: string;
  };
  deployment: {
    deployed: boolean;
    deploy_config: {
      resources: {
        cpu: string;
        memory: string;
        gpu: string;
      };
    };
    deploy_time: string;
  };
}

export interface Alert {
  modelId: string;
  message: string;
  timestamp: string;
  type: 'latency' | 'error' | 'resource';
}

export interface MetricsState {
  totalRequests: number;
  avgLatency: number;
  activeModels: number;
  modelMetrics: Record<string, ModelStatus>;
} 