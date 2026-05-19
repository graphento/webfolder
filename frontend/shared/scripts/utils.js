// JS utils

/**
 * @template T
 * @param {Set<T>} set
 * @param {Iterable<T>} items
 */
export function setHasAll(set, items) {
  for (const item of items) {
    if (!set.has(item)) return false;
  }
  return true;
}

/**
 * Creates element by tag, handling namespaced as well
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @returns {HTMLElementTagNameMap[K]}
 */
export function createElement(tag) {
  if (tag === "svg" || tag === "use")
    return document.createElementNS("http://www.w3.org/2000/svg", tag);

  return document.createElement(tag);
}

/**
 * @template T
 */
export class IterableWeakSet {
  /** @type {Set<WeakRef<T>>} */
  #set = new Set();

  /**
   * @param {Iterable<T>} iterable
   */
  constructor(iterable = []) {
    this.insert(...iterable);
  }

  /**
   * Adds items to the set
   * @param {...T} items
   * 
   */
  insert(...items) {
    for (const item of items) {
      this.#set.add(new WeakRef(item));
    }
  }

  /**
   * @param {...T} items
   */
  delete(...items) {
    const itemsSet = new Set(items);
    for (const item of this.#set) {
      const deref = item.deref();
      if (!deref || itemsSet.has(deref)) this.#set.delete(item);
    }
  }

  *[Symbol.iterator]() {
    for (const item of this.#set) {
      const deref = item.deref();
      if (!deref) this.#set.delete(item);
      else yield deref;
    }
  }
}
