use log::info;
use salvo::fs::NamedFile;
use serde::Serialize;
use std::{
    path::{Path, PathBuf},
    time::SystemTime,
};
use sysinfo::Disks;
use tokio::{fs, io};

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct DiskMetadata {
    path: PathBuf,
    filesystem: String,
    space_used: u64,
    space_total: u64,
}

pub async fn read_disks() -> io::Result<Vec<DiskMetadata>> {
    let disks = Disks::new_with_refreshed_list();
    let mut disks_metadata = Vec::new();
    for disk in disks.iter() {
        disks_metadata.push(DiskMetadata {
            path: disk.mount_point().to_owned(),
            filesystem: disk.file_system().to_string_lossy().into_owned(),
            space_used: disk.total_space() - disk.available_space(),
            space_total: disk.total_space(),
        });
    }
    Ok(disks_metadata)
}

pub async fn create_dir(dst: impl AsRef<Path>) -> io::Result<()> {
    let dst = dst.as_ref();
    fs::create_dir_all(dst).await
}

pub async fn create_file(dst: impl AsRef<Path>) -> io::Result<()> {
    let dst = dst.as_ref();
    let parent = dst
        .parent()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Path is a root"))?;
    fs::create_dir_all(parent).await?;
    fs::File::create_new(dst).await?;
    Ok(())
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize)]
pub struct EntryMetadata {
    path: PathBuf,
    r#type: EntryType,
    ctime: Option<SystemTime>,
    mtime: Option<SystemTime>,
    size: u64,
    is_readonly: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize)]
pub enum EntryType {
    File,
    Dir,
    Symlink,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize)]
pub struct ReadDirData {
    metadata: EntryMetadata,
    entries: Vec<EntryMetadata>,
}

fn convert_metadata(path: impl Into<PathBuf>, metadata: std::fs::Metadata) -> EntryMetadata {
    EntryMetadata {
        path: path.into(),
        r#type: match metadata.file_type() {
            t if t.is_dir() => EntryType::Dir,
            t if t.is_file() => EntryType::File,
            t if t.is_symlink() => EntryType::Symlink,
            _ => unreachable!(),
        },
        ctime: metadata.created().ok(),
        mtime: metadata.modified().ok(),
        size: metadata.len(),
        is_readonly: metadata.permissions().readonly(),
    }
}

pub async fn read_metadata(src: impl Into<PathBuf>) -> io::Result<EntryMetadata> {
    let src = src.into();
    let metadata = fs::metadata(&src).await?;
    Ok(convert_metadata(src, metadata))
}

pub async fn read_dir(src: impl Into<PathBuf>) -> io::Result<ReadDirData> {
    let src = src.into();
    let mut readdir = fs::read_dir(&src).await?;
    let mut entries = Vec::new();
    while let Some(entry) = readdir.next_entry().await? {
        let metadata = entry.metadata().await?;
        entries.push(convert_metadata(entry.path(), metadata));
    }
    Ok(ReadDirData {
        metadata: read_metadata(src).await?,
        entries,
    })
}

pub async fn read_file_as_named(src: impl AsRef<Path>) -> io::Result<NamedFile> {
    let src = src.as_ref();
    NamedFile::open(src).await.map_err(|e| match e {
        salvo::Error::Io(e) => e,
        _ => io::Error::new(io::ErrorKind::Other, e),
    })
}

async fn copy_file(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> io::Result<()> {
    let src = src.as_ref();
    let dst = dst.as_ref();
    fs::copy(src, dst).await?;
    Ok(())
}

async fn copy_symlink(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> io::Result<()> {
    let src = src.as_ref();
    let dst = dst.as_ref();
    let original = fs::read_link(src).await?;
    if fs::metadata(src).await?.is_dir() {
        fs::symlink_dir(original, dst).await?;
    } else {
        fs::symlink_file(original, dst).await?;
    }
    Ok(())
}

async fn copy_dir(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> io::Result<()> {
    let src = src.as_ref().to_owned();
    let dst = dst.as_ref().to_owned();
    let mut stack = vec![(src, dst)];

    while let Some((dir_src, dir_dst)) = stack.pop() {
        create_dir(&dir_dst).await?;
        let mut readdir = fs::read_dir(&dir_src).await?;
        while let Some(entry) = readdir.next_entry().await? {
            let entry_src = entry.path();
            let entry_dst = dir_dst.join(entry.file_name());
            match entry.file_type().await? {
                t if t.is_dir() => stack.push((entry_src, entry_dst)),
                t if t.is_file() => copy_file(entry_src, entry_dst).await?,
                t if t.is_symlink() => copy_symlink(entry_src, entry_dst).await?,
                _ => unreachable!(),
            };
        }
    }
    Ok(())
}

pub async fn copy(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> io::Result<()> {
    let src = src.as_ref();
    let dst = dst.as_ref();
    match fs::symlink_metadata(src).await?.file_type() {
        t if t.is_dir() => copy_dir(src, dst).await?,
        t if t.is_file() => copy_file(src, dst).await?,
        t if t.is_symlink() => copy_symlink(src, dst).await?,
        _ => unreachable!(),
    };
    Ok(())
}

pub async fn r#move(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> io::Result<()> {
    let src = src.as_ref();
    let dst = dst.as_ref();

    // fs::rename(src, dst).await

    // let src = src.as_ref().to_owned();
    // let dst = dst.as_ref().to_owned();
    // let mut stack = vec![(src, dst)];

    // while let Some((dir_src, dir_dst)) = stack.pop() {
    //     create_dir(&dir_dst).await?;
    //     let mut readdir = fs::read_dir(&dir_src).await?;
    //     while let Some(entry) = readdir.next_entry().await? {
    //         let entry_src = entry.path();
    //         let entry_dst = dir_dst.join(entry.file_name());
    //         match entry.file_type().await? {
    //             t if t.is_dir() => stack.push((entry_src, entry_dst)),
    //             t if t.is_file() => copy_file(entry_src, entry_dst).await?,
    //             t if t.is_symlink() => copy_symlink(entry_src, entry_dst).await?,
    //             _ => unreachable!(),
    //         };
    //     }
    // }
    // Ok(())

    todo!("it has delete in it")
}

pub async fn move_to_trash(src: impl AsRef<Path>) -> io::Result<()> {
    let src = src.as_ref().to_owned();
    tokio::task::spawn_blocking(move || {
        trash::delete(src).map_err(|e| io::Error::new(io::ErrorKind::Other, e))
    })
    .await??;
    Ok(())
}

pub async fn delete(src: impl AsRef<Path>) -> io::Result<()> {
    let src = src.as_ref();
    let filetype = fs::symlink_metadata(src).await?.file_type();
    match filetype {
        t if t.is_dir() => {
            info!("Tried to delete directory `{}`", src.display());
        }
        t if t.is_file() || t.is_symlink() => {
            info!("Tried to delete file `{}`", src.display());
        }
        _ => unreachable!(),
    };
    Ok(())
}

pub fn ensure_absolute(path: impl AsRef<Path>) -> io::Result<()> {
    if path.as_ref().is_absolute() {
        Ok(())
    } else {
        Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Path must be absolute",
        ))
    }
}

/// Resolves traversing and collapses multislashes,
/// must NOT be used for real filesystem since it eliminates symlinks
pub fn normalize_path(path: impl AsRef<Path>) -> PathBuf {
    path.as_ref().components().collect()
}
