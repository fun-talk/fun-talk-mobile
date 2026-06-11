import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveStepPromptPlaybackPlan } from './nativeLessonPromptPlayback.ts';

describe('nativeLessonPromptPlayback', () => {
  it('prefers server-provided voice urls when available', () => {
    assert.deepEqual(
      resolveStepPromptPlaybackPlan({
        assistantPrompt: 'He is sick.',
        voiceUrl: 'https://example.com/he-is-sick.mp3',
      }),
      {
        kind: 'remote_url',
        voiceUrl: 'https://example.com/he-is-sick.mp3',
      },
    );
  });

  it('falls back to local tts when a spoken prompt has no voice url', () => {
    assert.deepEqual(
      resolveStepPromptPlaybackPlan({
        assistantPrompt: 'He is sick.',
        voiceUrl: undefined,
      }),
      {
        kind: 'tts',
        text: 'He is sick.',
      },
    );
  });

  it('marks the prompt spoken immediately when the step has no playable prompt', () => {
    assert.deepEqual(
      resolveStepPromptPlaybackPlan({
        assistantPrompt: '   ',
        voiceUrl: undefined,
      }),
      { kind: 'mark_spoken' },
    );
  });
});
