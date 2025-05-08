export interface ModelMetrics {
  requests: number;
  latency: string;
  accuracy: string;
}

export interface Model {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'stopped' | 'failed';
  type: string;
  version: string;
  createdBy: string;
  lastUpdated: string;
  metrics: ModelMetrics;
  notebook_url?: string;
  s3_url?: string;
  s3_key?: string;
}

export interface AddModelData {
  name: string;
  description: string;
  version: string;
  file?: File;
  notebook_url?: string;
  s3_url?: string;
  s3_key?: string;
}

export interface UpdateModelData {
  name?: string;
  description?: string;
  version?: string;
}

export interface CreateModelData extends AddModelData {
  createdBy: string;
  lastUpdated: string;
  status: 'running' | 'stopped' | 'failed';
  type: string;
  metrics: ModelMetrics;
} 