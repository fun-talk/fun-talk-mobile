import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createSimpleVadState,
  reduceSimpleVad,
} from './simpleVad.ts';

describe('simpleVad', () => {
  it('detects speech after consecutive samples above threshold', () => {
    let state = createSimpleVadState();

    state = reduceSimpleVad(state, { metering: -42, elapsedMs: 100 });
    assert.equal(state.status, 'silence');

    state = reduceSimpleVad(state, { metering: -30, elapsedMs: 200 });
    state = reduceSimpleVad(state, { metering: -29, elapsedMs: 300 });

    assert.equal(state.status, 'speech');
    assert.equal(state.hasSpeech, true);
  });

  it('ignores one loud sample before speech is established', () => {
    let state = createSimpleVadState();

    state = reduceSimpleVad(state, { metering: -27, elapsedMs: 100 });
    state = reduceSimpleVad(state, { metering: -58, elapsedMs: 300 });

    assert.equal(state.status, 'silence');
    assert.equal(state.hasSpeech, false);
    assert.equal(state.shouldAutoSubmit, false);
  });

  it('marks silence timeout after speech ends', () => {
    let state = createSimpleVadState({ silenceTimeoutMs: 500 });

    state = reduceSimpleVad(state, { metering: -25, elapsedMs: 100 });
    state = reduceSimpleVad(state, { metering: -24, elapsedMs: 200 });
    state = reduceSimpleVad(state, { metering: -55, elapsedMs: 500 });
    state = reduceSimpleVad(state, { metering: -56, elapsedMs: 800 });

    assert.equal(state.status, 'silence_timeout');
    assert.equal(state.hasSpeech, true);
  });

  it('marks max duration timeout even without speech', () => {
    const state = reduceSimpleVad(
      createSimpleVadState({ maxDurationMs: 1000 }),
      { metering: -60, elapsedMs: 1200 },
    );

    assert.equal(state.status, 'max_duration');
    assert.equal(state.shouldAutoSubmit, true);
  });
});
