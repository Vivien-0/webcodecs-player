export default class PlayerError extends Error {
  name = 'PlayerError';
  code: PlayerErrorCode;
  originalError?: Error;

  constructor(code: PlayerErrorCode, message: string, originalError?: Error) {
    super(message);
    this.code = code;
    this.originalError = originalError;
  }
}

type PlayerErrorCode =
  | 'UNKNOWN_ERROR'
  | 'NETWORK_ERROR'
  | 'SOURCE_LOAD_FAILURE'
  | 'DEMUX_ERROR'
  | 'VIDEO_DECODE_ERROR'
  | 'AUDIO_DECODE_ERROR';
