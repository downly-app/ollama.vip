use anyhow::Result;
#[cfg(all(feature = "gpu-monitoring", not(target_os = "macos")))]
use gfxinfo::active_gpu;
#[cfg(all(feature = "gpu-monitoring", not(target_os = "macos")))]
use nvml_wrapper::Nvml;
use serde::Serialize;

#[cfg(target_os = "linux")]
use std::{fs, path::Path};

// Conditional compilation for GPU monitoring features
#[cfg(not(feature = "gpu-monitoring"))]
mod gpu_fallback {
    use super::GpuInfo;
    
    pub fn get_gpu_info() -> Vec<GpuInfo> {
        vec![GpuInfo {
            name: "GPU monitoring disabled".to_string(),
            vendor: "N/A".to_string(),
            memory_total_mb: 0,
            memory_used_mb: 0,
            memory_usage_percent: 0.0,
            core_usage_percent: 0.0,
            temperature: None,
        }]
    }
}
use sysinfo::{CpuExt, CpuRefreshKind, DiskExt, RefreshKind, System, SystemExt};
use std::time::Duration;
use std::path::Path;

#[derive(Serialize)]
pub struct CpuInfo {
    pub model: String,
    pub usage: f32,
    pub cores: usize,
    pub frequency: u64,
    pub temperature: Option<f32>,
}

#[derive(Serialize)]
pub struct MemoryInfo {
    pub total_gb: f64,
    pub used_gb: f64,
    pub available_gb: f64,
    pub usage_percent: f64,
}

#[derive(Serialize)]
pub struct DiskInfo {
    pub mount_point: String,
    pub disk_type: String,
    pub total_gb: f64,
    pub used_gb: f64,
    pub usage_percent: f64,
}

#[derive(Serialize)]
pub struct GpuInfo {
    pub name: String,
    pub vendor: String,
    pub memory_total_mb: u64,
    pub memory_used_mb: u64,
    pub memory_usage_percent: f64,
    pub core_usage_percent: f64,
    pub temperature: Option<f32>,
}

#[derive(Serialize)]
pub struct SystemInfo {
    pub cpu: CpuInfo,
    pub memory: MemoryInfo,
    pub disks: Vec<DiskInfo>,
    pub gpus: Vec<GpuInfo>,
}

pub struct SystemMonitor {
    system: System,
}

impl SystemMonitor {
    pub fn new() -> Self {
        let system = System::new_with_specifics(
            RefreshKind::new()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory()
                .with_disks_list(),
        );
        
        Self { system }
    }

    pub fn refresh(&mut self) {
        self.system.refresh_all();
        // Wait for a while to stabilize CPU usage
        std::thread::sleep(Duration::from_millis(100));
        self.system.refresh_cpu();
    }

    pub fn get_system_info(&self) -> SystemInfo {
        SystemInfo {
            cpu: self.get_cpu_info(),
            memory: self.get_memory_info(),
            disks: self.get_disk_info(),
            gpus: get_gpu_info(),
        }
    }

    pub fn get_system_info_for_path(&self, storage_path: &str) -> SystemInfo {
        SystemInfo {
            cpu: self.get_cpu_info(),
            memory: self.get_memory_info(),
            disks: self.get_disk_info_for_path(storage_path),
            gpus: get_gpu_info(),
        }
    }

    fn get_cpu_info(&self) -> CpuInfo {
        let model = self.system
            .cpus()
            .first()
            .map(|c| c.brand().to_string())
            .unwrap_or_else(|| "Unknown".into());
        let usage = self.system.global_cpu_info().cpu_usage();
        let cores = self.system.cpus().len();
        let freq = self.system.cpus().first().map(|c| c.frequency()).unwrap_or(0);
        
        // Try to get CPU temperature
        let temperature = self.system.cpus().first()
            .and_then(|_cpu| {
                // sysinfo 0.29 version may not support temperature, return None here
                None
            });

        CpuInfo {
            model,
            usage,
            cores,
            frequency: freq,
            temperature,
        }
    }

    fn get_memory_info(&self) -> MemoryInfo {
        let total = self.system.total_memory() as f64 / 1_073_741_824.0;
        let used = self.system.used_memory() as f64 / 1_073_741_824.0;
        let avail = total - used;
        let pct = if total > 0.0 { used / total * 100.0 } else { 0.0 };
        
        MemoryInfo {
            total_gb: total,
            used_gb: used,
            available_gb: avail,
            usage_percent: pct,
        }
    }

