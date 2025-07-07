import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

// Mock Tauri API
const mockTauriApi = {
  invoke: vi.fn(),
  listen: vi.fn(),
  emit: vi.fn(),
  once: vi.fn(),
  path: {
    appDir: vi.fn(() => Promise.resolve('/mock/app')),
    configDir: vi.fn(() => Promise.resolve('/mock/config')),
    dataDir: vi.fn(() => Promise.resolve('/mock/data')),
    logDir: vi.fn(() => Promise.resolve('/mock/logs')),
    tempDir: vi.fn(() => Promise.resolve('/mock/temp')),
  },
  fs: {
    readTextFile: vi.fn(),
    writeTextFile: vi.fn(),
    createDir: vi.fn(),
    exists: vi.fn(),
    removeFile: vi.fn(),
    removeDir: vi.fn(),
  },
  http: {
    fetch: vi.fn(),
  },
  dialog: {
    open: vi.fn(),
    save: vi.fn(),
    message: vi.fn(),
    ask: vi.fn(),
  },
  window: {
    getCurrent: vi.fn(() => ({
      setTitle: vi.fn(),
      minimize: vi.fn(),
      maximize: vi.fn(),
      close: vi.fn(),
      hide: vi.fn(),
      show: vi.fn(),
      center: vi.fn(),
      setSize: vi.fn(),
      setPosition: vi.fn(),
      setResizable: vi.fn(),
      setMaximizable: vi.fn(),
      setMinimizable: vi.fn(),
      setClosable: vi.fn(),
      setDecorations: vi.fn(),
      setAlwaysOnTop: vi.fn(),
      setFullscreen: vi.fn(),
    })),
  },
  event: {
    listen: vi.fn(),
    once: vi.fn(),
    emit: vi.fn(),
  },
  app: {
    getVersion: vi.fn(() => Promise.resolve('1.0.0')),
    getName: vi.fn(() => Promise.resolve('ollama.vip')),
    getTauriVersion: vi.fn(() => Promise.resolve('1.0.0')),
  },
  clipboard: {
    writeText: vi.fn(),
    readText: vi.fn(),
  },
  notification: {
    sendNotification: vi.fn(),
    requestPermission: vi.fn(),
    isPermissionGranted: vi.fn(),
  },
  os: {
    platform: vi.fn(() => Promise.resolve('win32')),
    version: vi.fn(() => Promise.resolve('10.0.0')),
    type: vi.fn(() => Promise.resolve('Windows_NT')),
    arch: vi.fn(() => Promise.resolve('x86_64')),
  },
  shell: {
    open: vi.fn(),
    Command: vi.fn(),
  },
  process: {
    exit: vi.fn(),
    relaunch: vi.fn(),
  },
};

// Mock window.__TAURI_IPC__
Object.defineProperty(window, '__TAURI_IPC__', {
  value: mockTauriApi.invoke,
  writable: true,
});

// Mock @tauri-apps/api modules
vi.mock('@tauri-apps/api/tauri', () => mockTauriApi);
vi.mock('@tauri-apps/api/path', () => mockTauriApi.path);
vi.mock('@tauri-apps/api/fs', () => mockTauriApi.fs);
vi.mock('@tauri-apps/api/http', () => mockTauriApi.http);
vi.mock('@tauri-apps/api/dialog', () => mockTauriApi.dialog);
vi.mock('@tauri-apps/api/window', () => mockTauriApi.window);
vi.mock('@tauri-apps/api/event', () => mockTauriApi.event);
vi.mock('@tauri-apps/api/app', () => mockTauriApi.app);
vi.mock('@tauri-apps/api/clipboard', () => mockTauriApi.clipboard);
vi.mock('@tauri-apps/api/notification', () => mockTauriApi.notification);
vi.mock('@tauri-apps/api/os', () => mockTauriApi.os);
vi.mock('@tauri-apps/api/shell', () => mockTauriApi.shell);
vi.mock('@tauri-apps/api/process', () => mockTauriApi.process);

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock fetch
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console errors and warnings in tests unless explicitly needed
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterEach(() => {
  // Clean up after each test
  cleanup();
  vi.clearAllMocks();
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Add global test utilities
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeInTheDocument(): void;
      toHaveClass(className: string): void;
      toHaveStyle(style: string | Record<string, any>): void;
      toBeVisible(): void;
      toBeDisabled(): void;
      toHaveAttribute(attr: string, value?: string): void;
      toHaveTextContent(text: string | RegExp): void;
      toHaveValue(value: string | number | string[]): void;
      toBeChecked(): void;
      toHaveFocus(): void;
      toBeInvalid(): void;
      toBeValid(): void;
      toHaveAccessibleDescription(description: string | RegExp): void;
      toHaveAccessibleName(name: string | RegExp): void;
      toHaveErrorMessage(message: string | RegExp): void;
    }
  }
}

// Export test utilities
export { mockTauriApi };
export const testUtils = {
  createMockStore: (initialState = {}) => ({
    ...initialState,
    subscribe: vi.fn(),
    getState: vi.fn(() => initialState),
    setState: vi.fn(),
    destroy: vi.fn(),
  }),

  createMockResponse: (data: any, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn(() => Promise.resolve(data)),
    text: vi.fn(() => Promise.resolve(JSON.stringify(data))),
    blob: vi.fn(() => Promise.resolve(new Blob([JSON.stringify(data)]))),
    arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(0))),
    headers: new Headers(),
    redirected: false,
    statusText: 'OK',
    type: 'basic',
    url: '',
    clone: vi.fn(),
    body: null,
    bodyUsed: false,
  }),

  createMockEvent: (type: string, properties = {}) => ({
    type,
    target: { value: '' },
    currentTarget: { value: '' },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...properties,
  }),

  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  mockAnimationFrame: () => {
    let id = 0;
    const callbacks = new Map();

    global.requestAnimationFrame = vi.fn(callback => {
      const currentId = ++id;
      callbacks.set(currentId, callback);
      return currentId;
    });

    global.cancelAnimationFrame = vi.fn(id => {
      callbacks.delete(id);
    });

    return {
      flush: () => {
        callbacks.forEach(callback => callback(performance.now()));
        callbacks.clear();
      },
      clear: () => {
        callbacks.clear();
      },
    };
  },
};
