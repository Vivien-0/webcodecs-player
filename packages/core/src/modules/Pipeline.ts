import Demuxer from '@/modules/Demuxer.ts';
import SourceLoader from '@/modules/SourceLoader.ts';
import type { SeekParam, VideoMetadata } from '@/types';
import CoreVideoDecoder from '@/modules/CoreVideoDecoder.ts';
import PlayerError from '@/modules/helpers/PlayerError.ts';
import { Pipeline2PlayerData } from '@/types/worker.ts';

interface PipelineConfig {
  url: string;
}

export default class Pipeline {
  #config: PipelineConfig;
  #worker: DedicatedWorkerGlobalScope;
  #sourceLoader: SourceLoader;
  #demuxer: Demuxer;
  #videoDecoder!: CoreVideoDecoder;

  #videoMetadata!: VideoMetadata;
  #decodingQueueSize = 0;
  #encodedVideoChunks: EncodedVideoChunk[] = [];
  #videoFrameQueue: VideoFrame[] = [];
  #curVideoFrameNum = 0;

  #isScheduling = false;

  readonly maxVideoFrameCount = 10;
  readonly maxBufferCount = 20; // due to I,P,B frame, maxBufferCount shoule be larger than maxVideoFrameCount

  constructor(config: PipelineConfig, worker: DedicatedWorkerGlobalScope) {
    this.#config = config;
    this.#worker = worker;
    this.#sourceLoader = new SourceLoader(this.#config.url);
    this.#demuxer = new Demuxer(this.#sourceLoader, { onError: (playerError) => this.#onError(playerError) });
  }

  #postmessage2Player(data: Pipeline2PlayerData) {
    this.#worker.postMessage(data);
  }

  async start() {
    try {
      this.#postmessage2Player({ type: 'emitPlayerEvent', payload: { event: 'loadstart' } });
      const { video, audio } = await this.#demuxer.loadMetadata();
      this.#videoMetadata = video.metadata;
      this.#postmessage2Player({ type: 'metadataLoaded', payload: video.metadata });
      this.#postmessage2Player({ type: 'emitPlayerEvent', payload: { event: 'loadstart', data: video.metadata } });
      this.#postmessage2Player({ type: 'changePlayerState', payload: 'loaded' });

      this.#videoDecoder = new CoreVideoDecoder({
        decoderConfig: video.decoderConfig,
        onVideoFrameOutput: (videoFrame) => {
          this.#decodingQueueSize--;
          this.#videoFrameQueue.push(videoFrame);
          this.#schedule();
        },
        onError: (playerError) => this.#onError(playerError),
      });
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

  #onError(error: PlayerError) {
    this.#postmessage2Player({ type: 'error', payload: error });
  }

  async play() {
    this.#schedule();

    setInterval(() => {
      const videoFrame = this.#videoFrameQueue.shift();

      if (videoFrame) {
        this.#curVideoFrameNum++;
      }

      this.#schedule();
    }, 1000 / this.#videoMetadata.fps);
  }

  pause() {}

  resume() {}

  seek(param: SeekParam) {}

  stop() {}

  setPlaybackRate(rate: number) {}
}
