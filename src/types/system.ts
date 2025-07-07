export interface CpuInfo {
  model: string;
  usage: number;
  cores: number;
  frequency: number;
  temperature?: number;
}

export interface MemoryInfo {
  total_gb: number;
  used_gb: number;
  available_gb: number;
  usage_percent: number;
}

export interface DiskInfo {
  mount_point: string;
  disk_type: string;
  total_gb: number;
  used_gb: number;
  usage_percent: number;
}

export interface GpuInfo {
  name: string;
  vendor: string;
  memory_total_mb: number;
  memory_used_mb: number;
  memory_usage_percent: number;
  core_usage_percent: number;
  temperature?: number;
}

export interface SystemInfo {
  cpu: CpuInfo;
  memory: MemoryInfo;
  disks: DiskInfo[];
  gpus: GpuInfo[];
}

export interface SystemResourceData {
  name: string;
  usage: number;
  color: string;
  icon: React.ComponentType | string;
  details: string;
  temperature?: number;
  data: Array<{ time: string; value: number }>;
}
