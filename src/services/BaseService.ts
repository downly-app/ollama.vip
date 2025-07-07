import { ApiError, ApiResponse, ID, Timestamp } from '../types/common';

// Request configuration interface
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheTtl?: number;
}

// Service configuration interface
export interface ServiceConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  headers: Record<string, string>;
  enableCache: boolean;
  cacheTtl: number;
}

// Cache item interface
interface CacheItem {
  data: any;
  timestamp: Timestamp;
  ttl: number;
}

// Request interceptor types
export type RequestInterceptor = (config: RequestConfig) => Promise<RequestConfig> | RequestConfig;
export type ResponseInterceptor = (response: Response) => Promise<Response> | Response;
export type ErrorInterceptor = (error: ApiError) => Promise<ApiError> | ApiError;

// Base service class
export class BaseService {
  private config: ServiceConfig;
  private cache: Map<string, CacheItem> = new Map();
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(config: Partial<ServiceConfig> = {}) {
    this.config = {
      baseUrl: '',
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      enableCache: false,
      cacheTtl: 5 * 60 * 1000, // 5 minutes
      ...config,
    };
  }

  // Set base URL
  setBaseUrl(baseUrl: string): void {
    this.config.baseUrl = baseUrl;
  }

  // Set default headers
  setHeaders(headers: Record<string, string>): void {
    this.config.headers = { ...this.config.headers, ...headers };
  }

  // Add request interceptor
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  // Add response interceptor
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  // Add error interceptor
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  // Generate cache key
  private generateCacheKey(url: string, config: RequestConfig): string {
    const key = `${config.method || 'GET'}_${url}_${JSON.stringify(config.body || {})}`;
    return btoa(key);
  }

  // Check cache
  private checkCache(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  // Set cache
  private setCache(key: string, data: any, ttl: number): void {
    if (this.cache.size >= 100) {
      // Delete oldest cache item
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Apply request interceptors
  private async applyRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let finalConfig = config;

    for (const interceptor of this.requestInterceptors) {
      try {
        finalConfig = await interceptor(finalConfig);
      } catch (error) {
        console.error('Request interceptor error:', error);
      }
    }

    return finalConfig;
  }

  // Apply response interceptors
  private async applyResponseInterceptors(response: Response): Promise<Response> {
    let finalResponse = response;

    for (const interceptor of this.responseInterceptors) {
      try {
        finalResponse = await interceptor(finalResponse);
      } catch (error) {
        console.error('Response interceptor error:', error);
      }
    }

    return finalResponse;
  }

  // Apply error interceptors
  private async applyErrorInterceptors(error: ApiError): Promise<ApiError> {
    let finalError = error;

    for (const interceptor of this.errorInterceptors) {
      try {
        finalError = await interceptor(finalError);
      } catch (interceptorError) {
        console.error('Error interceptor error:', interceptorError);
      }
    }

    return finalError;
  }

  // Delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Execute request
  private async executeRequest(url: string, config: RequestConfig): Promise<Response> {
    const finalConfig = await this.applyRequestInterceptors(config);

    const requestInit: RequestInit = {
      method: finalConfig.method || 'GET',
      headers: {
        ...this.config.headers,
        ...finalConfig.headers,
      },
      body: finalConfig.body ? JSON.stringify(finalConfig.body) : undefined,
      signal: AbortSignal.timeout(finalConfig.timeout || this.config.timeout),
    };

    const response = await fetch(url, requestInit);
    return await this.applyResponseInterceptors(response);
  }

  // Request with retry
  private async requestWithRetry(url: string, config: RequestConfig): Promise<Response> {
    const maxAttempts = config.retryAttempts ?? this.config.retryAttempts;
    const delay = config.retryDelay ?? this.config.retryDelay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.executeRequest(url, config);
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }

        console.warn(`Request attempt ${attempt} failed, retrying in ${delay}ms...`);
        await this.delay(delay * attempt); // Exponential backoff
      }
    }

