import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldPlayChatEndedSpeech } from './chatEndedPlayback.ts';

describe('chatEndedPlayback', () => {
  it('skips chat_ended playback while the step is still in assistant_turn', () => {
    assert.equal(
      shouldPlayChatEndedSpeech({ currentLifecycle: 'assistant_turn' }),
      false,
    );
  });

  it('allows chat_ended playback once the step is waiting for the user', () => {
    assert.equal(
      shouldPlayChatEndedSpeech({ currentLifecycle: 'waiting_user' }),
      true,
    );
  });
});
