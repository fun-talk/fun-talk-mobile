import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildDeveloperRealtimeAudioSmokeFrames,
  handlePackedRealtimeTtsFrame,
} from './nativeLessonRealtimeAudioSmoke.ts';
import { unpackRealtimeWireFrame } from './nativeRealtimeAudio.ts';

describe('nativeLessonRealtimeAudioSmoke', () => {
  it('builds a packed tts smoke sequence with json boundaries and pcm payloads', () => {
    const frames = buildDeveloperRealtimeAudioSmokeFrames();

    assert.equal(frames.length >= 3, true);
    assert.deepEqual(unpackRealtimeWireFrame(frames[0]), {
      kind: 'json',
      payload: { event: 'tts_start' },
    });
    assert.deepEqual(unpackRealtimeWireFrame(frames[frames.length - 1]), {
      kind: 'json',
      payload: { event: 'tts_end' },
    });
    const pcmBytes = frames.slice(1, -1).reduce((sum, frame) => {
      const unpacked = unpackRealtimeWireFrame(frame);
      return unpacked?.kind === 'audio' ? sum + unpacked.payload.byteLength : sum;
    }, 0);
    assert.equal(pcmBytes > 0, true);
  });

  it('routes packed tts frames through shared handlers in order', async () => {
    const seen: string[] = [];
    let pcmBytes = 0;

    for (const frame of buildDeveloperRealtimeAudioSmokeFrames()) {
      const result = await handlePackedRealtimeTtsFrame(frame, {
        onTtsStart: () => {
          seen.push('tts_start');
        },
        onPcmChunk: (chunk) => {
          seen.push(`pcm:${chunk.byteLength}`);
          pcmBytes += chunk.byteLength;
        },
        onTtsEnd: () => {
          seen.push('tts_end');
        },
      });
      assert.equal(result.handled, true);
    }

    assert.equal(seen[0], 'tts_start');
    assert.equal(seen[seen.length - 1], 'tts_end');
    assert.equal(seen.slice(1, -1).every((entry) => entry.startsWith('pcm:')), true);
    assert.equal(pcmBytes > 0, true);
  });
});
