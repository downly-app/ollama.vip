/**
 * Test utility script for API configuration functionality
 */

import { modelService } from '@/services/modelService';
import { RemoteModelProvider, REMOTE_MODEL_PROVIDERS } from '@/types/ai';

export const testApiConfig = () => {
    console.log('=== API Configuration Test Started ===');

    // Test DeepSeek configuration
    const testProvider: RemoteModelProvider = 'deepseek';
    const testConfig = {
        apiKey: 'test-api-key-123',
        baseURL: 'https://api.deepseek.com'
    };

    console.log('1. Saving test configuration...');
    modelService.setRemoteApiConfig(testProvider, testConfig);

    console.log('2. Reading configuration...');
    const savedConfig = modelService.getRemoteApiConfig(testProvider);
    console.log('Saved configuration:', savedConfig);

    console.log('3. Checking configuration status...');
    const isConfigured = modelService.hasRemoteApiConfigured(testProvider);
    console.log('Configuration status:', isConfigured);

    console.log('4. Checking localStorage...');
    const storageKey = `api-config-${testProvider}`;
    const rawStorage = localStorage.getItem(storageKey);
    console.log(`localStorage[${storageKey}]:`, rawStorage);

    console.log('=== API Configuration Test Ended ===');

    return {
        savedConfig,
        isConfigured,
        rawStorage
    };
};

export const clearOldConfigs = () => {
    console.log('=== Cleaning Old Configurations Started ===');

    // Clean possible old configuration formats
    const oldConfigKeys = ['ai-config', 'api-config'];
    oldConfigKeys.forEach(key => {
        if (localStorage.getItem(key)) {
            console.log(`Cleaning old configuration: ${key}`);
            localStorage.removeItem(key);
        }
    });

    // Clean all provider configurations
    Object.keys(REMOTE_MODEL_PROVIDERS).forEach(provider => {
        const key = `api-config-${provider}`;
        if (localStorage.getItem(key)) {
            console.log(`Cleaning provider configuration: ${key}`);
            localStorage.removeItem(key);
        }
    });

    console.log('=== Cleaning Old Configurations Ended ===');
};

export const listAllConfigs = () => {
    console.log('=== List All Configurations ===');

    // Check all related localStorage items
    const allKeys = Object.keys(localStorage);
    const configKeys = allKeys.filter(key =>
        key.includes('api-config') || key.includes('ai-config')
    );

    configKeys.forEach(key => {
        const value = localStorage.getItem(key);
        console.log(`${key}:`, value);
    });

    // Check configuration status for each provider
    Object.keys(REMOTE_MODEL_PROVIDERS).forEach(provider => {
        const isConfigured = modelService.hasRemoteApiConfigured(provider as RemoteModelProvider);
        console.log(`${provider} configuration status:`, isConfigured);
    });

    console.log('=== Configuration List Ended ===');
};

/**
 * Test if API calls correctly add Authorization headers
 */
function testApiCall() {
    console.log('=== Testing API Calls ===');

    // Import necessary modules
    import('../services/aiApi').then(({ aiApiService }) => {
        import('../types/ai').then(({ REMOTE_MODEL_PROVIDERS }) => {
            // Test DeepSeek API call
            const testConfig = {
                provider: 'deepseek' as const,
                apiKey: '', // This will be ignored, using new configuration system
                model: 'deepseek-chat',
                temperature: 0.7
            };

            const testMessages = [
                {
                    id: '1',
                    content: 'Hello, this is a test message',
                    sender: 'user' as const,
                    timestamp: new Date()
                }
            ];

            console.log('Test configuration:', testConfig);
            console.log('Test messages:', testMessages);

            // We don't actually send requests here, but check configuration
            const apiConfig = modelService.getRemoteApiConfig('deepseek');
            console.log('DeepSeek API configuration:', apiConfig);

            if (apiConfig?.apiKey) {
                console.log('✅ DeepSeek API Key configured');
                console.log('API Key prefix:', apiConfig.apiKey.substring(0, 10) + '...');
                console.log('Base URL:', apiConfig.baseURL);
            } else {
                console.log('❌ DeepSeek API Key not configured');
            }
        });
    });
}

/**
 * Intercept network requests to verify Authorization headers
 */
function interceptNetworkRequests() {
    console.log('=== Starting Network Request Interception ===');

    // Save original fetch function
    const originalFetch = window.fetch;

    // Create interceptor
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
        const url = typeof input === 'string' ? input : input.toString();

        // Only intercept AI API requests
        if (url.includes('api.deepseek.com') ||
            url.includes('api.openai.com') ||
            url.includes('api.anthropic.com') ||
            url.includes('generativelanguage.googleapis.com')) {

            console.log('🔍 Intercepted AI API request:', url);
            console.log('📋 Request headers:', init?.headers);

            // Check Authorization header
            const headers = init?.headers as Record<string, string> || {};
            if (headers['Authorization']) {
                console.log('✅ Found Authorization header:', headers['Authorization'].substring(0, 20) + '...');
            } else if (headers['x-api-key']) {
                console.log('✅ Found x-api-key header:', headers['x-api-key'].substring(0, 20) + '...');
            } else if (headers['x-goog-api-key']) {
                console.log('✅ Found x-goog-api-key header:', headers['x-goog-api-key'].substring(0, 20) + '...');
            } else {
                console.log('❌ No authentication header found!');
            }

            console.log('📝 Complete request headers:', headers);
        }

        // Call original fetch
        return originalFetch.call(this, input, init);
    };

    console.log('✅ Network request interceptor started');
    console.log('💡 You can now try sending AI messages, all API requests will be logged');

    // Return restore function
    return function restoreOriginalFetch() {
        window.fetch = originalFetch;
        console.log('🔄 Network request interceptor closed');
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