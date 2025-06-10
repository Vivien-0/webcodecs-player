import type { PlayerEvent, SeekParam, VideoMetadata } from '@/types/index.ts';
import type { PlayerState } from '@/modules/helpers/StateManager.ts';
import PlayerError from '@/modules/helpers/PlayerError.ts';

/**
 * Player to Pipeline worker
 */
export type Player2PipelineEventTypePayloadMap = {
  init: { url: string };
  start: null;
  play: null;
  seek: SeekParam;
  pause: null;
  setPlaybackRate: number;
  destroy: null;
};
export type Player2PipelineData = {
  [K in keyof Player2PipelineEventTypePayloadMap]: {
    type: K;
    payload: Player2PipelineEventTypePayloadMap[K];
  };
}[keyof Player2PipelineEventTypePayloadMap];

/**
 * Pipeline worker to Player
 */
export type Pipeline2PlayerEventTypePayloadMap = {
  initialized: null;
  started: null;
  metadataLoaded: VideoMetadata;
  played: null;
  seeked: null;
  paused: null;
  videoFrameDecoded: null;
  emitPlayerEvent: {
    event: PlayerEvent;
    data?: any;
  };
  changePlayerState: PlayerState;
  error: PlayerError;
};
export type Pipeline2PlayerData = {
  [K in keyof Pipeline2PlayerEventTypePayloadMap]: {
    type: K;
    payload: Pipeline2PlayerEventTypePayloadMap[K];
  };
}[keyof Pipeline2PlayerEventTypePayloadMap];
