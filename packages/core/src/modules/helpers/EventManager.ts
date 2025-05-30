import { PlayerEvent } from '@/types';

export default class EventManager {
  #listeners: Map<PlayerEvent, Function[]>;

  constructor() {
    this.#listeners = new Map();
  }

  on(eventType: PlayerEvent, handler: Function) {
    if (!this.#listeners.has(eventType)) {
      this.#listeners.set(eventType, []);
    }

    this.#listeners.get(eventType)!.push(handler);
  }

  off(eventType: PlayerEvent, handler: Function) {
    const handlers = this.#listeners.get(eventType);
    if (!handlers) {
      return;
    }

    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  emit(eventType: PlayerEvent, ...args: unknown[]) {
    const handlers = this.#listeners.get(eventType);
    if (!handlers) {
      return;
    }

    [...handlers].forEach((handler) => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Error in event handler for event "${eventType}":`, error);
      }
    });
  }

  removeAllListeners(eventType?: PlayerEvent) {
    if (eventType) {
      this.#listeners.delete(eventType);
    } else {
      this.#listeners.clear();
    }
  }
}
