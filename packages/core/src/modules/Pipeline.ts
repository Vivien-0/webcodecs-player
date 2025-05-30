import Demuxer from '@/modules/Demuxer.ts';
import EventManager from '@/modules/helpers/EventManager.ts';
import SourceLoader from '@/modules/SourceLoader.ts';
import type { onPlayerError, SeekParam } from '@/types';
import CoreVideoDecoder from '@/modules/CoreVideoDecoder.ts';
import VideoRenderer from '@/modules/VideoRenderer.ts';
import type { MP4Info } from 'mp4box';
import StateManager from '@/modules/helpers/StateManager.ts';
import PlayerError from '@/modules/helpers/PlayerError.ts';

interface PipelineConfig {
  containerElement: HTMLElement;
  url: string;
}

export default class Pipeline {
  #config: PipelineConfig;
  #stateManager: StateManager;
  #eventManager: EventManager;
  #onError: onPlayerError;
  #sourceLoader: SourceLoader;
  #demuxer: Demuxer;
  #videoDecoder!: CoreVideoDecoder;
  #videoRenderer: VideoRenderer;

  #videoMetaData!: MP4Info;
  #decodingQueueSize = 0;
  #encodedVideoChunks: EncodedVideoChunk[] = [];
  #videoFrameQueue: VideoFrame[] = [];

  readonly maxVideoFrameCount = 10;
  readonly maxBufferCount = 20; // due to I,P,B frame, maxBufferCount shoule be larger than maxVideoFrameCount

  constructor(
    config: PipelineConfig,
    {
      stateManager,
      eventManager,
      onError,
    }: {
      stateManager: StateManager;
      eventManager: EventManager;
      onError: onPlayerError;
    },
  ) {
    this.#config = config;
    this.#stateManager = stateManager;
    this.#eventManager = eventManager;
    this.#onError = onError;
    this.#sourceLoader = new SourceLoader(this.#config.url);
    this.#demuxer = new Demuxer(this.#sourceLoader, { onError: this.#onError.bind(this) });
    this.#videoRenderer = new VideoRenderer(this.#config.containerElement);
  }

  async start() {
    try {
      this.#eventManager.emit('loadstart');
      const mediaInfo = await this.#demuxer.loadMetadata();
      this.#stateManager.setState('loaded');

      this.#videoDecoder = new CoreVideoDecoder({
        decoderConfig: {
          codec: mediaInfo.video.decoderConfig.codec,
        },
        onVideoFrameOutput: () => {},
        onError: this.#onError.bind(this),
      });
      console.log(this.#videoDecoder, mediaInfo);
    } catch (e) {
      this.#onError(e as PlayerError);
      this.stop();
    }
  }

  pause() {}

  resume() {}

  seek(param: SeekParam) {
    console.log(param);
  }

  async #schedule() {
    while (true) {
      if (
        this.#decodingQueueSize + this.#videoFrameQueue.length < this.maxBufferCount &&
        this.#videoFrameQueue.length < this.maxVideoFrameCount
      ) {
        if (this.#encodedVideoChunks.length) {
          const encodedVideoChunk = this.#encodedVideoChunks.shift()!;
          this.#videoDecoder.decode(encodedVideoChunk);
        } else {
          // await this.#sourceLoader.requestRange();
        }
      } else {
        break;
      }
    }
  }

  stop() {}

  setVolume(volume: number) {
    console.log(volume);
  }

  setMuted(muted: boolean) {
    console.log(muted);
  }

  setPlaybackRate(rate: number) {}
}
