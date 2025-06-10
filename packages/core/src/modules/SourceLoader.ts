import PlayerError from '@/modules/helpers/PlayerError.ts';

export default class SourceLoader {
  #url: string;
  #abortController: AbortController = new AbortController();

  constructor(url: string) {
    this.#url = url;
  }

  requestRange(byteStart: number, byteEnd: number, options?: { fullResponse: false }): Promise<ArrayBuffer>;
  requestRange(byteStart: number, byteEnd: number, options?: { fullResponse: true }): Promise<Response>;
  async requestRange(byteStart: number, byteEnd: number, options?: { fullResponse: boolean }) {
    try {
      const response = await fetch(this.#url, {
        headers: {
          Range: `bytes=${byteStart}-${byteEnd}`,
        },
        signal: this.#abortController.signal,
      });

      if (!response.ok) {
        throw new PlayerError(
          'NETWORK_ERROR',
          `Network error: ${response.status} ${response.statusText}`,
          new Error(`HTTP status: ${response.status}`),
        );
      }

      if (options?.fullResponse) {
        return response;
      }

      return await response.arrayBuffer();
    } catch (e) {
      throw new PlayerError('SOURCE_LOAD_FAILURE', `Failed to load media data: ${(e as Error).message}`, e as Error);
    }
  }
}
