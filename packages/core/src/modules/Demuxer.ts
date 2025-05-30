import SourceLoader from '@/modules/SourceLoader.ts';
import * as MP4Box from 'mp4box';
import type { MediaInfo, onPlayerError } from '@/types';
import type { MP4ArrayBuffer, MP4Info } from 'mp4box';
import PlayerError from '@/modules/helpers/PlayerError.ts';

export default class Demuxer {
  #sourceLoader: SourceLoader;
  #totalFileSize!: number;

  #onError: onPlayerError;

  constructor(sourceLoader: SourceLoader, { onError }: { onError: onPlayerError }) {
    this.#sourceLoader = sourceLoader;
    this.#onError = onError;
  }

  async loadMetadata(): Promise<MediaInfo> {
    try {
      const { ftypBuffer, moovBoxInfo } = await this.#getBoxInfo();
      const mp4boxFile = MP4Box.createFile();
      const moovBuffer = (await this.#sourceLoader.requestRange(moovBoxInfo!.start, moovBoxInfo!.end)) as ArrayBuffer;
      const moovInfo = await new Promise<MP4Info>((resolve, reject) => {
        mp4boxFile.onReady = (moovInfo) => resolve(moovInfo);
        mp4boxFile.onError = (e) => {
          reject(new PlayerError('DEMUX_ERROR', `MP4 demuxing failed: ${e}`, new Error(e)));
        };

        (ftypBuffer as MP4ArrayBuffer).fileStart = 0;
        (moovBuffer as MP4ArrayBuffer).fileStart = ftypBuffer.byteLength;
        mp4boxFile.appendBuffer(ftypBuffer as MP4ArrayBuffer);
        mp4boxFile.appendBuffer(moovBuffer as MP4ArrayBuffer);
      });
      const videoTrack = moovInfo.tracks.find((track) => track.type === 'video');
      const audioTrack = moovInfo.tracks.find((track) => track.type === 'audio');
      const rawVideoTrack = mp4boxFile.moov.traks.find((trak: any) => trak.mdia.hdlr.handler === 'vide');
      const rawAudioTrack = mp4boxFile.moov.traks.find((trak: any) => trak.mdia.hdlr.handler === 'soun');

      if (!videoTrack || !rawVideoTrack) {
        const missingVideoTrackError = new Error('missing video track');
        throw new PlayerError('DEMUX_ERROR', `MP4 demuxing failed: ${missingVideoTrackError}`, missingVideoTrackError);
      }

      const {
        track_width: width,
        track_height: height,
        bitrate,
        nb_samples: totalFrames,
        timescale,
        duration,
        codec,
      } = videoTrack;
      const { start, size } = rawVideoTrack.mdia.minf.stbl.stsd.entries[0].avcC;
      const description = mp4boxFile.stream.buffers[0]?.slice(start, start + size).slice(8);

      const mediaInfo: MediaInfo = {
        video: {
          metadata: {
            width,
            height,
            duration: duration / timescale,
            totalFrames,
            fps: totalFrames / (duration / timescale),
            bitrate,
          },
          decoderConfig: {
            codec,
            description,
          },
          samples: rawVideoTrack.samples.map(
            ({ number: index, is_sync: isKeyFrame, cts, duration, timescale, offset, size }) => ({
              index,
              isKeyFrame,
              cts,
              duration,
              timescale,
              offset,
              size,
            }),
          ),
        },
      };

      // if (audioTrack && rawAudioTrack) {
      // }

      return mediaInfo;
    } catch (e) {
      if (!(e instanceof PlayerError)) {
        throw new PlayerError('DEMUX_ERROR', `MP4 demuxing failed: ${e}`, e as Error);
      }

      throw e;
    }
  }

  async #getBoxInfo() {
    try {
      const response = (await this.#sourceLoader.requestRange(0, 1023, { fullResponse: true })) as Response;
      const totalSize = +response.headers.get('content-range')!.split('/')[1].trim();
      const arrayBuffer = await response.arrayBuffer();
      const dataView = new DataView(arrayBuffer);
      const MOOV_TYPE = 'moov';
      const MDAT_TYPE = 'mdat';
      const ftypSize = new DataView(arrayBuffer.slice(0, 4)).getUint32(0);
      const ftypBuffer = arrayBuffer.slice(0, ftypSize);
      const boxesInfo: {
        ftypBuffer: ArrayBuffer;
        moovBoxInfo: { start: number; end: number } | null;
      } = {
        ftypBuffer,
        moovBoxInfo: null,
      };
      const getCharByByteIdx = (byteIdx: number) => String.fromCharCode(dataView.getUint8(byteIdx));

      this.#totalFileSize = totalSize;

      for (let i = 0; i < dataView.byteLength; i++) {
        const char = getCharByByteIdx(i);

        if (char === MOOV_TYPE[0]) {
          const nextChar = getCharByByteIdx(i + 1);

          if (nextChar === MOOV_TYPE[1]) {
            if (getCharByByteIdx(i + 2) === MOOV_TYPE[2] && getCharByByteIdx(i + 3) === MOOV_TYPE[3]) {
              boxesInfo.moovBoxInfo = {
                start: i - 4,
                end: i - 4 + new DataView(arrayBuffer.slice(i - 4, i)).getUint32(0) - 1,
              };
              break;
            }
          } else if (nextChar === MDAT_TYPE[1]) {
            if (getCharByByteIdx(i + 2) === MDAT_TYPE[2] && getCharByByteIdx(i + 3) === MDAT_TYPE[3]) {
              boxesInfo.moovBoxInfo = {
                start: i - 4 + new DataView(arrayBuffer.slice(i - 4, i)).getUint32(0),
                end: totalSize - 1,
              };
              break;
            }
          }
        }
      }

      if (!boxesInfo.moovBoxInfo) {
        throw new PlayerError('DEMUX_ERROR', 'Moov box not found', new Error('Moov box not found'));
      }

      return boxesInfo;
    } catch (e) {
      throw new PlayerError('DEMUX_ERROR', 'Mp4box parse error', e as Error);
    }
  }

  seek(frameIndex: number) {}
}
