import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  resolveControllerItemPromptPlaybackPlans,
  resolveStepAnswerFeedbackPlaybackPlan,
  resolveStepPromptPlaybackPlan,
} from './nativeLessonPromptPlayback.ts';

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

  it('prefers success voice audio for correct answers', () => {
    assert.deepEqual(
      resolveStepAnswerFeedbackPlaybackPlan(
        {
          successVoiceUrl: 'https://example.com/success.mp3',
          retryVoiceUrl: 'https://example.com/retry.mp3',
          successReply: 'Great job!',
        },
        true,
      ),
      {
        kind: 'remote_url',
        voiceUrl: 'https://example.com/success.mp3',
      },
    );
  });

  it('falls back to success reply text when correct answer has no voice url', () => {
    assert.deepEqual(
      resolveStepAnswerFeedbackPlaybackPlan(
        {
          successVoiceUrl: undefined,
          retryVoiceUrl: 'https://example.com/retry.mp3',
          successReply: 'Great job!',
        },
        true,
      ),
      {
        kind: 'tts',
        text: 'Great job!',
      },
    );
  });

  it('uses retry voice audio for wrong answers', () => {
    assert.deepEqual(
      resolveStepAnswerFeedbackPlaybackPlan(
        {
          successVoiceUrl: 'https://example.com/success.mp3',
          retryVoiceUrl: 'https://example.com/retry.mp3',
          successReply: 'Great job!',
        },
        false,
      ),
      {
        kind: 'remote_url',
        voiceUrl: 'https://example.com/retry.mp3',
      },
    );
  });

  it('skips wrong-answer playback when retry voice url is missing', () => {
    assert.deepEqual(
      resolveStepAnswerFeedbackPlaybackPlan(
        {
          successVoiceUrl: undefined,
          retryVoiceUrl: undefined,
          successReply: 'Great job!',
        },
        false,
      ),
      { kind: 'mark_spoken' },
    );
  });

  it('queues media description audio after teaching segment voice url', () => {
    assert.deepEqual(
      resolveControllerItemPromptPlaybackPlans({
        text: 'Teaching intro',
        voiceUrl: 'https://example.com/teaching.mp3',
        mediaDescriptionVoiceUrl: 'https://example.com/teaching-desc.mp3',
      }),
      [
        { kind: 'remote_url', voiceUrl: 'https://example.com/teaching.mp3' },
        { kind: 'remote_url', voiceUrl: 'https://example.com/teaching-desc.mp3' },
      ],
    );
  });

  it('prefers challenge step voice url over item-level voice url', () => {
    assert.deepEqual(
      resolveControllerItemPromptPlaybackPlans({
        text: 'Teaching intro',
        voiceUrl: 'https://example.com/item.mp3',
        step: {
          promptText: 'Say hello',
          voiceUrl: 'https://example.com/step.mp3',
        },
      }),
      [{ kind: 'remote_url', voiceUrl: 'https://example.com/step.mp3' }],
    );
  });
});
