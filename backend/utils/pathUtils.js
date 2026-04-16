import path from "path";

export function resolveSafe(base, target) {
  const resolvedPath = path.resolve(base, "." + target);

  if (!resolvedPath.startsWith(path.resolve(base))) {
    throw new Error("Forbidden path");
  }

  return resolvedPath;
}