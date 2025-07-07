import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/hooks/use-toast';
import { modelService } from '@/services/modelService';
import {
  AIConfig,
  AIProvider,
  ModelSelectValue,
  REMOTE_MODEL_PROVIDERS,
  RemoteModelProvider,
} from '@/types/ai';
import { safeGetFromStorage, safeSetToStorage } from '@/utils/dataUtils';

interface UseModelSelectionOptions {
  onError?: (error: Error) => void;
  onWarning?: (message: string) => void;
}

interface UseModelSelectionReturn {
  // State
  currentModelValue: ModelSelectValue;
  showSettings: boolean;

  // Actions
  setCurrentModelValue: (value: ModelSelectValue) => void;
  setShowSettings: (show: boolean) => void;
  handleModelChange: (value: string) => Promise<void>;
  handleCreateNewChat: () => Promise<void>;

  // Utilities
  getAIConfigSync: () => AIConfig;
  checkModelAvailability: (provider: AIProvider, model: string) => Promise<boolean>;
  initializeModel: () => Promise<void>;
}

export const useModelSelection = ({
  onError,
  onWarning,
}: UseModelSelectionOptions): UseModelSelectionReturn => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [currentModelValue, setCurrentModelValue] = useState<ModelSelectValue>('openai:gpt-4o');
  const [showSettings, setShowSettings] = useState(false);

  // Get AI configuration (synchronous version for JSX)
  const getAIConfigSync = useCallback((): AIConfig => {
    try {
      const parsed = modelService.parseModelSelectValue(currentModelValue);
      return safeGetFromStorage<AIConfig>('ai-config', {
        provider: parsed?.provider || 'openai',
        apiKey: '',
        model: parsed?.model || 'gpt-4o',
        temperature: 0.7,
      });
    } catch (error) {
      onError?.(error as Error);
      return {
        provider: 'openai',
        apiKey: '',
        model: 'gpt-4o',
        temperature: 0.7,
      };
    }
  }, [currentModelValue, onError]);

  // Check model availability
  const checkModelAvailability = useCallback(
    async (provider: AIProvider, model: string): Promise<boolean> => {
      try {
        return await modelService.isModelAvailable(provider, model);
      } catch (error) {
        onError?.(error as Error);
        return false;
      }
    },
    [onError]
  );

  // Initialize with recommended model
  const initializeModel = useCallback(async () => {
    try {
      const recommended = await modelService.getRecommendedModel();
      if (recommended) {
        const modelValue = modelService.createModelSelectValue(
          recommended.provider,
          recommended.model
        );
        setCurrentModelValue(modelValue);

        // Save to storage
        const config = getAIConfigSync();
        safeSetToStorage('ai-config', {
          ...config,
          provider: recommended.provider,
          model: recommended.model,
        });
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }, [getAIConfigSync, onError]);

  // Initialize model on mount
  useEffect(() => {
    const hasInitialModel = !!currentModelValue && currentModelValue !== 'openai:gpt-4o';
    if (!hasInitialModel) {
      initializeModel();
    }
  }, [initializeModel, currentModelValue]);

  // Handle model change
  const handleModelChange = useCallback(
    async (value: string) => {
      try {
        const parsed = modelService.parseModelSelectValue(value);
        if (!parsed) {
          onError?.(new Error('Invalid model format'));
          return;
        }

        // Check if remote model has API Key configured
        if (parsed.provider !== 'ollama') {
          const isConfigured = modelService.hasRemoteApiConfigured(
            parsed.provider as RemoteModelProvider
          );
          if (!isConfigured) {
            setShowSettings(true);
            toast({
              title: t('chat.apiKeyRequired'),
              description: t('chat.pleaseConfigureApiKey', { provider: parsed.provider }),
              variant: 'destructive',
              duration: 5000,
            });
            return;
          }
        }

        setCurrentModelValue(value);

        // Update configuration
        const config = getAIConfigSync();
        const updatedConfig = {
          ...config,
          provider: parsed.provider,
          model: parsed.model,
          baseURL: await modelService.getBaseURL(parsed.provider),
        };

        safeSetToStorage('ai-config', updatedConfig);
      } catch (error) {
        onError?.(error as Error);
      }
    },
    [getAIConfigSync, onError, t, toast]
  );

  // Handle create new chat with availability check
  const handleCreateNewChat = useCallback(async () => {
    try {
      // Check if there are available models
      const hasLocal = await modelService.hasLocalModels();
      const hasRemoteApi = Object.keys(REMOTE_MODEL_PROVIDERS).some(provider =>
        modelService.hasRemoteApiConfigured(provider as RemoteModelProvider)
      );

      if (!hasLocal && !hasRemoteApi) {
        onWarning?.(
          t('chat.noModelsConfigured', 'Please download local models or configure API Key')
        );
        return;
      }

      // Check if current model is available
      const parsed = modelService.parseModelSelectValue(currentModelValue);
      if (parsed) {
        const isCurrentAvailable = await checkModelAvailability(parsed.provider, parsed.model);
        if (!isCurrentAvailable) {
          const recommended = await modelService.getRecommendedModel();
          if (recommended) {
            const modelValue = modelService.createModelSelectValue(
              recommended.provider,
              recommended.model
            );
            setCurrentModelValue(modelValue);
          } else {
            onWarning?.(t('chat.noAvailableModels', 'No available models'));
            return;
          }
        }
      }

      // Create new chat logic would be handled by the parent component
      // This function just validates the model availability
    } catch (error) {
      onError?.(error as Error);
    }
  }, [currentModelValue, checkModelAvailability, onError, onWarning, t]);

  return {
    // State
    currentModelValue,
    showSettings,

    // Actions
    setCurrentModelValue,
    setShowSettings,
    handleModelChange,
    handleCreateNewChat,

    // Utilities
    getAIConfigSync,
    checkModelAvailability,
    initializeModel,
  };
};
