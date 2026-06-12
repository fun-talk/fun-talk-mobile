import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  concatAudioChunks,
  createPcm16WavBytes,
  packRealtimeAudioFrame,
  packRealtimeJsonFrame,
  unpackRealtimeWireFrame,
} from './nativeRealtimeAudio.ts';

describe('nativeRealtimeAudio', () => {
  it('unpacks server JSON wire frames', () => {
    const frame = unpackRealtimeWireFrame(packRealtimeJsonFrame({ event: 'tts_end' }));

    assert.equal(frame?.kind, 'json');
    assert.deepEqual(frame?.payload, { event: 'tts_end' });
  });

  it('unpacks server PCM audio wire frames', () => {
    const pcm = new Uint8Array([1, 0, 2, 0]);
    const frame = unpackRealtimeWireFrame(packRealtimeAudioFrame(pcm));

    assert.equal(frame?.kind, 'audio');
    assert.deepEqual([...(frame?.payload ?? [])], [1, 0, 2, 0]);
  });

  it('concats PCM chunks and wraps them in a playable WAV file', () => {
    const pcm = concatAudioChunks([
      new Uint8Array([1, 0]),
      new Uint8Array([2, 0]),
    ]);
    const wav = createPcm16WavBytes(pcm, { sampleRate: 24000, channels: 1 });
    const textHeader = new TextDecoder().decode(wav.slice(0, 4));
    const waveHeader = new TextDecoder().decode(wav.slice(8, 12));
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);

    assert.equal(textHeader, 'RIFF');
    assert.equal(waveHeader, 'WAVE');
    assert.equal(view.getUint32(24, true), 24000);
    assert.equal(view.getUint16(34, true), 16);
    assert.equal(view.getUint32(40, true), 4);
  });
});
