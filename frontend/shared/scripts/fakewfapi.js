"use strict";

import pathutils from "./pathutils.js";
import userprompt from "./userprompt.js";

const opfs = Object.freeze({
  async readDisks() {
    const space = await navigator.storage.estimate();
    return {
      path: "/",
      filesystem: "OPFS",
      space_used: space.usage || 0,
      space_total: space.quota || 0,
    };
  },

  async getDir(dst, create = false) {
    let current = await navigator.storage.getDirectory();
    for (const component of pathutils.components(dst)) {
      current = await current.getDirectoryHandle(component, { create });
    }
    return current;
  },

  async getFile(dst, create = false) {
    const components = pathutils.components(dst);
    const filename = components.pop();
    if (!filename) throw new Error("Path is root");
    const dir = await opfs.getDir(components.join("/"));
    return dir.getFileHandle(filename, { create });
  },

  async readDir(src) {
    const dir = await opfs.getDir(src);
    const entries = [];
    for await (const [name, handle] of dir.entries()) {
      entries.push(await opfs.readMetadata(pathutils.join(src, name)));
    }
    return {
      metadata: await opfs.readMetadata(src),
      entries,
    };
  },

  async readFile(src) {
    const file = await opfs.getFile(src);
    return file.getFile();
  },

  async writeFile(dst, data) {
    const handle = await opfs.getFile(dst, true);
    const writer = await handle.createWritable({ keepExistingData: false });
    await writer.write(data);
    await writer.close();
  },

  async copyFile(src, dst) {
    await opfs.writeFile(dst, await opfs.readFile(src));
  },

  async copyDir(src, dst) {
    const srcDir = await opfs.getDir(src);
    const dstDir = await opfs.getDir(dst, true);
    for await (const [name, handle] of srcDir.entries()) {
      if (handle.kind === "file") {
        await opfs.writeFile(pathutils.join(dst, name), await handle.getFile());
      } else {
        // "directory"
        await opfs.copyDir(
          pathutils.join(src, name),
          pathutils.join(dst, name),
        );
      }
    }
  },

  async readMetadata(src) {
    try {
      const handle = await opfs.getFile(src);
      const file = await handle.getFile();
      return {
        path: src,
        type: "file",
        ctime: file.lastModified,
        mtime: file.lastModified,
        size: file.size,
        is_readonly: false,
      };
    } catch (e) {
      if (e.name === "TypeMismatchError") {
        const dir = await opfs.getDir(src);
        return {
          path: src,
          type: "dir",
          ctime: 0,
          mtime: 0,
          size: 0,
          is_readonly: false,
        };
      }
      if (e.name === "NotFoundError") return null;
      throw e;
    }
  },

  async copy(src, dst) {
    const metadata = await opfs.readMetadata(src);
    if (metadata.type === "file") {
      await opfs.copyFile(src, dst);
    } else {
      await opfs.copyDir(src, dst);
    }
  },

  async move(src, dst) {
    await opfs.copy(src, dst);
    await opfs.delete(src);
  },

  async moveToTrash(src) {
    await opfs.move(src, pathutils.join("$RECYCLE.BIN", src));
  },

  async delete(src) {
    const components = pathutils.components(src);
    const filename = components.pop();
    if (!filename) throw new Error("Path is root");
    const dir = await opfs.getDir(components.join("/"));
    await dir.removeEntry(filename, { recursive: true });
  },
});

const api = Object.freeze({
  /**
   * @param {string} dst
   */
  readDisks(dst) {
    return opfs.readDisks();
  },

  /**
   * @param {string} dst
   */
  async createDir(dst) {
    await opfs.getDir(dst, true);
  },

  /**
   * @param {string} dst
   */
  async createFile(dst) {
    await opfs.getFile(dst, true);
  },

  /**
   * @param {string} src
   */
  async readDir(src) {
    return opfs.readDir(src);
  },

  /**
   * Reads file to memory
   * @param {string} src
   */
  async readFile(src) {
    return opfs.readFile(src);
  },

  /**
   * Initiates file download
   * @param {string} src
   */
  async downloadFile(src) {
    const file = await opfs.readFile(src);
    userprompt.downloadBlob(file, file.name)
  },

  /**
   * @param {string} dst
   * @param {Blob} data
   */
  async writeFile(dst, data) {
    await opfs.writeFile(dst, data);
  },

  /**
   * @param {string} src
   * @param {string} dst
   */
  async move(src, dst) {
    await opfs.move(src, dst);
  },

  /**
   * @param {string} src
   * @param {string} dst
   */
  async copy(src, dst) {
    await opfs.copy(src, dst);
  },

  /**
   * @param {string} src
   * @param {string} dst
   */
  async moveToTrash(src) {
    await opfs.moveToTrash(src);
  },

  /**
   * @param {string} src
   */
  async delete(src) {
    await opfs.delete(src);
  },
});

export default api;
