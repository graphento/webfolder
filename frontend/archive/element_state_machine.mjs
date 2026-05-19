export class ElementStateMachine {
  #state;
  #element;

  constructor(element, initialState) {
    this.#element = element;
    this.#state = initialState;
    element.classList.add(initialState);
  }

  get state() {
    return this.#state;
  }

  set state(state) {
    this.#element.classList.remove(this.#state);
    this.#state = state;
    this.#element.classList.add(this.#state);
  }
}
