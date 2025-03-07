export type DeploymentStatus = 'running' | 'stopped' | 'failed' | 'pending';
export type DeploymentEnvironment = 'development' | 'staging' | 'production';

export interface DeploymentResources {
  cpu: string;
  memory: string;
  gpu: string;
}

export interface DeploymentMetrics {
  uptime: string;
  requests: number;
  latency: string;
}

export interface Deployment {
  id: string;
  modelId: string;
  modelName: string;
  environment: DeploymentEnvironment;
  status: DeploymentStatus;
  version: string;
  createdAt: string;
  lastUpdated: string;
  resources: DeploymentResources;
  metrics: DeploymentMetrics;
  description?: string;
} 