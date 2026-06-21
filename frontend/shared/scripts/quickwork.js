// QuickWork is a super cool module that makes our life easier

"use strict";

import { createElement, WeakArray } from "./utils.js";

class CssSelector {
  /** @type {string} */
  #strSelector;

  /** @type {{tag: string | undefined, classList: string[], id: string | undefined}[]} */
  #subselectors;

  /**
   * @param {string} selector
   */
  constructor(selector) {
    this.#strSelector = selector;
    this.#subselectors = [];
    for (const subselector of selector.split(/\s+/)) {
      this.#subselectors.push(
        Object.freeze({
          tag: subselector.match(/^([\w-]+)/)?.[1],
          classList: Object.freeze(
            [...subselector.matchAll(/\.([\w-]+)/g)].map((match) => match[1]),
          ),
          id: subselector.match(/#([\w-]+)/)?.[1],
        }),
      );
    }
    this.#subselectors = Object.freeze(this.#subselectors);
  }

  get strSelector() {
    return this.#strSelector;
  }

  get subselectors() {
    return this.#subselectors;
  }

  /**
   * @param {Element} root
   */
  all(root) {
    if (this.#subselectors.length === 1) {
      const { tag, classList, id } = this.#subselectors[0];
      if (tag && classList.length === 0 && !id) {
        return root.getElementsByTagName(tag);
      }

      if (!tag && classList.length === 1 && !id) {
        return root.getElementsByClassName(classList[0]);
      }
    }

    return root.querySelectorAll(this.#strSelector);
  }
}

/**
 * @template {HTMLElement} T
 */
class QwSet {
  #elements;

  /**
   * @param {Iterable<T> & { length: number }} elements
   */
  constructor(elements) {
    this.#elements = elements;
  }

  get length() {
    return this.#elements.length;
  }

  [Symbol.iterator]() {
    return this.#elements[Symbol.iterator]();
  }

  /**
   * @template {keyof T} K
   * @param {K} prop
   * @returns {T[K] | undefined}
   */
  get(prop) {
    let element = this.#elements[Symbol.iterator]().next().value;
    if (element) return element[prop];
  }

  /**
   * @template {keyof T} K
   * @param {K} prop
   * @param {T[K]} value
   */
  set(prop, value) {
    for (const element of this.#elements) {
      element[prop] = value;
    }
    return this;
  }

  /**
   * @template {keyof T} K
   * @param {K} prop
   * @param {T[K]} value
   */
  setAttr(prop, value) {
    for (const element of this.#elements) {
      element.setAttribute(prop, value);
    }
    return this;
  }

  /**
   * @param {...(string | Node | QwSet<HTMLElement>)} args
   */
  append(...args) {
    const items = [];
    for (const arg of args) {
      if (arg instanceof QwSet) {
        for (const element of arg) {
          items.push(element);
        }
      } else {
        items.push(arg);
      }
    }

    let i = 1;
    for (const element of this.#elements) {
      element.append(
        ...items.map((item) => {
          if (item instanceof Node) {
            if (i === this.#elements.length) return item;
            return item.cloneNode(true);
          }

          return item;
        }),
      );
      i++;
    }

    return this;
  }

  /**
   * @template {keyof HTMLElementEventMap} K
   * @param {K} event
   * @param {(event: HTMLElementEventMap[K]) => void} callback
   * @param {AddEventListenerOptions} [options]
   */
  on(event, callback, options) {
    for (const element of this.#elements) {
      element.addEventListener(event, callback, options);
    }
    return this;
  }

  remove() {
    for (const element of this.#elements) {
      element.remove();
    }
    return this;
  }

  /**
   * @param {(T) => void} callback
   */
  forEach(callback) {
    for (const element of this.#elements) {
      callback(element);
    }
  }
}

/**
 * @template {HTMLElement} T
 */
class QwDynSet {
  #elements;
  #observer;
  #operations = [];

  /**
   * @param {Iterable<T>} elements
   * @param {EventTarget} observer
   */
  constructor(elements, observer) {
    this.#elements = new WeakArray(elements);
    this.#observer = observer;
    this.#observer.addEventListener("add", (event) => {
      const element = event.detail;
      for (const operation of this.#operations) {
        operation(element);
      }
      this.#elements.push(element);
    });
  }

  /**
   * @param {(T) => void} callback
   */
  forEach(callback) {
    for (const element of this.#elements) {
      callback(element);
    }
    this.#operations.push(callback);
  }

  disconnect() {
    this.#observer.dispatchEvent(new Event("disconnect"));
  }
}

const qw = Object.freeze({
  /**
   * Creates new Qw-element
   * @template {keyof HTMLElementTagNameMap} K
   * @param {K} selector
   * @returns {QwSet<HTMLElementTagNameMap[K]>}
   */
  new: (selector) => {
    const subselectors = new CssSelector(selector).subselectors;
    if (subselectors.length !== 1)
      throw new Error("Selector must contain exactly one element");

    const { tag, classList, id } = subselectors[0];
    if (!tag) throw new Error("Selector must contain tag");

    const element = createElement(tag);
    element.classList.add(...classList);
    if (id) element.id = id;

    return new QwSet([element]);
  },

  /**
   * Finds all elements that match the selector
   * @template {keyof HTMLElementTagNameMap} K
   * @param {K} selector
   * @param {HTMLElement | QwSet<HTMLElement>} root
   * @returns {QwSet<HTMLElementTagNameMap[K]>}
   */
  all: (selector, root = document) => {
    if (root instanceof QwSet) root = root[Symbol.iterator]().next().value;
    const elements = new CssSelector(selector).all(root);
    return new QwSet([...elements]);
  },

  /**
   * Finds element that matches the selector and ensures that there is only one
   * @template {keyof HTMLElementTagNameMap} K
   * @param {K} selector
   * @param {HTMLElement | QwSet<HTMLElement>} root
   * @returns {QwSet<HTMLElementTagNameMap[K]>}
   */
  one: (selector, root = document) => {
    if (root instanceof QwSet) root = root[Symbol.iterator]().next().value;
    const set = qw.all(selector, root);
    if (set.length === 0) throw new Error("Element not found");
    if (set.length > 1) throw new Error("Found multiple elements");
    return set;
  },

  /**
   * Finds all current and future elements that match the selector
   * @template {keyof HTMLElementTagNameMap} K
   * @param {K} selector
   * @param {HTMLElement | QwSet<HTMLElement>} root
   * @returns {QwDynSet<HTMLElementTagNameMap[K]>}
   *
   * # Consistency
   *
   * Future elements means elements that added to the DOM **already** satisfying the selector.
   *
   * Elements that changed to satisfy the selector will **not** be affected.
   */
  dyn: (selector, root = document) => {
    if (root instanceof QwSet) root = root[Symbol.iterator]().next().value;
    const subselectors = new CssSelector(selector).subselectors;
    if (subselectors.length !== 1)
      throw new Error("Selector must contain exactly one element");

    const { tag, classList, id } = subselectors[0];

    const eventTarget = new EventTarget();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          if (tag && node.nodeName.toLowerCase() !== tag) return;
          for (const className of classList) {
            if (!node.classList.contains(className)) return;
          }
          if (id && node.id !== id) return;

          eventTarget.dispatchEvent(new CustomEvent("add", { detail: node }));
        }
      }
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
    });

    eventTarget.addEventListener("disconnect", () => observer.disconnect());

    return new QwDynSet(qw.all(selector, root), eventTarget);
  },
});

export default qw;
