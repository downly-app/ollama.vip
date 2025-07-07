import { create } from 'zustand';

import { configApi } from '@/services/configApi';
import SystemApi from '@/services/systemApi';
import { SystemInfo } from '@/types/system';

interface SystemResourceData {
  name: string;
  usage: number;
  color: string;
  icon?: any;
  details?: string;
  temperature?: number;
  data?: Array<{ time: string; value: number }>;
}

interface SystemResourceState {
  systemInfo: SystemInfo | null;
  resources: SystemResourceData[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface SystemResourceActions {
  fetchSystemResources: () => Promise<void>;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
  reset: () => void;
}

type SystemResourceStore = SystemResourceState & SystemResourceActions;

let refreshInterval: NodeJS.Timeout | null = null;
const REFRESH_INTERVAL = 5000; // 5 seconds - unified refresh interval

// Generate historical data (mock)
const generateHistoricalData = (currentUsage: number) => {
  const data = [];
  const now = new Date();

  for (let i = 19; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 15000); // One data point every 15 seconds
    const variation = (Math.random() - 0.5) * 20; // ±10% variation
    const value = Math.max(0, Math.min(100, currentUsage + variation));

    data.push({
      time: time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      value: Math.round(value),
    });
  }

  return data;
};

export const useSystemResourceStore = create<SystemResourceStore>((set, get) => ({
  // Initial state
  systemInfo: null,
  resources: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  // Actions
  fetchSystemResources: async () => {
    try {
      set({ isLoading: true, error: null });

      // Get Ollama storage path first
      let storagePath: string;
      try {
        storagePath = await configApi.getOllamaModelsPath();
      } catch (error) {
        // Failed to get Ollama storage path, using default
        storagePath = '~/.ollama'; // Fallback to default
      }

      // Get system resources for the specific storage path
      const info = await SystemApi.getSystemResourcesForPath(storagePath);

      // Convert to component required format
      const resourcesData: SystemResourceData[] = [
        {
          name: 'CPU',
          usage: info.cpu.usage,
          color: '#3b82f6',
          details: `${info.cpu.model} • ${info.cpu.cores} cores • ${(info.cpu.frequency / 1000).toFixed(1)}GHz`,
          temperature: info.cpu.temperature,
          data: generateHistoricalData(info.cpu.usage),
        },
        {
          name: 'Memory',
          usage: info.memory.usage_percent,
          color: '#10b981',
          details: `${SystemApi.formatMemoryFromGB(info.memory.used_gb)} / ${SystemApi.formatMemoryFromGB(info.memory.total_gb)}`,
          data: generateHistoricalData(info.memory.usage_percent),
        },
        {
          name: 'Disk',
          usage: info.disks.length > 0 ? info.disks[0].usage_percent : 0,
          color: '#f59e0b',
          details:
            info.disks.length > 0
              ? `${info.disks[0].used_gb.toFixed(1)}GB / ${info.disks[0].total_gb.toFixed(1)}GB • ${info.disks[0].mount_point} • Storage: ${storagePath}`
              : `Storage: ${storagePath} • N/A`,
          data: generateHistoricalData(info.disks.length > 0 ? info.disks[0].usage_percent : 0),
        },
      ];

      // If GPU information is available, add GPU resources
      if (info.gpus.length > 0) {
        const gpu = info.gpus[0];
        // For AMD cards or other GPUs that cannot get usage rate, use memory usage rate as indicator
        let gpuUsage = gpu.core_usage_percent;
        let gpuDetails = '';

        if (gpu.core_usage_percent > 0) {
          // NVIDIA or other GPUs that support usage rate
          gpuDetails = `${gpu.name} • GPU: ${gpu.core_usage_percent.toFixed(1)}% • ${SystemApi.formatGpuMemoryFromMB(gpu.memory_used_mb)} / ${SystemApi.formatGpuMemoryFromMB(gpu.memory_total_mb)}`;
        } else if (gpu.memory_usage_percent > 0) {
          // Use memory usage rate as indicator
          gpuUsage = gpu.memory_usage_percent;
          gpuDetails = `${gpu.name} • VRAM: ${gpu.memory_usage_percent.toFixed(1)}% • ${SystemApi.formatGpuMemoryFromMB(gpu.memory_used_mb)} / ${SystemApi.formatGpuMemoryFromMB(gpu.memory_total_mb)}`;
        } else {
          // No usage rate data, only display memory information
          gpuUsage = 0;
          gpuDetails = `${gpu.name} • ${SystemApi.formatGpuMemoryFromMB(gpu.memory_total_mb)} VRAM • Usage unavailable`;
        }

        resourcesData.push({
          name: 'GPU',
          usage: gpuUsage,
          color: '#8b5cf6', // Purple, to distinguish from other resources
          details: gpuDetails,
          temperature: gpu.temperature,
          data: generateHistoricalData(gpuUsage),
        });
      }

      set({
        systemInfo: info,
        resources: resourcesData,
        isLoading: false,
        lastUpdated: new Date(),
      });
    } catch (err) {
      // Failed to fetch system resources
      const errorMessage = 'Failed to fetch system resources';

      // Use fallback data
      const fallbackResources: SystemResourceData[] = [
        {
          name: 'CPU',
          usage: 0,
          color: '#3b82f6',
          details: 'Unavailable',
          data: generateHistoricalData(0),
        },
        {
          name: 'Memory',
          usage: 0,
          color: '#10b981',
          details: 'Unavailable',
          data: generateHistoricalData(0),
        },
        {
          name: 'Disk',
          usage: 0,
          color: '#f59e0b',
          details: 'Unavailable',
          data: generateHistoricalData(0),
        },
      ];

      set({
        error: errorMessage,
        resources: fallbackResources,
        isLoading: false,
      });
    }
  },

  startAutoRefresh: () => {
    const { fetchSystemResources } = get();

    // Clear existing interval
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }

    // Initial fetch
    fetchSystemResources();

    // Set up interval
    refreshInterval = setInterval(() => {
      fetchSystemResources();
    }, REFRESH_INTERVAL);
  },

  stopAutoRefresh: () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  },

  reset: () => {
    const { stopAutoRefresh } = get();
    stopAutoRefresh();
    set({
      systemInfo: null,
      resources: [],
      isLoading: false,
      error: null,
      lastUpdated: null,
    });
  },
}));

// Export refresh interval constant for reference
export { REFRESH_INTERVAL };
