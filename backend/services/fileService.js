import fs from "fs/promises";
import path from "path";
import { resolveSafe } from "../utils/pathUtils.js";

let BASE_DIR = "";

export function initFileService(baseDir) {
  BASE_DIR = baseDir;
}

export async function readDir(userPath) {
  try {
    const fullPath = resolveSafe(BASE_DIR, userPath);

    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    const contents = [];

    for (const e of entries) {
      const entryPath = path.join(fullPath, e.name);

      let size = null;
      let mtime = null;

      try {
        const stat = await fs.stat(entryPath);
        size = stat.size;
        mtime = stat.mtime;
      } catch (err) {
        console.warn("stat error:", entryPath, err.message);
      }

      contents.push({
        name: e.name,
        isDir: e.isDirectory(),
        size,
        mtime
      });
    }

    return { success: true, contents };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function readFile(userPath) {
  try {
    const fullPath = resolveSafe(BASE_DIR, userPath);

    const data = await fs.readFile(fullPath, "utf-8");

    return { success: true, contents: data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function createDir(userPath) {
  try {
    const fullPath = resolveSafe(BASE_DIR, userPath);

    await fs.mkdir(fullPath, { recursive: true });

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function deletePath(userPath) {
  try {
    const fullPath = resolveSafe(BASE_DIR, userPath);

    await fs.rm(fullPath, { recursive: true, force: true });

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function movePath(src, dst) {
  try {
    const fullSrc = resolveSafe(BASE_DIR, src);
    const fullDst = resolveSafe(BASE_DIR, dst);

    await fs.rename(fullSrc, fullDst);

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function copyPath(src, dst) {
  try {
    const fullSrc = resolveSafe(BASE_DIR, src);
    const fullDst = resolveSafe(BASE_DIR, dst);

    await fs.cp(fullSrc, fullDst, { recursive: true });

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}