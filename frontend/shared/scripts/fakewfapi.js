"use strict";

import pathutils from "./pathutils.js";
import userprompt from "./userprompt.js";

function toValidAbsPath(path) {
  if (!path || typeof path !== "string") return null;
  const abs = pathutils.toAbsolute(path);
  return pathutils.toValid(abs);
}

const opfs = {
  splitPath(absPath) {
    let p = absPath.replace(/\/+$/, "");
    if (p === "" || p === "/") return { parentPath: "/", name: "" };
    const idx = p.lastIndexOf("/");
    const name = p.slice(idx + 1);
    const parentPath = idx <= 0 ? "/" : p.slice(0, idx);
    return { parentPath, name };
  },

  async getDir(path, create = false) {
    let current = await navigator.storage.getDirectory();
    for (const dir of pathutils.dirs(path)) {
      current = await current.getDirectoryHandle(dir, { create });
    }
    return current;
  },

  async getDirectoryAt(path, create = false) {
    const { parentPath, name } = opfs.splitPath(path);
    if (!name) return opfs.getDir("/");
    const parent = await opfs.getDir(parentPath, create);
    return parent.getDirectoryHandle(name, { create });
  },

  async getFile(path, create = false) {
    const { parentPath, name } = opfs.splitPath(path);
    if (!name) throw new Error("Invalid file path");
    const parent = await opfs.getDir(parentPath, create);
    return parent.getFileHandle(name, { create });
  },

  async entryKind(path) {
    const { parentPath, name } = opfs.splitPath(path);
    if (!name) return "directory";
    const parent = await opfs.getDir(parentPath);
    try {
      await parent.getDirectoryHandle(name);
      return "directory";
    } catch (e) {
      if (e.name === "TypeMismatchError") return "file";
      if (e.name === "NotFoundError") return null;
      throw e;
    }
  },

  async writeFile(dst, data) {
    const stream = await dst.createWritable();
    await stream.truncate(0);
    await stream.write(data);
    await stream.close();
  },

  async copyFileContents(src, dst) {
    await opfs.writeFile(dst, await src.getFile());
  },

  async copyFileToDir(src, dst) {
    const dstFile = await dst.getFileHandle(src.name, { create: true });
    await opfs.writeFile(dstFile, await src.getFile());
  },

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

  async copy(src, dst) {
    const kind = await opfs.entryKind(src);
    if (kind === "file") {
      const srcHandle = await opfs.getFile(src);
      const dstKind = await opfs.entryKind(dst);
      if (dstKind === "directory") {
        const dstDir = await opfs.getDirectoryAt(dst, true);
        await opfs.copyFileToDir(srcHandle, dstDir);
      } else {
        const dstHandle = await opfs.getFile(dst, true);
        await opfs.copyFileContents(srcHandle, dstHandle);
      }
      return;
    }

    const srcDir = await opfs.getDirectoryAt(src);
    const dstDir = await opfs.getDirectoryAt(dst, true);
    await opfs.copyDirContents(srcDir, dstDir);
  },

  async delete(src) {
    const { parentPath, name } = opfs.splitPath(src);
    if (!name) throw new Error("Cannot delete root");
    const parent = await opfs.getDir(parentPath);
    await parent.removeEntry(name, { recursive: true });
  },
};

const api = Object.freeze({
  async createFile(dst) {
    dst = toValidAbsPath(dst);
    if (!dst) throw new Error("Invalid path");
    await opfs.getFile(dst, true);
  },

  async writeFile(dst, data) {
    dst = toValidAbsPath(dst);
    if (!dst) throw new Error("Invalid path");
    const file = await opfs.getFile(dst, true);
    await opfs.writeFile(file, data);
  },

  async createDir(dst) {
    dst = toValidAbsPath(dst);
    if (!dst) throw new Error("Invalid path");
    await opfs.getDirectoryAt(dst, true);
  },

  async uploadFile(dst) {
    const file = await userprompt.selectFile();
    if (!file) return;
    const base = toValidAbsPath(dst) || "/";
    await api.writeFile(pathutils.join(base, file.name), file);
  },

  async uploadDir(dst) {
    const base = toValidAbsPath(dst) || "/";
    const files = await userprompt.selectDir();
    if (!files) return;
    if (files.length === 0) {
      throw new Error(
        "Папка пуста. Используйте «Создать папку» или выберите папку с файлами",
      );
    }
    for (const file of files) {
      await api.writeFile(pathutils.join(base, file.webkitRelativePath), file);
    }
  },

  async downloadFile(src) {
    src = toValidAbsPath(src);
    if (!src) throw new Error("Invalid path");
    if ((await opfs.entryKind(src)) === "directory") {
      throw new Error("Скачивание папок пока не поддерживается");
    }
    const handle = await opfs.getFile(src);
    const file = await handle.getFile();
    await userprompt.downloadBlob(file, file.name);
  },

  downloadDir() {
    throw new Error("Download dir not implemented");
  },

  async readFile(src, start = 0, length = -1) {
    src = toValidAbsPath(src);
    if (!src) throw new Error("Invalid path");
    const handle = await opfs.getFile(src);
    const file = await handle.getFile();
    if (start === 0 && length === -1) {
      return new Uint8Array(await file.arrayBuffer());
    }
    const end = length === -1 ? file.size : Math.min(start + length, file.size);
    return new Uint8Array(await (await file.slice(start, end)).arrayBuffer());
  },

  async readDir(src) {
    src = toValidAbsPath(src);
    if (!src) throw new Error("Invalid path");
    const dir = await opfs.getDirectoryAt(src);
    const entries = [];
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind === "file") {
        const file = await handle.getFile();
        entries.push({
          name,
          metadata: {
            size: file.size,
            mimetype: file.type,
            mtime: formatDate(file.lastModified),
          },
        });
      } else {
        entries.push({
          name,
          metadata: {
            size: 0,
            mimetype: "inode/directory",
            mtime: "N/A",
          },
        });
      }
    }
    return entries;
  },

  async move(src, dst) {
    src = toValidAbsPath(src);
    dst = toValidAbsPath(dst);
    if (!src || !dst) throw new Error("Invalid path");
    if (src === dst) return;
    await opfs.copy(src, dst);
    await opfs.delete(src);
  },

  async copy(src, dst) {
    src = toValidAbsPath(src);
    dst = toValidAbsPath(dst);
    if (!src || !dst) throw new Error("Invalid path");
    if (src === dst) return;
    await opfs.copy(src, dst);
  },

  async delete(src) {
    src = toValidAbsPath(src);
    if (!src) throw new Error("Invalid path");
    await opfs.delete(src);
  },

  async entryKind(path) {
    const valid = toValidAbsPath(path);
    if (!valid) return null;
    return opfs.entryKind(valid);
  },

  moveToTrash(src) {
    return api.move(src, pathutils.join("/$RECYCLE.BIN", pathutils.filename(src)));
  },
});

function formatDate(ms) {
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, "0");
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${MM}.${yyyy} ${hh}:${mm}`;
}

export default api;
