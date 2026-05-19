"use strict";

import pathutils from "./pathutils.js";
import userprompt from "./userprompt.js";

/**
 * @param {string} endpoint
 * @param {any} data
 */
async function fetchJsonApi(endpoint, data) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return await response.json();
}

/**
 * @param {string} endpoint
 * @param {FormData} formData
 */
async function fetchFormApi(endpoint, formData) {
  const response = await fetch(endpoint, { method: "POST", body: formData });
  return await response.json();
}

const api = Object.freeze({
  createFile(dst) {
    return fetchJsonApi("api/create_file", { dst });
  },

  writeFile(dst, data) {
    const formData = new FormData();
    formData.append("dst", dst);
    formData.append("data", data);
    return fetchFormApi("api/write_file", formData);
  },

  createDir(dst) {
    return fetchJsonApi("api/create_dir", { dst });
  },

  async uploadFile(dst) {
    const file = await userprompt.selectFile();
    if (!file) return;
    await api.writeFile(dst, file);
  },

  async uploadDir(dst) {
    const files = await userprompt.selectDir();
    if (!files) return;
    for (const file of files) {
      const relativePath = pathutils.popFront(file.webkitRelativePath).rest;
      api.writeFile(pathutils.join(dst, relativePath), file);
    }
  },

  downloadFile(src) {
    return userprompt.downloadUrl(
      `api/download?src=${src}`,
      pathutils.filename(src),
    );
  },

  downloadDir(src) {
    // doesn't matter for backend
    return api.downloadFile(src);
  },

  readFile(src, start = 0, length = -1) {
    return fetchJsonApi("api/read_file", { src, start, length });
  },

  readDir(src) {
    return fetchJsonApi("api/read_dir", { src });
  },

  move(src, dst) {
    return fetchJsonApi("api/move", { src, dst });
  },

  copy(src, dst) {
    return fetchJsonApi("api/copy", { src, dst });
  },

  delete(src) {
    return fetchJsonApi("api/delete", { src });
  },

  moveToTrash(src) {
    return fetchJsonApi("api/move_to_trash", { src });
  },
});

export default api;
