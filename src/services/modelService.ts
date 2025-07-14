import {
  AIProvider,
  LOCAL_MODEL_CONFIG,
  LocalModel,
  ModelGroup,
  ModelInfo,
  ModelItem,
  ModelSelectValue,
  ModelState,
  REMOTE_MODEL_PROVIDERS,
  RemoteModelProvider,
} from '@/types/ai';
import { safeGetFromStorage } from '@/utils/dataUtils';

import { configApi } from './configApi';
import { ollamaTauriApi } from './ollamaTauriApi';

class ModelService {
  private localModels: LocalModel[] = [];
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds cache

  /**
   * Get remote model configuration
   */
  private getRemoteModels(): ModelInfo[] {
    const remoteModels: ModelInfo[] = [];

    // Get all remote models from REMOTE_MODEL_PROVIDERS
    Object.entries(REMOTE_MODEL_PROVIDERS).forEach(([providerKey, providerConfig]) => {
      const provider = providerKey as RemoteModelProvider;

      // Create ModelInfo object for each model of each provider
      providerConfig.models.forEach((modelItem: ModelItem) => {
        remoteModels.push({
          id: modelItem.id, // Use model ID
          name: modelItem.name, // Display name
          provider: provider, // Provider
          type: 'remote', // Remote model
          requiresApiKey: true, // All remote models require API Key
          description: providerConfig.description || `${modelItem.name} by ${providerConfig.name}`,
          parameters: '', // Parameter information may not be available
          icon: providerConfig.icon, // Use provider icon
        });
      });
    });

    return remoteModels;
  }

  /**
   * Get local model list
   */
  async fetchLocalModels(forceRefresh = false): Promise<LocalModel[]> {
    const now = Date.now();

    // Use cache unless force refresh
    if (
      !forceRefresh &&
      this.localModels.length > 0 &&
      now - this.lastFetchTime < this.CACHE_DURATION
    ) {
      // Using cached local models
      return this.localModels;
    }

    try {
      // Fetching local models from Ollama
      this.localModels = await ollamaTauriApi.listModels();
      this.lastFetchTime = now;
      // Successfully fetched local models
      return this.localModels;
    } catch (error) {
      // Failed to fetch local models

      // Check if it's a connection issue
      try {
        const isConnected = await ollamaTauriApi.checkConnection();
        // Ollama connection status checked
        if (!isConnected) {
          // Ollama service is not running or not accessible
        }
      } catch (connError) {
        // Failed to check Ollama connection
      }
      return [];
    }
  }

  /**
   * Convert local models to ModelInfo format
   */
  private convertLocalModelsToModelInfo(localModels: LocalModel[]): ModelInfo[] {
    return localModels.map(model => ({
      id: model.name,
      name: this.getDisplayName(model.name),
      provider: 'ollama' as AIProvider,
      type: 'local' as const,
      requiresApiKey: false,
      description: `Local model - ${model.details.family}`,
      parameters: model.details.parameter_size,
      size: model.size,
      family: model.details.family,
      icon: LOCAL_MODEL_CONFIG.icon,
    }));
  }

  /**
   * Get model display name
   */
  private getDisplayName(modelName: string): string {
    const nameMap: Record<string, string> = {
      'llama3.2:3b': 'Llama 3.2 (3B)',
      'llama3.2:1b': 'Llama 3.2 (1B)',
      'llama3.1:8b': 'Llama 3.1 (8B)',
      'llama3.1:70b': 'Llama 3.1 (70B)',
      'qwen2.5:7b': 'Qwen 2.5 (7B)',
      'qwen2.5:14b': 'Qwen 2.5 (14B)',
      'qwen2.5:32b': 'Qwen 2.5 (32B)',
      'mistral:7b': 'Mistral (7B)',
      'codellama:7b': 'Code Llama (7B)',
      'codellama:13b': 'Code Llama (13B)',
      'phi3:3.8b': 'Phi-3 (3.8B)',
      'gemma2:9b': 'Gemma 2 (9B)',
      'gemma2:27b': 'Gemma 2 (27B)',
      'deepseek-r1:14b': 'DeepSeek R1 (14B)',
      'deepseek-r1:32b': 'DeepSeek R1 (32B)',
    };

    return nameMap[modelName] || modelName;
  }

  /**
   * Get all available models, grouped by type
   */
  async getAllModels(): Promise<ModelGroup[]> {
    const localModels = await this.fetchLocalModels();
    const remoteModels = this.getRemoteModels();
    const localModelInfos = this.convertLocalModelsToModelInfo(localModels);

    const groups: ModelGroup[] = [];

    // Local model group
    if (localModelInfos.length > 0) {
      groups.push({
        title: 'Local Models',
        models: localModelInfos,
        type: 'local',
      });
    }

    // Remote model groups - grouped by provider
    const remoteModelsByProvider = remoteModels.reduce(
      (acc, model) => {
        const provider = model.provider as RemoteModelProvider;
        if (!acc[provider]) {
          acc[provider] = [];
        }
        acc[provider].push(model);
        return acc;
      },
      {} as Record<RemoteModelProvider, ModelInfo[]>
    );

    Object.entries(remoteModelsByProvider).forEach(([provider, models]) => {
      const providerConfig = REMOTE_MODEL_PROVIDERS[provider as RemoteModelProvider];
      groups.push({
        title: providerConfig.name,
        models,
        type: 'remote',
      });
    });

    return groups;
  }

  /**
   * Parse model selection value
   */
  parseModelSelectValue(value: ModelSelectValue): { provider: AIProvider; model: string } | null {
    if (!value) return null;

    const firstColonIndex = value.indexOf(':');
    if (firstColonIndex === -1) return null;

    const provider = value.substring(0, firstColonIndex) as AIProvider;
    const model = value.substring(firstColonIndex + 1);

    return { provider, model };
  }

