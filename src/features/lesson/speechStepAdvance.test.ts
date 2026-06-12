import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  WEB_SPEECH_MAX_ATTEMPTS,
  shouldAdvanceSpeechStepAfterMaxRetries,
} from './speechStepAdvance.ts';

describe('speechStepAdvance', () => {
  it('advances a speech step after the web-equivalent max retry count', () => {
    assert.equal(
      shouldAdvanceSpeechStepAfterMaxRetries({
        currentStepPhase: 'challenge',
        inputMode: 'speech',
        wrongAttemptCount: WEB_SPEECH_MAX_ATTEMPTS,
      }),
      true,
    );
  });

  it('does not advance before the max retry count', () => {
    assert.equal(
      shouldAdvanceSpeechStepAfterMaxRetries({
        currentStepPhase: 'teaching',
        inputMode: 'speech',
        wrongAttemptCount: WEB_SPEECH_MAX_ATTEMPTS - 1,
      }),
      false,
    );
  });

  it('does not advance free chat turns with the speech retry rule', () => {
    assert.equal(
      shouldAdvanceSpeechStepAfterMaxRetries({
        currentStepPhase: 'free_chat',
        inputMode: 'speech',
        wrongAttemptCount: WEB_SPEECH_MAX_ATTEMPTS,
      }),
      false,
    );
  });

  it('does not advance non-speech steps with the speech retry rule', () => {
    assert.equal(
      shouldAdvanceSpeechStepAfterMaxRetries({
        currentStepPhase: 'challenge',
        inputMode: 'choice',
        wrongAttemptCount: WEB_SPEECH_MAX_ATTEMPTS,
      }),
      false,
    );
  });
});
