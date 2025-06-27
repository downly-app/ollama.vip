
import { create } from 'zustand';
import { getModelsApiUrl } from '../config/apiConfig';

interface Model {
  name: string;
  description: string;
  types: string[];
  sizes: string[];
  pulls: number;
  tags: number;
  updated_at: string;
  status?: 'running' | 'idle' | 'error' | 'downloading';
  downloadProgress?: number;
  isLocal?: boolean;
}

interface ModelState {
  models: Model[];
  currentModel: string | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    current_page: number;
    has_next: boolean;
    has_previous: boolean;
    page_size: number;
    total_count: number;
    total_pages: number;
  } | null;
  fetchModels: (page?: number, query?: string, categories?: string[], sortOrder?: string) => Promise<void>;
  downloadModel: (modelName: string) => Promise<void>;
  deleteModel: (modelName: string) => Promise<void>;
  setCurrentModel: (modelName: string) => void;
}

export const useModelStore = create<ModelState>((set, get) => ({
  models: [],
  currentModel: null,
  isLoading: false,
  error: null,
  pagination: null,
  
  fetchModels: async (page = 1, query = '', categories = [], sortOrder = 'popular') => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        o: sortOrder
      });
      
      if (query) {
        params.append('q', query);
      }
      
      categories.forEach(category => {
        params.append('c', category);
      });
      
      const response = await fetch(`${getModelsApiUrl()}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      set({ 
        models: data.data || [], 
        pagination: data.pagination || null,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to fetch models:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch models', 
        isLoading: false 
      });
    }
  },
  
  downloadModel: async (modelName: string) => {
    // Mock download - replace with actual Ollama API calls
    set(state => ({
      models: state.models.map(model =>
        model.name === modelName
          ? { ...model, status: 'downloading' as const, downloadProgress: 0, isLocal: false }
          : model
      )
    }));
    
    // Simulate download progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      set(state => ({
        models: state.models.map(model =>
          model.name === modelName
            ? { ...model, downloadProgress: i }
            : model
        )
      }));
    }
    
    set(state => ({
      models: state.models.map(model =>
        model.name === modelName
          ? { ...model, status: 'idle' as const, downloadProgress: undefined, isLocal: true }
          : model
      )
    }));
  },
  
  deleteModel: async (modelName: string) => {
    set(state => ({
      models: state.models.filter(model => model.name !== modelName)
    }));
  },
  
  setCurrentModel: (modelName: string) => {
    set({ currentModel: modelName });
  }
}));
