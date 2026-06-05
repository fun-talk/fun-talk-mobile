import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldUseServerOnlyTts } from './nativeLessonTtsPolicy.ts';

describe('nativeLessonTtsPolicy', () => {
  it('keeps free chat on server TTS instead of local fallback speech', () => {
    assert.equal(shouldUseServerOnlyTts('free_chat'), true);
    assert.equal(shouldUseServerOnlyTts('teaching'), false);
    assert.equal(shouldUseServerOnlyTts('challenge'), false);
    assert.equal(shouldUseServerOnlyTts(null), false);
  });
});
