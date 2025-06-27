/**
 * Model-related utility functions
 */

import { REMOTE_MODEL_PROVIDERS, RemoteModelProvider } from '@/types/ai';

// Supported model icon mapping
const MODEL_ICONS: Record<string, string> = {
  // OpenAI models
  'gpt': '/icons/openai-color.svg',
  'openai': '/icons/openai-color.svg',

  // Anthropic models
  'claude': '/icons/anthropic-color.svg',
  'anthropic': '/icons/anthropic-color.svg',

  // Google models
  'gemini': '/icons/google-color.svg',
  'google': '/icons/google-color.svg',

  // DeepSeek models
  'deepseek': '/icons/deepseek-color.svg',

  // Meta models
  'llama': '/icons/meta-color.svg',
  'meta': '/icons/meta-color.svg',

  // xAI models
  'grok': '/icons/xai-color.svg',
  'xai': '/icons/xai-color.svg',

  // Alibaba models
  'qwen': '/icons/alibaba-color.svg',
  'alibaba': '/icons/alibaba-color.svg',

  // Default icon for local models
  'ollama': '/icons/ollama-color.svg',
  'local': '/icons/ollama-color.svg',
};

const DEFAULT_ICON = '/icons/openai-color.svg'; // Use OpenAI as default icon

/**
 * Get the corresponding icon URL based on model name
 * @param model Model name
 * @returns Icon URL
 */
export const getModelIconUrl = (model?: string): string => {
  if (!model) return DEFAULT_ICON;

  const modelLower = model.toLowerCase();

  // First check if it's a local model (format with colon, e.g., "llama3:8b")
  if (modelLower.includes(':')) {
    return MODEL_ICONS['ollama'];
  }

  // Iterate through all supported model prefixes to find matches
  for (const [key, iconUrl] of Object.entries(MODEL_ICONS)) {
    if (modelLower.includes(key)) {
      return iconUrl;
    }
  }

  return DEFAULT_ICON;
};

/**
 * Get icon URL based on provider
 * @param provider Provider name
 * @returns Icon URL
 */
export const getProviderIconUrl = (provider?: string): string => {
  if (!provider) return DEFAULT_ICON;

  // Local models
  if (provider === 'ollama') {
    return MODEL_ICONS['ollama'];
  }

  // Remote model providers
  const providerConfig = REMOTE_MODEL_PROVIDERS[provider as RemoteModelProvider];
  if (providerConfig?.icon) {
    return providerConfig.icon;
  }

  // Fallback to model icon mapping
  const providerLower = provider.toLowerCase();
  for (const [key, iconUrl] of Object.entries(MODEL_ICONS)) {
    if (providerLower.includes(key)) {
      return iconUrl;
    }
  }

  return DEFAULT_ICON;
};

/**
 * Handle image loading errors, set default icon
 * @param e Error event
 */
export const handleModelIconError = (e: React.SyntheticEvent<HTMLImageElement>): void => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = DEFAULT_ICON;
};
