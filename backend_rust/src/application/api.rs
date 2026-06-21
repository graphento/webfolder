use crate::infrastructure::{
    fs::{self, ReadDirData},
    sys::{self, SysStats},
};
use salvo::fs::NamedFile;
use std::path::{Path, PathBuf};

// fn is_localhost(req: &Request) -> bool {
//     use salvo::conn::SocketAddr::*;
//     match req.remote_addr() {
//         IPv4(addr) => addr.ip() == &Ipv4Addr::LOCALHOST,
//         IPv6(addr) => addr.ip() == &Ipv6Addr::LOCALHOST,
//         _ => false,
//     }
// }

pub async fn read_disks() -> Result<Vec<fs::DiskMetadata>, String> {
    fs::read_disks()
        .await
        .map_err(|e| format!("Failed to read disks: {}", e))
}

pub async fn create_dir(dst: impl AsRef<Path>) -> Result<(), String> {
    fs::ensure_absolute(&dst).map_err(|_| "`dst` must be absolute")?;
    fs::create_dir(&dst)
        .await
        .map_err(|e| format!("Failed to create directory: {}", e))
}

pub async fn create_file(dst: impl AsRef<Path>) -> Result<(), String> {
    fs::ensure_absolute(&dst).map_err(|_| "`dst` must be absolute")?;
    fs::create_file(&dst)
        .await
        .map_err(|e| format!("Failed to create file: {}", e))
}

pub async fn read_dir(src: impl Into<PathBuf>) -> Result<ReadDirData, String> {
    let src = src.into();
    fs::ensure_absolute(&src).map_err(|_| "`src` must be absolute")?;
    fs::read_dir(src)
        .await
        .map_err(|e| format!("Failed to read directory: {}", e))
}

pub async fn read_file(src: impl AsRef<Path>) -> Result<NamedFile, String> {
    fs::ensure_absolute(&src).map_err(|_| "`src` must be absolute")?;
    fs::read_file_as_named(src)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))
}

pub async fn write_file_from_path(
    dst: impl AsRef<Path>,
    path: impl AsRef<Path>,
) -> Result<(), String> {
    fs::ensure_absolute(&dst).map_err(|_| "`dst` must be absolute")?;
    fs::r#move(path, dst)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))
}

pub async fn r#move(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> Result<(), String> {
    fs::ensure_absolute(&src).map_err(|_| "`src` must be absolute")?;
    fs::ensure_absolute(&dst).map_err(|_| "`dst` must be absolute")?;
    fs::r#move(&src, &dst)
        .await
        .map_err(|e| format!("Failed to move: {}", e))
}

pub async fn copy(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> Result<(), String> {
    fs::ensure_absolute(&src).map_err(|_| "`src` must be absolute")?;
    fs::ensure_absolute(&dst).map_err(|_| "`dst` must be absolute")?;
    fs::copy(&src, &dst)
        .await
        .map_err(|e| format!("Failed to copy: {}", e))
}

pub async fn move_to_trash(src: impl AsRef<Path>) -> Result<(), String> {
    fs::ensure_absolute(&src).map_err(|_| "`src` must be absolute")?;
    fs::move_to_trash(&src)
        .await
        .map_err(|e| format!("Failed to move to trash: {}", e))
}

pub async fn delete(src: impl AsRef<Path>) -> Result<(), String> {
    fs::ensure_absolute(&src).map_err(|_| "`src` must be absolute")?;
    fs::delete(&src)
        .await
        .map_err(|e| format!("Failed to delete: {}", e))
}

pub async fn read_sys_stats() -> Result<SysStats, String> {
    Ok(sys::read_sys_stats())
}
