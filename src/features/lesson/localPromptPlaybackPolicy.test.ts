import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldAutoPlayLocalPrompt } from './localPromptPlaybackPolicy.ts';

describe('localPromptPlaybackPolicy', () => {
  it('stays silent while realtime runtime is enabled', () => {
    assert.equal(
      shouldAutoPlayLocalPrompt({
        realtimeEnabled: true,
        realtimeStatus: 'connecting',
        hasRealtimeView: false,
      }),
      false,
    );
  });

  it('stays silent once a realtime view already exists', () => {
    assert.equal(
      shouldAutoPlayLocalPrompt({
        realtimeEnabled: false,
        realtimeStatus: 'idle',
        hasRealtimeView: true,
      }),
      false,
    );
  });

  it('allows local prompt playback only for idle non-realtime fallback mode', () => {
    assert.equal(
      shouldAutoPlayLocalPrompt({
        realtimeEnabled: false,
        realtimeStatus: 'idle',
        hasRealtimeView: false,
      }),
      true,
    );
  });
});
