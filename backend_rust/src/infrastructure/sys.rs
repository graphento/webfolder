use serde::Serialize;
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, RefreshKind, System};

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct SysStats {
    system_name: String,
    system_hostname: String,
    cpu_usage: f32,
    ram_used: u64,
    ram_total: u64,
}

pub fn read_sys_stats() -> SysStats {
    let system = System::new_with_specifics(
        RefreshKind::nothing()
            .with_cpu(CpuRefreshKind::nothing().with_cpu_usage())
            .with_memory(MemoryRefreshKind::nothing().with_ram()),
    );

    SysStats {
        system_name: System::name().unwrap_or_else(|| "Unknown".to_string()),
        system_hostname: System::host_name().unwrap_or_else(|| "".to_string()),
        cpu_usage: system.global_cpu_usage(),
        ram_used: system.used_memory(),
        ram_total: system.total_memory(),
    }
}
