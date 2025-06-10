export default class StateManager {
  state: PlayerState = 'idle';
  onStateChange?: onStateChange;

  constructor(onStateChange?: onStateChange) {
    this.onStateChange = onStateChange;
  }

  setState(state: PlayerState) {
    this.state = state;

    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}

type onStateChange = (state: PlayerState) => void;
export type PlayerState =
  | 'idle' // Initial state before any media is loaded.
  | 'loading' // Media source is being loaded.
  | 'loaded' // Media metadata is loaded, player is ready to play.
  | 'buffering' // Playback is interrupted due to insufficient data.
  | 'playing' // Media is actively playing.
  | 'paused' // Playback is paused.
  | 'seeking' // Player is in the process of seeking.
  | 'ended' // Playback has reached the end.
  | 'error' // An error occurred.
  | 'destroyed'; // Player instance has been destroyed, no longer usable.
