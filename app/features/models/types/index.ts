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
}

export interface AddModelData {
  name: string;
  description: string;
  version: string;
  file?: File;
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