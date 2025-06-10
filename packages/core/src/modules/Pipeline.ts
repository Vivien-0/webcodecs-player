import Demuxer from '@/modules/Demuxer.ts';
import EventManager from '@/modules/helpers/EventManager.ts';
import SourceLoader from '@/modules/SourceLoader.ts';
import type { onPlayerError, SeekParam, VideoMetadata, VideoSamples } from '@/types';
import CoreVideoDecoder from '@/modules/CoreVideoDecoder.ts';
import VideoRenderer from '@/modules/VideoRenderer.ts';
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
  #onLoadMetadata: (metaData: VideoMetadata) => void;
  #onError: onPlayerError;
  #sourceLoader: SourceLoader;
  #demuxer: Demuxer;
  #videoDecoder!: CoreVideoDecoder;
  #videoRenderer!: VideoRenderer;

  #videoMetadata!: VideoMetadata;
  #decodingQueueSize = 0;
  #encodedVideoChunks: EncodedVideoChunk[] = [];
  #videoFrameQueue: VideoFrame[] = [];
  #curVideoFrameNum = 0;

  #isScheduling = false;

  readonly maxVideoFrameCount = 10;
  readonly maxBufferCount = 20; // due to I,P,B frame, maxBufferCount shoule be larger than maxVideoFrameCount

  constructor(
    config: PipelineConfig,
    {
      stateManager,
      eventManager,
      onLoadMetadata,
      onError,
    }: {
      stateManager: StateManager;
      eventManager: EventManager;
      onLoadMetadata: (metaData: VideoMetadata) => void;
      onError: onPlayerError;
    },
  ) {
    this.#config = config;
    this.#stateManager = stateManager;
    this.#eventManager = eventManager;
    this.#onLoadMetadata = onLoadMetadata;
    this.#onError = onError;
    this.#sourceLoader = new SourceLoader(this.#config.url);
    this.#demuxer = new Demuxer(this.#sourceLoader, { onError: this.#onError.bind(this) });
  }

  async start() {
    try {
      this.#eventManager.emit('loadstart');
      const { video, audio } = await this.#demuxer.loadMetadata();
      this.#videoMetadata = video.metadata;
      this.#onLoadMetadata(video.metadata);
      this.#eventManager.emit('loadedmetadata', video.metadata);
      this.#stateManager.setState('loaded');

      this.#videoDecoder = new CoreVideoDecoder({
        decoderConfig: video.decoderConfig,
        onVideoFrameOutput: (videoFrame) => {
          this.#decodingQueueSize--;
          this.#videoFrameQueue.push(videoFrame);
          this.#schedule();
        },
        onError: (playerError) => this.#onError(playerError),
      });
      this.#videoRenderer = new VideoRenderer(this.#config.containerElement, this.#videoMetadata);
      this.#encodedVideoChunks = await this.#demuxer.getEncodedVideoChunks();
    } catch (e) {
      this.#onError(e as PlayerError);
      this.stop();
    }
  }

  async #schedule() {
    if (this.#isScheduling) return;

    this.#isScheduling = true;

    while (this.#isScheduling) {
      if (
        this.#decodingQueueSize + this.#videoFrameQueue.length < this.maxBufferCount &&
        this.#videoFrameQueue.length < this.maxVideoFrameCount
      ) {
        if (this.#encodedVideoChunks.length) {
          const encodedVideoChunk = this.#encodedVideoChunks.shift()!;

          this.#decodingQueueSize++;
          this.#videoDecoder.decode(encodedVideoChunk);
        } else {
          this.#encodedVideoChunks = await this.#demuxer.getEncodedVideoChunks();
        }
      } else {
        this.#isScheduling = false;
        break;
      }
    }
  }

  async play() {
    this.#schedule();

    setInterval(() => {
      const videoFrame = this.#videoFrameQueue.shift();

      if (videoFrame) {
        this.#videoRenderer.renderVideoFrame(videoFrame);
        this.#curVideoFrameNum++;
      }

      this.#schedule();
    }, 1000 / this.#videoMetadata.fps);
  }

  pause() {}

  resume() {}

  seek(param: SeekParam) {
    console.log(param);
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
