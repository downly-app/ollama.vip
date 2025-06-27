use anyhow::Result;
use cfg_if::cfg_if;
use gfxinfo::active_gpu;
use nvml_wrapper::Nvml;
use serde::Serialize;

#[cfg(target_os = "linux")]
use std::{fs, path::Path};
use sysinfo::{CpuExt, CpuRefreshKind, DiskExt, RefreshKind, System, SystemExt};
use std::time::Duration;

#[derive(Serialize)]
struct CpuInfo {
    model: String,
    usage: f32,
    cores: usize,
    frequency: u64,
}

#[derive(Serialize)]
struct MemoryInfo {
    total_gb: f64,
    used_gb: f64,
    available_gb: f64,
    usage_percent: f64,
}

#[derive(Serialize)]
struct DiskInfo {
    mount_point: String,
    disk_type: String,
    total_gb: f64,
    used_gb: f64,
    usage_percent: f64,
}

#[derive(Serialize)]
struct GpuInfo {
    name: String,
    vendor: String,
    memory_total_mb: u64,
    memory_used_mb: u64,
    memory_usage_percent: f64,
    core_usage_percent: f64,
}

#[derive(Serialize)]
struct SystemInfo {
    cpu: CpuInfo,
    memory: MemoryInfo,
    disks: Vec<DiskInfo>,
    gpus: Vec<GpuInfo>,
}

fn get_cpu_info(sys: &System) -> CpuInfo {
    let model = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Unknown".into());
    let usage = sys.global_cpu_info().cpu_usage();
    let cores = sys.cpus().len();
    let freq = sys.cpus().first().map(|c| c.frequency()).unwrap_or(0);
    CpuInfo {
        model,
        usage,
        cores,
        frequency: freq,
    }
}

fn get_memory_info(sys: &System) -> MemoryInfo {
    let total = sys.total_memory() as f64 / 1_073_741_824.0;
    let used = sys.used_memory() as f64 / 1_073_741_824.0;
    let avail = total - used;
    let pct = if total > 0.0 { used / total * 100.0 } else { 0.0 };
    MemoryInfo {
        total_gb: total,
        used_gb: used,
        available_gb: avail,
        usage_percent: pct,
    }
}

fn get_disk_info(sys: &System) -> Vec<DiskInfo> {
    sys.disks()
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

fn get_gpu_info() -> Vec<GpuInfo> {
    let mut out = Vec::new();

    if let Ok(gpu) = active_gpu() {
        let vendor = gpu.vendor().to_lowercase();
        let model = gpu.model().to_string();

        if vendor.contains("nvidia") {
            if let Ok(nvml) = Nvml::init() {
                if let Ok(device) = nvml.device_by_index(0) {
                    let mem = device.memory_info().ok();
                    let util = device.utilization_rates().ok();

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
                        });
                        return out;
                    }
                }
            }
        } else if vendor.contains("amd") {
            cfg_if! {
                if #[cfg(target_os = "linux")] {
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
                        });
                        return out;
                    }
                }
            }
        }

        // fallback
        let info = gpu.info();
        let total = info.total_vram() / 1024 / 1024;
        let used = info.used_vram() / 1024 / 1024;
        let mem_pct = if total > 0 { used as f64 / total as f64 * 100.0 } else { 0.0 };

        out.push(GpuInfo {
            name: model,
            vendor: "Unknown".into(),
            memory_total_mb: total,
            memory_used_mb: used,
            memory_usage_percent: mem_pct,
            core_usage_percent: 0.0,
        });
    }

    out
}

fn main() -> Result<()> {
    let mut sys = System::new_with_specifics(
        RefreshKind::new()
            .with_cpu(CpuRefreshKind::everything())
            .with_memory()
            .with_disks_list(),
    );

    sys.refresh_all();
    std::thread::sleep(Duration::from_secs(1));
    sys.refresh_cpu();

    let info = SystemInfo {
        cpu: get_cpu_info(&sys),
        memory: get_memory_info(&sys),
        disks: get_disk_info(&sys),
        gpus: get_gpu_info(),
    };

    println!("{}", serde_json::to_string_pretty(&info)?);
    Ok(())
}
