// JS utils

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
 * Simple iterable weakarray. Cleans up on length query or iterating
 * @template U
 * @template {NonNullable<U>} T
 */
export class WeakArray {
  /** @type {WeakRef<T>[]} */
  #array;

  /**
   * @param {Iterable<T>} iterable
   */
  constructor(iterable = []) {
    this.#array = [...iterable];
  }

  /**
   * @param {...T} items
   */
  push(...items) {
    for (const item of items) {
      this.#array.push(new WeakRef(item));
    }
  }

  /**
   * @param {T} item
   */
  has(item) {
    return this.#array.some((ref) => ref.deref() === item);
  }

  /**
   * @param {...T} items
   */
  remove(...items) {
    const itemsSet = new Set(items);
    this.#array = this.#array.filter((item) => !itemsSet.has(item.deref()));
  }

  get len() {
    this.#cleanup();
    return this.#array.length;
  }

  *[Symbol.iterator]() {
    this.#cleanup();
    for (const item of [...this.#array]) {
      const deref = item.deref();
      if (deref) yield deref;
    }
  }

  #cleanup() {
    this.#array = this.#array.filter((item) => item.deref());
  }
}
