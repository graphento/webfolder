"use strict";

const userprompt = Object.freeze({
  /**
   * @returns {Promise<File | null>}
   */
  selectFile() {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
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
      const input = document.createElement("input");
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
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  },
});

export default userprompt;
