import {
  packRealtimeAudioFrame,
  packRealtimeJsonFrame,
  unpackRealtimeWireFrame,
} from './nativeRealtimeAudio';
import { normalizeRealtimeLessonEvent } from './nativeLessonSessionProtocol';

type PackedRealtimeTtsHandlers = {
  onTtsStart: () => Promise<unknown> | unknown;
  onPcmChunk: (chunk: Uint8Array) => Promise<unknown> | unknown;
  onTtsEnd: () => Promise<unknown> | unknown;
};

type PackedRealtimeTtsFrameResult = {
  handled: boolean;
  jsonPayload?: Record<string, unknown>;
};

const SMOKE_TONE_SAMPLE_RATE = 24_000;
const SMOKE_TONE_FREQUENCY = 660;
const SMOKE_TONE_DURATION_MS = 320;
const SMOKE_TONE_AMPLITUDE = 0.32;
const SMOKE_CHUNK_COUNT = 3;

function createSmokeTonePcm(): Uint8Array {
  const sampleCount = Math.round((SMOKE_TONE_SAMPLE_RATE * SMOKE_TONE_DURATION_MS) / 1000);
  const bytes = new Uint8Array(sampleCount * 2);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < sampleCount; index += 1) {
    const radians = (2 * Math.PI * SMOKE_TONE_FREQUENCY * index) / SMOKE_TONE_SAMPLE_RATE;
    const sample = Math.round(Math.sin(radians) * 32767 * SMOKE_TONE_AMPLITUDE);
    view.setInt16(index * 2, sample, true);
  }
  return bytes;
}

export function buildDeveloperRealtimeAudioSmokeFrames(): ArrayBuffer[] {
  const pcm = createSmokeTonePcm();
  const chunkSize = Math.ceil(pcm.byteLength / SMOKE_CHUNK_COUNT);
  const chunks: ArrayBuffer[] = [];
  for (let index = 0; index < pcm.byteLength; index += chunkSize) {
    chunks.push(packRealtimeAudioFrame(pcm.slice(index, index + chunkSize)));
  }
  return [
    packRealtimeJsonFrame({ event: 'tts_start' }),
    ...chunks,
    packRealtimeJsonFrame({ event: 'tts_end' }),
  ];
}

export async function handlePackedRealtimeTtsFrame(
  data: unknown,
  handlers: PackedRealtimeTtsHandlers,
): Promise<PackedRealtimeTtsFrameResult> {
  const wireFrame = unpackRealtimeWireFrame(data);
  if (!wireFrame) {
    return { handled: false };
  }

  if (wireFrame.kind === 'audio') {
    await handlers.onPcmChunk(wireFrame.payload);
    return { handled: true };
  }

  const event = normalizeRealtimeLessonEvent(wireFrame.payload);
  if (event?.event === 'tts_start') {
    await handlers.onTtsStart();
    return { handled: true, jsonPayload: wireFrame.payload };
  }
  if (event?.event === 'tts_end') {
    await handlers.onTtsEnd();
    return { handled: true, jsonPayload: wireFrame.payload };
  }

  return { handled: false, jsonPayload: wireFrame.payload };
}
