/**
 * Test utility script for API configuration functionality
 */
import { modelService } from '@/services/modelService';
import { REMOTE_MODEL_PROVIDERS, RemoteModelProvider } from '@/types/ai';

export const testApiConfig = () => {
  // API Configuration Test Started

  // Test DeepSeek configuration
  const testProvider: RemoteModelProvider = 'deepseek';
  const testConfig = {
    apiKey: 'test-api-key-123',
    baseURL: 'https://api.deepseek.com',
  };

  // Saving test configuration
  modelService.setRemoteApiConfig(testProvider, testConfig);

  // Reading configuration
  const savedConfig = modelService.getRemoteApiConfig(testProvider);
  // Configuration read

  // Checking configuration status
  const isConfigured = modelService.hasRemoteApiConfigured(testProvider);
  // Configuration status checked

  // Checking localStorage
  const storageKey = `api-config-${testProvider}`;
  const rawStorage = localStorage.getItem(storageKey);
  // localStorage checked

  // API Configuration Test Ended

  return {
    savedConfig,
    isConfigured,
    rawStorage,
  };
};

export const clearOldConfigs = () => {
  // Cleaning Old Configurations Started

  // Clean possible old configuration formats
  const oldConfigKeys = ['ai-config', 'api-config'];
  oldConfigKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      // Cleaning old configuration
      localStorage.removeItem(key);
    }
  });

  // Clean all provider configurations
  Object.keys(REMOTE_MODEL_PROVIDERS).forEach(provider => {
    const key = `api-config-${provider}`;
    if (localStorage.getItem(key)) {
      // Cleaning provider configuration
      localStorage.removeItem(key);
    }
  });

  // Cleaning Old Configurations Ended
};

export const listAllConfigs = () => {
  // List All Configurations

  // Check all related localStorage items
  const allKeys = Object.keys(localStorage);
  const configKeys = allKeys.filter(key => key.includes('api-config') || key.includes('ai-config'));

  configKeys.forEach(key => {
    const value = localStorage.getItem(key);
    // Configuration found
  });

  // Check configuration status for each provider
  Object.keys(REMOTE_MODEL_PROVIDERS).forEach(provider => {
    const isConfigured = modelService.hasRemoteApiConfigured(provider as RemoteModelProvider);
    // Provider configuration status checked
  });

  // Configuration List Ended
};

/**
 * Test if API calls correctly add Authorization headers
 */
function testApiCall() {
  // === Testing API Calls ===

  // Import necessary modules
  import('../services/aiApi').then(({ aiApiService }) => {
    import('../types/ai').then(({ REMOTE_MODEL_PROVIDERS }) => {
      // Test DeepSeek API call
      const testConfig = {
        provider: 'deepseek' as const,
        apiKey: '', // This will be ignored, using new configuration system
        model: 'deepseek-chat',
        temperature: 0.7,
      };

      const testMessages = [
        {
          id: '1',
          content: 'Hello, this is a test message',
          sender: 'user' as const,
          timestamp: new Date(),
        },
      ];

      // Test configuration
      // Test messages

      // We don't actually send requests here, but check configuration
      const apiConfig = modelService.getRemoteApiConfig('deepseek');
      // DeepSeek API configuration

      if (apiConfig?.apiKey) {
        // ✅ DeepSeek API Key configured
        // API Key prefix
        // Base URL
      } else {
        // ❌ DeepSeek API Key not configured
      }
    });
  });
}

/**
 * Intercept network requests to verify Authorization headers
 */
function interceptNetworkRequests() {
  // === Starting Network Request Interception ===

  // Save original fetch function
  const originalFetch = window.fetch;

  // Create interceptor
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input.toString();

    // Only intercept AI API requests
    if (
      url.includes('api.deepseek.com') ||
      url.includes('api.openai.com') ||
      url.includes('api.anthropic.com') ||
      url.includes('generativelanguage.googleapis.com')
    ) {
      // 🔍 Intercepted AI API request
      // 📋 Request headers

      // Check Authorization header
      const headers = (init?.headers as Record<string, string>) || {};
      if (headers['Authorization']) {
        // ✅ Found Authorization header
      } else if (headers['x-api-key']) {
        // ✅ Found x-api-key header
      } else if (headers['x-goog-api-key']) {
        // ✅ Found x-goog-api-key header
      } else {
        // ❌ No authentication header found!
      }

      // 📝 Complete request headers
    }

    // Call original fetch
    return originalFetch.call(this, input, init);
  };

  // ✅ Network request interceptor started
  // 💡 You can now try sending AI messages, all API requests will be logged

  // Return restore function
  return function restoreOriginalFetch() {
    window.fetch = originalFetch;
    // 🔄 Network request interceptor closed
  };
}

// Add to global object
declare global {
  interface Window {
    testApiConfig: () => void;
    listAllConfigs: () => void;
    clearOldConfigs: () => void;
    testApiCall: () => void;
    interceptNetworkRequests: () => () => void;
  }
}

// Export test functions to global
if (typeof window !== 'undefined') {
  window.testApiConfig = testApiConfig;
  window.listAllConfigs = listAllConfigs;
  window.clearOldConfigs = clearOldConfigs;
  window.testApiCall = testApiCall;
  window.interceptNetworkRequests = interceptNetworkRequests;
}
