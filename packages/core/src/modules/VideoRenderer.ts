import { VideoMetadata } from '@/types';

export default class VideoRenderer {
  #videoMetaData: VideoMetadata;
  #canvas: CanvasRenderingContext2D;

  constructor(containerElement: HTMLElement, metadata: VideoMetadata) {
    const canvasElement = document.createElement('canvas');

    canvasElement.width = metadata.width * window.devicePixelRatio;
    canvasElement.height = metadata.height * window.devicePixelRatio;
    canvasElement.style.width = `${metadata.width}px`;
    canvasElement.style.height = `${metadata.height}px`;
    containerElement.appendChild(canvasElement);
    this.#videoMetaData = metadata;
    this.#canvas = canvasElement.getContext('2d')!;
  }

  renderVideoFrame(videoFrame: VideoFrame) {
    console.log('render video frame', videoFrame);
    this.#canvas.drawImage(videoFrame, 0, 0, this.#videoMetaData.width, this.#videoMetaData.height);
    videoFrame.close();
  }
}
