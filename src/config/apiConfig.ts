/**
 * API configuration file
 * Unified management of all API addresses
 */

export const API_CONFIG = {
  // Ollama Pro API base address
  OLLAMA_PRO_BASE_URL: 'https://api.ollama.vip/api',
  
  // Specific API endpoints
  ENDPOINTS: {
    MODELS: '/models',
    MODEL_DETAIL: '/models',
  }
} as const;

/**
 * Get model list API address
 */
export const getModelsApiUrl = (): string => {
  return `${API_CONFIG.OLLAMA_PRO_BASE_URL}${API_CONFIG.ENDPOINTS.MODELS}`;
};

/**
 * Get model details API address
 * @param modelName Model name
 */
export const getModelDetailApiUrl = (modelName: string): string => {
  return `${API_CONFIG.OLLAMA_PRO_BASE_URL}${API_CONFIG.ENDPOINTS.MODEL_DETAIL}/${modelName}`;
};