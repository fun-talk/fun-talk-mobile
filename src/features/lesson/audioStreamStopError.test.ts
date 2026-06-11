import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isIgnorableAudioStreamStopError } from './audioStreamStopError.ts';

describe('audioStreamStopError', () => {
  it('ignores already released expo-audio stream stop errors', () => {
    assert.equal(
      isIgnorableAudioStreamStopError(
        new Error(
          "Call to function 'AudioStream.stop' has been rejected. Caused by: Cannot use shared object that was already released",
        ),
      ),
      true,
    );
  });

  it('ignores invalid cast expo-audio stream stop errors emitted after release', () => {
    assert.equal(
      isIgnorableAudioStreamStopError(
        new Error(
          'The 1st argument cannot be cast to type class expo.modules.audio.AudioStream (received class java.lang.Integer)',
        ),
      ),
      true,
    );
  });

  it('preserves non-release audio stream stop errors', () => {
    assert.equal(
      isIgnorableAudioStreamStopError(new Error('microphone permission missing')),
      false,
    );
  });
});
