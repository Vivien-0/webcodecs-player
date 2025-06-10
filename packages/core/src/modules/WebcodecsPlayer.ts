import EventManager from '@/modules/helpers/EventManager.ts';
import StateManager from '@/modules/helpers/StateManager.ts';
import type { PlayerEvent, SeekParam, VideoMetadata } from '@/types';
import PlayerError from '@/modules/helpers/PlayerError.ts';
import VideoRenderer from '@/modules/VideoRenderer.ts';
import { Pipeline2PlayerData, Player2PipelineData } from '@/types/worker.ts';

export default class WebcodecsPlayer {
  #playerOptions: PlayerOptions;
  #pipelineWorker: Worker;
  #stateManager: StateManager = new StateManager();
  #eventManager: EventManager = new EventManager();

  #videoRenderer!: VideoRenderer;

  metadata: VideoMetadata | null = null;

  constructor(options: PlayerOptions) {
    this.#playerOptions = options;
    this.#pipelineWorker = new Worker(new URL('./workers/pipeline.worker.ts', import.meta.url));
    this.#postmessage2Worker({
      type: 'init',
      payload: { url: options.url },
    });
    this.#onmessageFromWorker();
    this.#load();
  }

  #postmessage2Worker(data: Player2PipelineData) {
    this.#pipelineWorker.postMessage(data);
  }

  #onmessageFromWorker() {
    this.#pipelineWorker.onmessage = (event) => {
      const { type, payload } = event.data as Pipeline2PlayerData;

      switch (type) {
        case 'initialized': {
          break;
        }
        case 'started': {
          break;
        }
        case 'metadataLoaded': {
          this.#videoRenderer = new VideoRenderer(this.#playerOptions.containerElement, payload);
          break;
        }
        case 'played': {
          break;
        }
        case 'seeked': {
          break;
        }
        case 'paused': {
          break;
        }
        case 'videoFrameDecoded': {
          break;
        }
        case 'emitPlayerEvent': {
          break;
        }
        case 'changePlayerState': {
          break;
        }
        case 'error': {
          break;
        }
        default:
          break;
      }
    };
  }

  async #load() {
    try {
      this.#stateManager.setState('loading');
      this.#postmessage2Worker({
        type: 'start',
        payload: null,
      });
      this.#stateManager.setState('loaded');

      if (this.#playerOptions.playerConfig?.autoplay) {
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
    this.#postmessage2Worker({
      type: 'play',
      payload: null,
    });
    this.#stateManager.setState('playing');
  }

  pause() {
    this.#stateManager.setState('paused');
  }

  async seek(param: SeekParam) {
    this.#stateManager.setState('seeking');
    this.#postmessage2Worker({
      type: 'seek',
      payload: param,
    });
  }

  destroy() {
    this.#postmessage2Worker({
      type: 'destroy',
      payload: null,
    });
    this.#stateManager.setState('destroyed');
  }

  setVolume(volume: number) {
    const vol = Math.max(0, Math.min(volume, 1));
  }

  setMuted(muted: boolean) {}

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
