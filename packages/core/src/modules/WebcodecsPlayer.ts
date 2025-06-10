import Pipeline from '@/modules/Pipeline.ts';
import EventManager from '@/modules/helpers/EventManager.ts';
import StateManager from '@/modules/helpers/StateManager.ts';
import type { PlayerEvent, SeekParam, VideoMetadata } from '@/types';
import PlayerError from '@/modules/helpers/PlayerError.ts';

export default class WebcodecsPlayer {
  #playerConfig: PlayerConfig;
  #pipeline: Pipeline;
  #stateManager: StateManager = new StateManager();
  #eventManager: EventManager = new EventManager();

  metadata: VideoMetadata | null = null;

  constructor(options: PlayerOptions) {
    const { url, containerElement, playerConfig = {} } = options;

    this.#playerConfig = playerConfig;
    this.#pipeline = new Pipeline(
      { containerElement, url },
      {
        eventManager: this.#eventManager,
        stateManager: this.#stateManager,
        onLoadMetadata: (metaData) => (this.metadata = metaData),
        onError: (playerError) => this.#handleError(playerError),
      },
    );

    this.#load();
  }

  async #load() {
    try {
      this.#stateManager.setState('loading');
      await this.#pipeline.start();
      this.#stateManager.setState('loaded');

      if (this.#playerConfig.autoplay) {
        this.play();
      }
    } catch (e) {
      console.error(e);
      this.#stateManager.setState('error');
    }
  }

  #handleError(error: PlayerError) {
    console.error(`[PlayerError] ${error.code}: ${error.message}`, error.originalError);
    this.#stateManager.setState('error');
    this.#eventManager.emit('error', error);
  }

  async play() {
    await this.#pipeline.play();
    this.#stateManager.setState('playing');
  }

  pause() {
    this.#stateManager.setState('paused');
  }

  async seek(param: SeekParam) {
    this.#stateManager.setState('seeking');
    this.#pipeline.seek(param);
  }

  destroy() {
    this.#pipeline.stop();
    this.#stateManager.setState('destroyed');
  }

  setVolume(volume: number) {
    const vol = Math.max(0, Math.min(volume, 1));
    this.#pipeline.setVolume(vol);
  }

  setMuted(muted: boolean) {
    this.#pipeline.setMuted(muted);
  }

  on(event: PlayerEvent, handler: Function): void {
    this.#eventManager.on(event, handler);
  }

  off(event: PlayerEvent, handler: Function): void {
    this.#eventManager.off(event, handler);
  }
}

export interface PlayerOptions {
  url: string;
  containerElement: HTMLElement;
  playerConfig?: PlayerConfig;
}

interface PlayerConfig {
  autoplay?: boolean;
}