  /**
   * Create model selection value
   */
  createModelSelectValue(provider: AIProvider, model: string): ModelSelectValue {
    return `${provider}:${model}`;
  }

  /**
   * Check if model is available
   */
  async isModelAvailable(provider: AIProvider, model: string): Promise<boolean> {
    if (provider === 'ollama') {
      // Check if local model exists
      const localModels = await this.fetchLocalModels();
      return localModels.some(m => m.name === model);
    } else {
      // Check if remote model has API Key configured
      return this.hasRemoteApiConfigured(provider as RemoteModelProvider);
    }
  }

  /**
   * Get model state
   */
  async getModelState(provider: AIProvider, model: string): Promise<ModelState> {
    const isAvailable = await this.isModelAvailable(provider, model);

    return {
      provider,
      model,
      isAvailable,
      requiresConfig: provider !== 'ollama' && !isAvailable,
    };
  }

  /**
   * Check if there are available local models
   */
  async hasLocalModels(): Promise<boolean> {
    const localModels = await this.fetchLocalModels();
    return localModels.length > 0;
  }

  /**
   * Check if remote API is configured
   */
  hasRemoteApiConfigured(provider: RemoteModelProvider): boolean {
    const config = this.getRemoteApiConfig(provider);
    const isConfigured = !!(config && config.apiKey && config.apiKey.trim().length > 0);
    // Checking API config for provider
    return isConfigured;
  }

  /**
   * Check if Ollama service is running
   */
  async isOllamaRunning(): Promise<boolean> {
    try {
      return await ollamaTauriApi.checkConnection();
    } catch {
      return false;
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(provider: AIProvider, model: string): Promise<ModelInfo | null> {
    if (provider === 'ollama') {
      const localModels = await this.fetchLocalModels();
      const localModel = localModels.find(m => m.name === model);
      if (localModel) {
        return this.convertLocalModelsToModelInfo([localModel])[0];
      }
    } else {
      const remoteModels = this.getRemoteModels();
      return remoteModels.find(m => m.id === model && m.provider === provider) || null;
    }
    return null;
  }

  /**
   * Get recommended default model
   */
  async getRecommendedModel(): Promise<{ provider: AIProvider; model: string } | null> {
    // Prioritize local models
    const localModels = await this.fetchLocalModels();
    if (localModels.length > 0) {
      // Sort recommended models by priority
      const preferredModels = ['llama3.2:3b', 'qwen2.5:7b', 'mistral:7b', 'deepseek-r1:14b'];
      for (const preferred of preferredModels) {
        if (localModels.some(model => model.name === preferred)) {
          return { provider: 'ollama', model: preferred };
        }
      }
      // If no recommended model, return the first available one
      return { provider: 'ollama', model: localModels[0].name };
    }

    // If no local models, check remote configuration
    const remoteProviders: RemoteModelProvider[] = ['openai', 'deepseek', 'anthropic', 'google'];
    for (const provider of remoteProviders) {
      if (this.hasRemoteApiConfigured(provider)) {
        const providerConfig = REMOTE_MODEL_PROVIDERS[provider];
        if (providerConfig.models.length > 0) {
          return { provider, model: providerConfig.models[0].id };
        }
      }
    }

    return null;
  }

  /**
   * Get all available model selection values
   */
  async getAllModelSelectValues(): Promise<
    { value: ModelSelectValue; label: string; provider: AIProvider; type: 'local' | 'remote' }[]
  > {
    const groups = await this.getAllModels();
    const options: {
      value: ModelSelectValue;
      label: string;
      provider: AIProvider;
      type: 'local' | 'remote';
    }[] = [];

    groups.forEach(group => {
      group.models.forEach(model => {
        options.push({
          value: this.createModelSelectValue(model.provider, model.id),
          label: model.name,
          provider: model.provider,
          type: model.type,
        });
      });
    });

    return options;
  }

  /**
   * Get configured base URL
   */
  async getBaseURL(provider: AIProvider): Promise<string> {
    if (provider === 'ollama') {
      try {
        return await configApi.getOllamaHost();
      } catch (error) {
        // Failed to get Ollama host
        return LOCAL_MODEL_CONFIG.baseURL;
      }
    } else {
      return REMOTE_MODEL_PROVIDERS[provider as RemoteModelProvider]?.baseURL || '';
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.localModels = [];
    this.lastFetchTime = 0;
    // Model cache cleared
  }

  /**
   * Get API configuration for remote provider
   */
  getRemoteApiConfig(provider: RemoteModelProvider): { apiKey: string; baseURL: string } | null {
    try {
      const storageKey = `api-config-${provider}`;
      const config = safeGetFromStorage(storageKey, null);
      // Getting API config for provider
      return config;
    } catch (error) {
      // Failed to get API config for provider
      return null;
    }
  }

  /**
   * Set API configuration for remote provider
   */
  setRemoteApiConfig(
    provider: RemoteModelProvider,
    config: { apiKey: string; baseURL: string }
  ): void {
    try {
      const storageKey = `api-config-${provider}`;
      localStorage.setItem(storageKey, JSON.stringify(config));
      // API config saved for provider
    } catch (error) {
      // Failed to save API config for provider
    }
  }

  /**
   * Clear API configuration for remote provider
   */
  clearRemoteApiConfig(provider: RemoteModelProvider): void {
    try {
      localStorage.removeItem(`api-config-${provider}`);
      // API config cleared for provider
    } catch (error) {
      // Failed to clear API config for provider
    }
  }
}

export const modelService = new ModelService();
