'use client';

import { createContext, useContext, useState } from 'react';
import type { Model, CreateModelData } from '../types';

interface ModelContextType {
  models: Model[];
  addModel: (data: CreateModelData) => void;
  updateModel: (id: string, data: Partial<Model>) => void;
  deleteModel: (id: string) => void;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);


export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [models, setModels] = useState<Model[]>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const savedModels = localStorage.getItem('models');
      return savedModels ? JSON.parse(savedModels) : [];
    }
    return [];
  });

  const addModel = (data: CreateModelData) => {
    const newModel: Model = {
      ...data,
      id: `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setModels(prev => {
      const updated = [...prev, newModel];
      localStorage.setItem('models', JSON.stringify(updated));
      return updated;
    });
  };

  const updateModel = (id: string, data: Partial<Model>) => {
    setModels(prev => {
      const updated = prev.map(model => 
        model.id === id ? { ...model, ...data } : model
      );
      localStorage.setItem('models', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteModel = (id: string) => {
    setModels(prev => {
      const updated = prev.filter(model => model.id !== id);
      localStorage.setItem('models', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <ModelContext.Provider value={{ models, addModel, updateModel, deleteModel }}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModels() {
  const context = useContext(ModelContext);
  if (context === undefined) {
    throw new Error('useModels must be used within a ModelProvider');
  }
  return context;
} 