/**
 * Возвращает имя файла/папки из полного пути
 * @param {string} path
 * @returns {string}
 */
export function getNameFromPath(path) {
  if (!path || typeof path !== "string") return "";

  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  const parts = path.split("/");

  return parts[parts.length - 1] || "";
}