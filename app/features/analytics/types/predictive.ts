export interface ResourcePrediction {
  timestamp: string;
  resource: string;
  predicted_value: number;
  lower_bound?: number;
  upper_bound?: number;
  actual_value?: number;
}

export interface ResourcePredictions {
  [resourceName: string]: ResourcePrediction[];
}

export interface OptimizationResult {
  resource_type: string;
  current_allocation: number;
  suggested_allocation: number;
  estimated_savings: number;
  unit: string;
}

export interface PredictiveAlert {
  resource: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  affected_models: string[];
}

export interface PredictionResponse {
  status: string;
  data: {
    predictions: Record<string, ResourcePrediction[]>;
    optimization: OptimizationResult[];
    timestamp: string;
  };
}

export interface PredictionHistoryResponse {
  status: string;
  data: PredictionResponse[];
}

export interface PredictionTriggerOptions {
  horizon: number;
  use_cache: boolean;
}

export interface ResourceMetric {
  name: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
}

export interface SystemMetricsResponse {
  status: string;
  data: Record<string, number>;
  timestamp: string;
} 