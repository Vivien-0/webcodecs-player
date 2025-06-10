import PlayerError from '@/modules/helpers/PlayerError.ts';

export type PlayerEvent =
  /**
   * Loading Events
   */
  | 'loadstart' // Triggered when the load process begins (e.g., when load() is called).
  | 'loadedmetadata' // Triggered when media metadata (duration, dimensions, tracks) is loaded.
  | 'loadeddata' // Triggered when the first frame of the media has finished loading. (Corresponds to LOADED state)
  | 'canplay' // Triggered when the player has enough data to play.

  /**
   * Playback State Events
   */
  | 'playing' // Triggered when playback has actually started or resumed after pausing/buffering/seeking. (Corresponds to PLAYING state)
  | 'paused' // Triggered when playback has actually paused. (Corresponds to PAUSED state)
  | 'waiting' // Triggered when playback is stopped because the player is waiting for more data. (Corresponds to BUFFERING state)
  | 'seeked' // Triggered when a seek operation is finished and the player has found a new position.

  /**
   * Playback Completion/Error Events
   */
  | 'ended' // Triggered when playback reaches the end of the media. (Corresponds to ENDED state)
  | 'error' // Triggered when an error occurs during loading or playback. (Corresponds to ERROR state)

  /**
   * Player Lifecycle Events
   */
  | 'destroy'; // Triggered when the player instance is being destroyed.

export interface SeekParam {
  type: 'time' | 'frameIndex';
  value: number;
}

export type onPlayerError = (err: PlayerError) => void;

export type VideoMetadata = Readonly<{
  width: number;
  height: number;
  duration: number;
  totalFrames: number;
  fps: number;
  bitrate: number;
}>;

export type VideoSamples = Array<{
  number: number;
  isKeyFrame: boolean;
  cts: number;
  duration: number;
  timescale: number;
  offset: number;
  size: number;
}>;

export type MediaInfo = {
  video: {
    metadata: VideoMetadata;
    decoderConfig: {
      codec: string;
      description: ArrayBuffer;
    };
  };
  audio?: {
    metadata: { bitrate: number; duration: number };
    decoderConfig: {
      codec: string;
    };
  };
};
