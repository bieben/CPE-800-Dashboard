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

// Mock data - replace with actual API call
const mockModels: Model[] = [
  {
    id: '1',
    name: 'GPT-3',
    description: 'Large language model for text generation',
    status: 'running',
    type: 'text',
    version: '1.0.0',
    lastUpdated: '2024-02-28',
    metrics: {
      requests: 1500000,
      latency: '150ms',
      accuracy: '98.5%',
    },
  },
  {
    id: '2',
    name: 'BERT',
    description: 'Pre-trained model for natural language understanding',
    status: 'stopped',
    type: 'text',
    version: '2.1.0',
    lastUpdated: '2024-02-27',
    metrics: {
      requests: 800000,
      latency: '80ms',
      accuracy: '97.2%',
    },
  },
  {
    id: '3',
    name: 'ResNet50',
    description: 'Convolutional neural network for image classification',
    status: 'running',
    type: 'image',
    version: '1.2.0',
    lastUpdated: '2024-02-26',
    metrics: {
      requests: 500000,
      latency: '200ms',
      accuracy: '95.8%',
    },
  },
];

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [models, setModels] = useState<Model[]>([]);

  const addModel = (data: CreateModelData) => {
    const newModel: Model = {
      ...data,
      id: `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setModels(prev => [...prev, newModel]);
  };

  const updateModel = (id: string, data: Partial<Model>) => {
    setModels(prev => prev.map(model => 
      model.id === id ? { ...model, ...data } : model
    ));
  };

  const deleteModel = (id: string) => {
    setModels(prev => prev.filter(model => model.id !== id));
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