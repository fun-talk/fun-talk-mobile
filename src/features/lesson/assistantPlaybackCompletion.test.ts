import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createAssistantPlaybackCompletionHandler } from './assistantPlaybackCompletion.ts';

describe('assistantPlaybackCompletion', () => {
  it('marks the prompt as spoken when the playback owns the turn gate', () => {
    const calls: string[] = [];
    const onComplete = createAssistantPlaybackCompletionHandler({
      shouldMarkPromptSpoken: true,
      onMarkPromptSpoken: () => calls.push('mark'),
      onPlaybackFinished: () => calls.push('clear'),
    });

    onComplete();

    assert.deepEqual(calls, ['mark']);
  });

  it('only clears the playback gate for replay-only speech', () => {
    const calls: string[] = [];
    const onComplete = createAssistantPlaybackCompletionHandler({
      shouldMarkPromptSpoken: false,
      onMarkPromptSpoken: () => calls.push('mark'),
      onPlaybackFinished: () => calls.push('clear'),
    });

    onComplete();

    assert.deepEqual(calls, ['clear']);
  });
});
