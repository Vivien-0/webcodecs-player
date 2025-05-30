import { onPlayerError } from '@/types';
import PlayerError from '@/modules/helpers/PlayerError.ts';

export default class CoreVideoDecoder {
  #videoDecoder: VideoDecoder;

  constructor({
    decoderConfig,
    onVideoFrameOutput,
    onError,
  }: {
    decoderConfig: VideoDecoderConfig;
    onVideoFrameOutput: (videoFrame: VideoFrame) => void;
    onError: onPlayerError;
  }) {
    this.#videoDecoder = new VideoDecoder({
      output: (videoFrame) => {
        onVideoFrameOutput(videoFrame);
      },
      error: (e) => {
        onError(new PlayerError('VIDEO_DECODE_ERROR', `MP4 decode failed: ${e}`, e));
      },
    });
    this.#videoDecoder.configure(decoderConfig);
  }

  decode(encodedVideoChunk: EncodedVideoChunk) {
    this.#videoDecoder.decode(encodedVideoChunk);
  }
}
