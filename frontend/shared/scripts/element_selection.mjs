class GlobalElementSelector {
  #tagListeners = new Map();
  #classListeners = new Map();
  #idListeners = new Map();
  #observer;

  constructor() {
    const tagListeners = this.#tagListeners;
    const classListeners = this.#classListeners;
    const idListeners = this.#idListeners;

    this.#observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          for (const listener of tagListeners[node.tagName] || []) {
            listener(node);
          }

          for (const className of node.classList) {
            for (const listener of classListeners[className] || []) {
              listener(node);
            }
          }

          if (node.id) {
            for (const listener of idListeners[node.id] || []) {
              listener(node);
            }
          }
        }
      }
    });

    this.#observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  forEachWithTag(tagName, listener) {
    const listeners = this.#tagListeners[tagName] || [];
    listeners.push(listener);
    this.#tagListeners[tagName] = listeners;

    for (const node of [...document.body.getElementsByTagName(tagName)]) {
      listener(node);
    }
  }

  forEachWithClass(className, listener) {
    const listeners = this.#classListeners[className] || [];
    listeners.push(listener);
    this.#classListeners[className] = listeners;

    for (const node of [...document.body.getElementsByClassName(className)]) {
      listener(node);
    }
  }

  forEachWithId(id, listener) {
    const listeners = this.#idListeners[id] || [];
    listeners.push(listener);
    this.#idListeners[id] = listeners;

    const element = document.getElementById(id);
    if (element) listener(element);
  }
}

export const globalElementSelector = new GlobalElementSelector();
