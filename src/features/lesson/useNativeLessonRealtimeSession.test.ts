import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldAdvanceFreeChatStepOnClose } from './freeChatStepAdvance.ts';

describe('useNativeLessonRealtimeSession', () => {
  it('advances when free chat ends with a close intent', () => {
    assert.equal(
      shouldAdvanceFreeChatStepOnClose(
        { event: 'chat_ended', intent: 'close' },
        'free_chat',
      ),
      true,
    );
  });

  it('does not advance for non-close free chat turns', () => {
    assert.equal(
      shouldAdvanceFreeChatStepOnClose(
        { event: 'chat_ended', intent: 'continue' },
        'free_chat',
      ),
      false,
    );
  });

  it('does not advance outside free chat', () => {
    assert.equal(
      shouldAdvanceFreeChatStepOnClose(
        { event: 'chat_ended', intent: 'close' },
        'challenge',
      ),
      false,
    );
  });
});
