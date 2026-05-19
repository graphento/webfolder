"use strict";

import pathutils from "./pathutils.js";
import userprompt from "./userprompt.js";

function toValidAbsPath(path) {
  if (!pathutils.isAbsolute(path)) return null;
  return pathutils.toValid(path);
}

function formatDate(ms) {
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, "0");
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${MM}.${yyyy} ${hh}:${mm}`;
}

const opfs = {
  /**
   * @param {string} path
   * @param {boolean} create
   */
  async getDir(path, create = false) {
    let current = await navigator.storage.getDirectory();
    for (const dir of pathutils.dirs(path)) {
      current = await current.getDirectoryHandle(dir, { create });
    }
    return current;
  },

  /**
   * @param {string} path
   * @param {boolean} create
   */
  async getFile(path, create = false) {
    const dir = await opfs.getDir(path, create);
    return await dir.getFileHandle(pathutils.filename(path), { create });
  },

  // /**
  //  * @param {string} path
  //  */
  // async getEntry(path) {
  //   const dir = await opfs.getDir(path);
  //   const filename = pathutils.filename(path);
  //   try {
  //     return await dir.getFileHandle(filename);
  //   } catch {
  //     return await dir.getDirectoryHandle(filename);
  //   }
  // },

  /**
   * @param {FileSystemFileHandle} dst
   * @param {FileSystemWriteChunkType} data
   */
  async writeFile(dst, data) {
    const stream = await dst.createWritable();
    await stream.truncate(0);
    await stream.write(data);
    await stream.close();
  },

  /**
   * @param {FileSystemFileHandle} src
   * @param {FileSystemFileHandle} dst
   */
  async copyFileContents(src, dst) {
    await opfs.writeFile(dst, await src.getFile());
  },

  /**
   * @param {FileSystemFileHandle} src
   * @param {FileSystemDirectoryHandle} dst
   */
  async copyFileToDir(src, dst) {
    await opfs.writeFile(dst.getFileHandle(src.name), await src.getFile());
  },

  /**
   * @param {FileSystemDirectoryHandle} src
   * @param {FileSystemDirectoryHandle} dst
   */
  async copyDirContents(src, dst) {
    for await (const [name, handle] of src.entries()) {
      if (handle.kind === "file") {
        await opfs.copyFileToDir(handle, dst);
      } else {
        await opfs.copyDirContents(
          handle,
          await dst.getDirectoryHandle(name, { create: true }),
        );
      }
    }
  },

  /**
   * @param {string} src
   * @param {string} dst
   */
  async copy(src, dst) {
    const srcFilename = pathutils.filename(src);
    const dstFilename = pathutils.filename(dst);
    if (srcFilename && dstFilename) {
      await opfs.copyFileContents(src, dst);
    } else if (srcFilename) {
      await opfs.copyFileToDir(src, dst);
    } else if (dstFilename) {
      throw new Error("Can't move a directory into a file");
    } else {
      await opfs.copyDirContents(src, dst);
    }
  },

  /**
   * @param {string} src
   */
  async delete(src) {
    const dir = await opfs.getDir(src);
    const filename = pathutils.filename(src);
    await dir.removeEntry(filename, { recursive: true });
  },
};

const api = Object.freeze({
  /**
   * @param {string} dst
   */
  async createFile(dst) {
    dst = toValidAbsPath(dst);
    await opfs.getFile(dst, true);
  },

  /**
   * @param {string} dst
   * @param {FileSystemWriteChunkType} data
   */
  async writeFile(dst, data) {
    dst = toValidAbsPath(dst);
    const file = await opfs.getFile(dst, true);
    await opfs.writeFile(file, data);
  },

  /**
   * @param {string} dst
   */
  async createDir(dst) {
    dst = toValidAbsPath(dst);
    await opfs.getDir(dst, true);
  },

  /**
   * @param {string} dst
   */
  async uploadFile(dst) {
    const file = await userprompt.selectFile();
    if (!file) return;
    await api.writeFile(pathutils.join(dst, file.name), file);
  },

  /**
   * @param {string} dst
   */
  async uploadDir(dst) {
    const files = await userprompt.selectDir();
    if (!files) return;
    for (const file of files) {
      const relativePath = pathutils.popFront(file.webkitRelativePath).rest;
      api.writeFile(pathutils.join(dst, relativePath), file);
    }
  },

  /**
   * @param {string} src
   */
  async downloadFile(src) {
    const handle = await opfs.getFile(src);
    const file = await handle.getFile();
    await userprompt.downloadBlob(file, file.name);
  },

  /**
   * @param {string} src
   */
  downloadDir(src) {
    throw new Error("Download dir not implemented");
  },

  /**
   * @param {string} src
   */
  async readFile(src, start = 0, length = -1) {
    src = toValidAbsPath(src);
    const handle = await opfs.getFile(src);
    const file = await handle.getFile();
    const buffer = await file.arrayBuffer();

    if (start === 0 && length === -1) {
      return new Uint8Array(await file.arrayBuffer());
    }

    const end = length === -1 ? file.size : Math.min(start + length, file.size);
    const slice = file.slice(start, end);
    return new Uint8Array(await slice.arrayBuffer());
  },

  /**
   * @param {string} src
   */
  async readDir(src) {
    src = toValidAbsPath(src);
    const dir = await opfs.getDir(src);
    const entries = [];
    for await (const [name, handle] of dir.entries()) {
      let metadata;
      if (handle.kind === "file") {
        const file = await handle.getFile();
        metadata = {
          size: file.size,
          mimetype: file.type,
          mtime: formatDate(file.lastModified),
        };
      } else {
        metadata = {
          size: 0,
          mimetype: "inode/directory",
          mtime: "N/A",
        };
      }

      entries.push({
        name,
        metadata,
      });
    }
    return entries;
  },

  /**
   * @param {string} src
   * @param {string} dst
   */
  async move(src, dst) {
    src = toValidAbsPath(src);
    dst = toValidAbsPath(dst);
    if (src === dst) return;

    await opfs.copy(src, dst);
    await opfs.delete(src);
  },

  /**
   * @param {string} src
   * @param {string} dst
   */
  async copy(src, dst) {
    src = toValidAbsPath(src);
    dst = toValidAbsPath(dst);
    if (src === dst) return;

    await opfs.copy(src, dst);
  },

  /**
   * @param {string} src
   */
  async delete(src) {
    src = toValidAbsPath(src);
    await opfs.delete(src);
  },

  /**
   * @param {string} src
   */
  moveToTrash(src) {
    return api.move(src, pathutils.join("/$RECYCLE.BIN/", src));
  },
});

export default api;
