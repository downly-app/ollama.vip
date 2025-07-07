// Simple test file for optimization tools
import { createService } from '../services/BaseService';
import { createAsyncState } from '../types/common';
import { addBreadcrumb, defaultErrorHandler } from './errorHandler';

// Test error handling
export const testErrorHandler = () => {
  console.log('🧪 Testing Error Handler...');

  // Add breadcrumb
  addBreadcrumb('Testing started', 'test');

  // Create test error
  const testError = new Error('Test error message');
  const enhancedError = defaultErrorHandler.createEnhancedError(testError, {
    code: 'TEST_ERROR',
    details: { testData: 'test' },
  });

  console.log('Enhanced error:', enhancedError);

  // Test error statistics
  const stats = defaultErrorHandler.getErrorStats();
  console.log('Error stats:', stats);

  console.log('✅ Error Handler test completed');
};

// Test base service
export const testBaseService = async () => {
  console.log('🧪 Testing Base Service...');

  const service = createService({
    baseUrl: 'https://jsonplaceholder.typicode.com',
    enableCache: true,
    timeout: 5000,
  });

  try {
    // Test GET request
    const response = await service.get('/posts/1');
    console.log('GET response:', response);

    // Test cache
    const cachedResponse = await service.get('/posts/1');
    console.log('Cached response:', cachedResponse);

    // Test health check
    const healthStatus = await service.healthCheck('/posts/1');
    console.log('Health check:', healthStatus);

    console.log('✅ Base Service test completed');
  } catch (error) {
    console.error('❌ Base Service test failed:', error);
  }
};

// Test async state
export const testAsyncState = () => {
  console.log('🧪 Testing Async State...');

  const state = createAsyncState<string>();
  console.log('Initial state:', state);

  // Simulate state changes
  const loadingState = {
    ...state,
    loading: true,
    lastUpdated: Date.now(),
  };
  console.log('Loading state:', loadingState);

  const successState = {
    ...loadingState,
    loading: false,
    data: 'Test data',
    success: true,
    error: null,
  };
  console.log('Success state:', successState);

  console.log('✅ Async State test completed');
};

// Test performance monitoring
export const testPerformanceMonitoring = () => {
  console.log('🧪 Testing Performance Monitoring...');

  // Simulate performance data
  const performanceData = {
    renderTime: 16.5,
    mountTime: 150,
    renderCount: 3,
    lastRenderTime: Date.now(),
    averageRenderTime: 18.2,
  };

  console.log('Performance data:', performanceData);

  // Check render time
  if (performanceData.renderTime > 16) {
    console.warn('⚠️ Slow render detected:', performanceData.renderTime);
  } else {
    console.log('✅ Render performance is good');
  }

  console.log('✅ Performance Monitoring test completed');
};

// Run all tests
export const runAllTests = async () => {
  console.log('🚀 Starting optimization tools tests...');

  testErrorHandler();
  testAsyncState();
  testPerformanceMonitoring();
  await testBaseService();

  console.log('🎉 All tests completed!');
};

// Auto run tests in development environment
if (process.env.NODE_ENV === 'development') {
  // Delay test execution to avoid blocking app startup
  setTimeout(() => {
    runAllTests();
  }, 2000);
}