    throw new Error('Max retry attempts exceeded');
  }

  // Handle response
  private async handleResponse<T = any>(response: Response): Promise<ApiResponse<T>> {
    let data: any;

    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch (error) {
      data = null;
    }

    const apiResponse: ApiResponse<T> = {
      data,
      success: response.ok,
      message: response.statusText,
      timestamp: Date.now(),
      statusCode: response.status,
    };

    if (!response.ok) {
      const apiError: ApiError = {
        code: response.status.toString(),
        message: data?.message || response.statusText,
        details: data,
        timestamp: Date.now(),
        statusCode: response.status,
      };

      throw await this.applyErrorInterceptors(apiError);
    }

    return apiResponse;
  }

  // Core request method
  async request<T = any>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.config.baseUrl}${endpoint}`;

    // Check cache
    if (config.cache ?? this.config.enableCache) {
      const cacheKey = this.generateCacheKey(url, config);
      const cachedData = this.checkCache(cacheKey);

      if (cachedData) {
        return {
          data: cachedData,
          success: true,
          message: 'From cache',
          timestamp: Date.now(),
          statusCode: 200,
        };
      }
    }

    try {
      const response = await this.requestWithRetry(url, config);
      const apiResponse = await this.handleResponse<T>(response);

      // Cache successful response
      if (config.cache ?? this.config.enableCache) {
        const cacheKey = this.generateCacheKey(url, config);
        const cacheTtl = config.cacheTtl ?? this.config.cacheTtl;
        this.setCache(cacheKey, apiResponse.data, cacheTtl);
      }

      return apiResponse;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
        throw error;
      }

      // Convert to ApiError
      const apiError: ApiError = {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
        timestamp: Date.now(),
        statusCode: 0,
      };

      throw await this.applyErrorInterceptors(apiError);
    }
  }

  // GET请求
  async get<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    config: Omit<RequestConfig, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    const url = params ? `${endpoint}?${new URLSearchParams(params).toString()}` : endpoint;

    return this.request<T>(url, {
      ...config,
      method: 'GET',
    });
  }

  // POST请求
  async post<T = any>(
    endpoint: string,
    data?: any,
    config: Omit<RequestConfig, 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data,
    });
  }

  // PUT请求
  async put<T = any>(
    endpoint: string,
    data?: any,
    config: Omit<RequestConfig, 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data,
    });
  }

  // DELETE请求
  async delete<T = any>(
    endpoint: string,
    config: Omit<RequestConfig, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'DELETE',
    });
  }

  // PATCH请求
  async patch<T = any>(
    endpoint: string,
    data?: any,
    config: Omit<RequestConfig, 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data,
    });
  }

  // Batch requests
  async batchRequest<T = any>(
    requests: Array<{
      endpoint: string;
      config?: RequestConfig;
      key?: string;
    }>
  ): Promise<Record<string, ApiResponse<T>>> {
    const promises = requests.map(async (req, index) => {
      const key = req.key || `request_${index}`;
      try {
        const response = await this.request<T>(req.endpoint, req.config);
        return { key, response };
      } catch (error) {
        return { key, error };
      }
    });

    const results = await Promise.allSettled(promises);
    const finalResults: Record<string, ApiResponse<T>> = {};

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { key, response, error } = result.value;
        if (response) {
          finalResults[key] = response;
        } else if (error) {
          finalResults[key] = {
            data: null,
            success: false,
            message: error.message,
            timestamp: Date.now(),
            statusCode: error.statusCode || 500,
          };
        }
      }
    });

    return finalResults;
  }

  // Upload file
  async uploadFile<T = any>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    config: Omit<RequestConfig, 'method' | 'body'> = {},
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const finalConfig = await this.applyRequestInterceptors({
      ...config,
      method: 'POST',
      body: formData,
    });

    const url = endpoint.startsWith('http') ? endpoint : `${this.config.baseUrl}${endpoint}`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = event => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      };

      xhr.onload = async () => {
        try {
          const response = new Response(xhr.response, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: new Headers(
              xhr
                .getAllResponseHeaders()
                .split('\r\n')
                .reduce(
                  (acc, line) => {
                    const [key, value] = line.split(': ');
                    if (key && value) acc[key] = value;
                    return acc;
                  },
                  {} as Record<string, string>
                )
            ),
          });

          const apiResponse = await this.handleResponse<T>(response);
          resolve(apiResponse);
        } catch (error) {
          reject(error);
        }
      };

      xhr.onerror = () => {
        reject(new Error('Upload failed'));
      };

      xhr.open('POST', url);

      // Set headers (exclude Content-Type, let browser set automatically)
      Object.entries({
        ...this.config.headers,
        ...finalConfig.headers,
      }).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          xhr.setRequestHeader(key, value);
        }
      });

      xhr.send(formData);
    });
  }

  // Health check
  async healthCheck(endpoint: string = '/health'): Promise<boolean> {
    try {
      const response = await this.get(endpoint, undefined, {
        timeout: 5000,
        retryAttempts: 1,
        cache: false,
      });
      return response.success;
    } catch (error) {
      return false;
    }
  }

  // Get service configuration
  getConfig(): ServiceConfig {
    return { ...this.config };
  }

  // Get cache statistics
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      maxSize: 100,
      hitRate: 0, // Simplified statistics
    };
  }
}

// Create default service instance
export const defaultService = new BaseService();

// Service factory
export const createService = (config: Partial<ServiceConfig> = {}): BaseService => {
  return new BaseService(config);
};
