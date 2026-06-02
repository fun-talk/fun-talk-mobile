import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createRecordingControllerState,
  reduceRecordingController,
} from './recordingController.ts';

describe('recordingController', () => {
  it('moves through permission, recording, and submitted states', () => {
    let state = createRecordingControllerState();

    state = reduceRecordingController(state, { type: 'permission_granted' });
    state = reduceRecordingController(state, { type: 'start' });
    state = reduceRecordingController(state, { type: 'metering', metering: -28, elapsedMs: 300 });
    state = reduceRecordingController(state, {
      type: 'stop',
      uri: 'file:///tmp/answer.m4a',
      durationMs: 1200,
    });
    state = reduceRecordingController(state, { type: 'submit' });

    assert.equal(state.status, 'submitted');
    assert.equal(state.recordingUri, 'file:///tmp/answer.m4a');
    assert.equal(state.hasSpeech, true);
  });

  it('keeps permission denial visible', () => {
    const state = reduceRecordingController(createRecordingControllerState(), {
      type: 'permission_denied',
    });

    assert.equal(state.status, 'permission_denied');
    assert.equal(state.errorText, '需要麦克风权限才能录音。');
  });

  it('auto stops when VAD reaches a timeout', () => {
    let state = createRecordingControllerState();

    state = reduceRecordingController(state, { type: 'permission_granted' });
    state = reduceRecordingController(state, { type: 'start' });
    state = reduceRecordingController(state, { type: 'metering', metering: -60, elapsedMs: 16000 });

    assert.equal(state.status, 'auto_stopping');
    assert.equal(state.shouldStopRecording, true);
  });
});