    fn get_disk_info(&self) -> Vec<DiskInfo> {
        self.system
            .disks()
            .iter()
            .map(|d| {
                let total = d.total_space() as f64 / 1_073_741_824.0;
                let avail = d.available_space() as f64 / 1_073_741_824.0;
                let used = total - avail;
                let pct = if total > 0.0 { used / total * 100.0 } else { 0.0 };
                
                DiskInfo {
                    mount_point: d.mount_point().to_string_lossy().into(),
                    disk_type: format!("{:?}", d.kind()),
                    total_gb: total,
                    used_gb: used,
                    usage_percent: pct,
                }
            })
            .collect()
    }

    fn get_disk_info_for_path(&self, path: &str) -> Vec<DiskInfo> {
        // Normalize the path and find the disk that contains this path
        let target_path = Path::new(path);
        
        // Find the disk with the longest matching mount point
        let mut best_match: Option<&sysinfo::Disk> = None;
        let mut best_match_len = 0;
        
        for disk in self.system.disks() {
            let mount_point = disk.mount_point();
            
            // Check if the target path starts with this mount point
            if target_path.starts_with(mount_point) {
                let mount_point_len = mount_point.to_string_lossy().len();
                if mount_point_len > best_match_len {
                    best_match = Some(disk);
                    best_match_len = mount_point_len;
                }
            }
        }
        
        // If we found a matching disk, return its info
        if let Some(disk) = best_match {
            let total = disk.total_space() as f64 / 1_073_741_824.0;
            let avail = disk.available_space() as f64 / 1_073_741_824.0;
            let used = total - avail;
            let pct = if total > 0.0 { used / total * 100.0 } else { 0.0 };
            
            vec![DiskInfo {
                mount_point: disk.mount_point().to_string_lossy().into(),
                disk_type: format!("{:?}", disk.kind()),
                total_gb: total,
                used_gb: used,
                usage_percent: pct,
            }]
        } else {
            // Fallback: return the first disk or empty if no disks
            if let Some(disk) = self.system.disks().first() {
                let total = disk.total_space() as f64 / 1_073_741_824.0;
                let avail = disk.available_space() as f64 / 1_073_741_824.0;
                let used = total - avail;
                let pct = if total > 0.0 { used / total * 100.0 } else { 0.0 };
                
                vec![DiskInfo {
                    mount_point: disk.mount_point().to_string_lossy().into(),
                    disk_type: format!("{:?}", disk.kind()),
                    total_gb: total,
                    used_gb: used,
                    usage_percent: pct,
                }]
            } else {
                vec![]
            }
        }
    }
}

#[cfg(target_os = "linux")]
fn read_amd_vram_sysfs(card: usize) -> Option<(u64, u64)> {
    let base = format!("/sys/class/drm/card{}/device/", card);
    let total = fs::read_to_string(Path::new(&base).join("mem_info_vram_total")).ok()?;
    let used = fs::read_to_string(Path::new(&base).join("mem_info_vram_used")).ok()?;
    let total_mb = total.trim().parse::<u64>().ok()? / 1024;
    let used_mb = used.trim().parse::<u64>().ok()? / 1024;
    Some((total_mb, used_mb))
}

#[cfg(target_os = "linux")]
fn read_amd_gpu_usage(card: usize) -> Option<f64> {
    let path = format!("/sys/class/drm/card{}/device/gpu_busy_percent", card);
    let usage_str = fs::read_to_string(path).ok()?;
    usage_str.trim().parse::<f64>().ok()
}

