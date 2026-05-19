const pathutils = Object.freeze({
  /**
   * @param {string} path
   */
  isAbsolute(path) {
    return /^[\\\/]|^[a-zA-Z]:[\\\/]/.test(path);
  },

  /**
   * @param {string} path
   */
  filename(path) {
    return path.match(/[^\\\/]+$/)?.[0] ?? "";
  },

  /**
   * @param {string} path
   * @returns {string} path without filename
   */
  dirname(path) {
    return path.replace(/[\\\/][^\\\/]*$/, "/");
  },

  /**
   * @param {string} path
   */
  toRelative(path) {
    return path.replace(/^[\\\/]+/, "");
  },

  /**
   * @param {string} path
   */
  toAbsolute(path) {
    if (pathutils.isAbsolute(path)) return path;
    return "/" + path;
  },

  /**
   * @param {string} path
   */
  popBack(path) {
    const back = /([^\\\/]*)[\\\/]*$/.exec(path);
    return {
      item: back[1],
      rest: path.slice(0, -back[0].length),
    };
  },

  /**
   * @param {string} path
   */
  popFront(path) {
    const absMarker = /^[\\\/]+/.exec(path);
    const offset = absMarker ? absMarker[0].length : 0;
    const relPath = path.slice(offset);
    const separator = /[\\\/]+/.exec(relPath);
    const rest = separator
      ? relPath.slice(separator.index + separator[0].length)
      : relPath;

    return {
      item: separator ? relPath.slice(0, separator.index) : "",
      rest: absMarker ? "/" + rest : rest,
    };
  },

  /**
   * @param {string} path
   */
  join(start, end) {
    const segments = [];
    const add = (p) => {
      for (const part of String(p).split(/[\\/]+/)) {
        if (part && part !== ".") segments.push(part);
      }
    };
    add(start);
    add(end);
    if (segments.length === 0) return "/";
    return "/" + segments.join("/");
  },

  /**
   * Removes traversing and multiple slashes
   * @param {string} path
   */
  normalize(path) {
    const stack = [];
    for (const part of path.split(/[\\\/]+/)) {
      if (part === "" || part === ".") continue;
      if (part === "..") {
        if (stack.length && stack[stack.length - 1] !== "..") {
          stack.pop();
          continue;
        }
      }
      stack.push(part);
    }
    let normalized = stack.join("/");
    if (pathutils.isAbsolute(path)) normalized = "/" + normalized;
    if (pathutils.filename(normalized) === "") normalized += "/";
    return normalized;
  },

  /**
   * Normalizes path and ensures it is not traversing
   * @param {string} path
   */
  toValid(path) {
    const normalized = pathutils.normalize(path);
    if (/^\/?\.\.\//.test(normalized)) return null;
    return normalized;
  },

  /**
   * @param {string} path
   */
  dirs(path) {
    return path.split(/[\\\/]+/).filter(Boolean);
  },
});

export default pathutils;
