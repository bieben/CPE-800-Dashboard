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
  const [deployments, setDeployments] = useState<Deployment[]>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const savedDeployments = localStorage.getItem('deployments');
      return savedDeployments ? JSON.parse(savedDeployments) : [];
    }
    return [];
  });

  const addDeployment = (deployment: Deployment) => {
    setDeployments(prev => {
      const updated = [...prev, deployment];
      localStorage.setItem('deployments', JSON.stringify(updated));
      return updated;
    });
  };

  const updateDeployment = (id: string, deployment: Partial<Deployment>) => {
    setDeployments(prev => {
      const updated = prev.map(d => (d.id === id ? { ...d, ...deployment } : d));
      localStorage.setItem('deployments', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteDeployment = (id: string) => {
    setDeployments(prev => {
      const updated = prev.filter(d => d.id !== id);
      localStorage.setItem('deployments', JSON.stringify(updated));
      return updated;
    });
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