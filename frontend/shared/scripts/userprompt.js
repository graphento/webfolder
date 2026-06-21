"use strict";

import { createElement } from "./utils.js";

const userprompt = Object.freeze({
  /**
   * @returns {Promise<File | null>}
   */
  selectFile() {
    return new Promise((resolve, reject) => {
      const input = createElement("input");
      input.type = "file";
      input.onchange = () => resolve(input.files[0]);
      input.oncancel = () => resolve(null);
      input.click();
    });
  },

  /**
   * @returns {Promise<FileList | null>}
   */
  selectDir() {
    return new Promise((resolve, reject) => {
      const input = createElement("input");
      input.type = "file";
      input.webkitdirectory = true;
      input.onchange = () => resolve(input.files);
      input.oncancel = () => resolve(null);
      input.click();
    });
  },

  /**
   * @param {Blob} blob
   */
  async downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    await userprompt.downloadUrl(url, name);
    URL.revokeObjectURL(url);
  },

  /**
   * @param {string} url
   */
  async downloadUrl(url, name) {
    const a = createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  },

  /**
   * @param {string} url
   * @param {FormData} formdata
   */
  async downloadPostViaForm(url, formdata) {
    const form = createElement("form");
    form.method = "POST";
    form.action = url;
    form.style.display = "none";

    for (const [key, value] of formdata.entries()) {
      const field = createElement("input");
      field.type = "hidden";
      field.name = key;
      field.value = value;
      form.appendChild(field);
    }

    // TODO: check it is actually required
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  },
});

export default userprompt;
