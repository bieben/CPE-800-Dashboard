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
  model_type: 'notebook' | 'pickle';
  model_id?: string;
}

export interface AddModelData {
  name: string;
  description: string;
  version: string;
  model_type: 'notebook' | 'pickle';
  file?: File;
  notebook_url?: string;
  model_id?: string;
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