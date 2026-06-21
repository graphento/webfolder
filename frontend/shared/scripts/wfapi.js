"use strict";

import pathutils from "./pathutils.js";
import userprompt from "./userprompt.js";

/**
 * @param {string} endpoint
 * @param {any} data
 */
function postJson(endpoint, data) {
  return fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

/**
 * @param {string} endpoint
 * @param {FormData} formData
 */
function postFormData(endpoint, formData) {
  return fetch(endpoint, { method: "POST", body: formData });
}

const api = Object.freeze({
  /**
   * @param {string} dst
   */
  async readDisks(dst) {
    const res = await fetch("api/read_disks");
    return await res.json();
  },

  /**
   * @param {string} dst
   */
  async createDir(dst) {
    const res = await postJson("api/create_dir", { dst });
    return await res.json();
  },

  /**
   * @param {string} dst
   */
  async createFile(dst) {
    const res = await postJson("api/create_file", { dst });
    return await res.json();
  },

  /**
   * @param {string} src
   */
  async readDir(src) {
    const res = await postJson("api/read_dir", { src });
    return await res.json();
  },

  /**
   * Reads file to memory
   * @param {string} src
   */
  async readFile(src) {
    const formdata = new FormData();
    formdata.append("src", src);
    const res = await postFormData("api/read_file", formdata);
    return await res.blob();
  },

  /**
   * Initiates file download
   * @param {string} src
   */
  async downloadFile(src) {
    const formdata = new FormData();
    formdata.append("src", src);
    userprompt.downloadPostViaForm("api/read_file", formdata);
  },

  /**
   * @param {string} dst
   * @param {Blob} data
   */
  async writeFile(dst, data) {
    const formdata = new FormData();
    formdata.append("dst", dst);
    formdata.append("data", data);
    const res = await postFormData("api/write_file", formdata);
    return await res.json();
  },

  /**
   * @param {string} src
   * @param {string} dst
   */
  async move(src, dst) {
    const res = await postJson("api/move", { src, dst });
    return await res.json();
  },

  /**
   * @param {string} src
   * @param {string} dst
   */
  async copy(src, dst) {
    const res = await postJson("api/copy", { src, dst });
    return await res.json();
  },

  /**
   * @param {string} src
   * @param {string} dst
   */
  async moveToTrash(src) {
    const res = await postJson("api/move_to_trash", { src });
    return await res.json();
  },

  /**
   * @param {string} src
   */
  async delete(src) {
    const res = await postJson("api/delete", { src });
    return await res.json();
  },
});

export default api;
