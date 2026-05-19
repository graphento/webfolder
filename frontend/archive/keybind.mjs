// TODO: Input elements safety,
// dont forget dont prevent event if no listeners

class KeyBindManager {
  #ctrlShiftKeybinds = new Map();
  #ctrlKeybinds = new Map();
  #shiftKeybinds = new Map();
  #singleKeybinds = new Map();

  constructor() {
    const ctrlShiftKeybinds = this.#ctrlShiftKeybinds;
    const ctrlKeybinds = this.#ctrlKeybinds;
    const shiftKeybinds = this.#shiftKeybinds;
    const singleKeybinds = this.#singleKeybinds;

    document.addEventListener("keydown", (event) => {
      const isCtrl = event.ctrlKey || event.metaKey;
      const isShift = event.shiftKey;

      const binds = isCtrl
        ? isShift
          ? ctrlShiftKeybinds
          : ctrlKeybinds
        : isShift
          ? shiftKeybinds
          : singleKeybinds;

      const listeners = binds[event.code] || [];
      if (listeners.length > 0) {
        event.preventDefault();
      }

      for (const listener of listeners) {
        listener();
      }
    });
  }

  bindCtrlShift(key, listener) {
    const listeners = this.#ctrlShiftKeybinds[key] || [];
    listeners.push(listener);
    this.#ctrlShiftKeybinds[key] = listeners;
  }

  bindCtrl(key, listener) {
    const listeners = this.#ctrlKeybinds[key] || [];
    listeners.push(listener);
    this.#ctrlKeybinds[key] = listeners;
  }

  bindShift(key, listener) {
    const listeners = this.#shiftKeybinds[key] || [];
    listeners.push(listener);
    this.#shiftKeybinds[key] = listeners;
  }

  bindSingle(key, listener) {
    const listeners = this.#singleKeybinds[key] || [];
    listeners.push(listener);
    this.#singleKeybinds[key] = listeners;
  }
}

export const keybindManager = new KeyBindManager();
