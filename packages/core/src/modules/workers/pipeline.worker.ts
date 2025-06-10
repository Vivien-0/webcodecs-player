import Pipeline from '@/modules/Pipeline.ts';
import { Player2PipelineData } from '@/types/worker.ts';

let pipeline: Pipeline;

self.onmessage = async (event) => {
  const { type, payload } = event.data as Player2PipelineData;

  switch (type) {
    case 'init': {
      pipeline = new Pipeline({ url: payload.url }, self as DedicatedWorkerGlobalScope);
      break;
    }
    case 'start': {
      break;
    }
    case 'play': {
      break;
    }
    case 'seek': {
      break;
    }
    case 'pause': {
      break;
    }
    case 'setPlaybackRate': {
      break;
    }
    case 'destroy': {
      break;
    }
    default:
      break;
  }
};