#[cfg(feature = "gpu-monitoring")]
fn get_gpu_info() -> Vec<GpuInfo> {
    let mut out = Vec::new();

    // Use system commands to get GPU information on MacOS, avoiding potential issues with gfxinfo library
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        
        // Try to use system_profiler to get GPU information
        if let Ok(output) = Command::new("system_profiler")
            .arg("SPDisplaysDataType")
            .arg("-json")
            .output()
        {
            if let Ok(json_str) = String::from_utf8(output.stdout) {
                // Simple JSON parsing to extract GPU information
                if json_str.contains("Chipset Model") {
                    // Further JSON parsing can be done here, but for safety we provide basic information
                    out.push(GpuInfo {
                        name: "Apple GPU".into(),
                        vendor: "Apple".into(),
                        memory_total_mb: 0, // On MacOS, GPU memory is usually shared
                        memory_used_mb: 0,
                        memory_usage_percent: 0.0,
                        core_usage_percent: 0.0,
                        temperature: None,
                    });
                    return out;
                }
            }
        }
        
        // If system command fails, return default Apple GPU information
        out.push(GpuInfo {
            name: "Apple GPU".into(),
            vendor: "Apple".into(),
            memory_total_mb: 0,
            memory_used_mb: 0,
            memory_usage_percent: 0.0,
            core_usage_percent: 0.0,
            temperature: None,
        });
    }

    // For non-MacOS systems, use gfxinfo library (only when gpu-monitoring feature is enabled)
    #[cfg(all(feature = "gpu-monitoring", not(target_os = "macos")))]
    {
        // Use try-catch to avoid crashes
        let gpu_result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            active_gpu()
        }));

        if let Ok(Ok(gpu)) = gpu_result {
            let vendor = gpu.vendor().to_lowercase();
            let model = gpu.model().to_string();

            if vendor.contains("nvidia") {
                if let Ok(nvml) = Nvml::init() {
                    if let Ok(device) = nvml.device_by_index(0) {
                        let mem = device.memory_info().ok();
                        let util = device.utilization_rates().ok();
                        let temp = device.temperature(nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu).ok();

                        if let (Some(mem), Some(util)) = (mem, util) {
                            let total = mem.total / 1024 / 1024;
                            let used = mem.used / 1024 / 1024;
                            let mem_pct = if total > 0 { used as f64 / total as f64 * 100.0 } else { 0.0 };
                            let core_pct = util.gpu as f64;

                            out.push(GpuInfo {
                                name: model,
                                vendor: "NVIDIA".into(),
                                memory_total_mb: total,
                                memory_used_mb: used,
                                memory_usage_percent: mem_pct,
                                core_usage_percent: core_pct,
                                temperature: temp.map(|t| t as f32),
                            });
                            return out;
                        }
                    }
                }
            } else if vendor.contains("amd") {
                #[cfg(target_os = "linux")]
                {
                    let card_index = 0;
                    let vram = read_amd_vram_sysfs(card_index);
                    let core = read_amd_gpu_usage(card_index);
                    if let Some((total, used)) = vram {
                        let mem_pct = if total > 0 { used as f64 / total as f64 * 100.0 } else { 0.0 };
                        let core_pct = core.unwrap_or(0.0);
                        out.push(GpuInfo {
                            name: model,
                            vendor: "AMD".into(),
                            memory_total_mb: total,
                            memory_used_mb: used,
                            memory_usage_percent: mem_pct,
                            core_usage_percent: core_pct,
                            temperature: None, // AMD temperature acquisition requires additional implementation
                        });
                        return out;
                    }
                }
            }

            // fallback for other GPUs
            let info_result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                gpu.info()
            }));

            if let Ok(info) = info_result {
                let total_result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    info.total_vram()
                }));
                let used_result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    info.used_vram()
                }));

                if let (Ok(total), Ok(used)) = (total_result, used_result) {
                    let total = total / 1024 / 1024;
                    let used = used / 1024 / 1024;
                    let mem_pct = if total > 0 { used as f64 / total as f64 * 100.0 } else { 0.0 };

                    out.push(GpuInfo {
                        name: model,
                        vendor: "Unknown".into(),
                        memory_total_mb: total,
                        memory_used_mb: used,
                        memory_usage_percent: mem_pct,
                        core_usage_percent: 0.0,
                        temperature: None,
                    });
                    return out;
                }
            }

            // If getting information fails, return basic information
            out.push(GpuInfo {
                name: model,
                vendor: "Unknown".into(),
                memory_total_mb: 0,
                memory_used_mb: 0,
                memory_usage_percent: 0.0,
                core_usage_percent: 0.0,
                temperature: None,
            });
        } else {
            // If unable to get GPU information, return default information
            out.push(GpuInfo {
                name: "Unknown GPU".into(),
                vendor: "Unknown".into(),
                memory_total_mb: 0,
                memory_used_mb: 0,
                memory_usage_percent: 0.0,
                core_usage_percent: 0.0,
                temperature: None,
            });
        }
    }

    out
}

// If gpu-monitoring feature is not enabled, use fallback implementation
#[cfg(not(feature = "gpu-monitoring"))]
fn get_gpu_info() -> Vec<GpuInfo> {
    gpu_fallback::get_gpu_info()
}

// Convenience function for quickly getting system information
pub fn get_system_info() -> Result<SystemInfo> {
    let mut monitor = SystemMonitor::new();
    monitor.refresh();
    Ok(monitor.get_system_info())
}

// Convenience function for quickly getting system information for a specific path
pub fn get_system_info_for_path(storage_path: &str) -> Result<SystemInfo> {
    let mut monitor = SystemMonitor::new();
    monitor.refresh();
    Ok(monitor.get_system_info_for_path(storage_path))
}