const pathutils = Object.freeze({
  /**
   * @param {string} path
   */
  isAbsolute(path) {
    return /^[\\\/]|^[a-zA-Z]:[\\\/]/.test(path);
  },

  /**
   * Returns an array of path components, ignoring empty components.
   * May be empty array if path looks like "/"
   * @param {string} path
   */
  components(path) {
    return path.split(/[\\\/]+/).filter(Boolean);
  },

  /**
   * Collapses multiple slashes and removes trailing slashes
   * @param {string} path
   */
  normalize_slashes(path) {
    let normalized = path.replace(/[\\\/]+/g, "/");
    if (normalized === "/") return normalized;
    return normalized.replace(/[\\\/]+$/, "");
  },

  /**
   * Joins paths. If b is absolute, returns b
   * @param {string} a
   * @param {string} b
   */
  join(a, b) {
    if (pathutils.isAbsolute(b)) return b;
    if (/[\\\/]$/.test(a)) {
      return a + b;
    } else {
      return a + "/" + b;
    }
  },
});

export default pathutils;
