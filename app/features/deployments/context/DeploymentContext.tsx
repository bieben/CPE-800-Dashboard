'use client';

import { createContext, useContext, ReactNode, useState } from 'react';
import type { Deployment } from '../types';

interface DeploymentContextType {
  deployments: Deployment[];
  addDeployment: (deployment: Deployment) => void;
  updateDeployment: (id: string, deployment: Partial<Deployment>) => void;
  deleteDeployment: (id: string) => void;
}

const DeploymentContext = createContext<DeploymentContextType>(null!);

export function DeploymentProvider({ children }: { children: ReactNode }) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);

  const addDeployment = (deployment: Deployment) => {
    setDeployments(prev => [...prev, deployment]);
  };

  const updateDeployment = (id: string, deployment: Partial<Deployment>) => {
    setDeployments(prev =>
      prev.map(d => (d.id === id ? { ...d, ...deployment } : d))
    );
  };

  const deleteDeployment = (id: string) => {
    setDeployments(prev => prev.filter(d => d.id !== id));
  };

  return (
    <DeploymentContext.Provider value={{ deployments, addDeployment, updateDeployment, deleteDeployment }}>
      {children}
    </DeploymentContext.Provider>
  );
}

export function useDeployments() {
  const context = useContext(DeploymentContext);
  if (context === undefined) {
    throw new Error('useDeployments must be used within a DeploymentProvider');
  }
  return context;
} 