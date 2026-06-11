import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FOX_TTS_SPEAKER, resolveFoxTtsVoiceType } from './nativeFoxTts.ts';

describe('nativeFoxTts', () => {
  it('keeps lesson defaultSpeaker when it is V3-compatible', () => {
    assert.equal(
      resolveFoxTtsVoiceType('zh_male_taocheng_uranus_bigtts'),
      'zh_male_taocheng_uranus_bigtts',
    );
  });

  it('maps jupiter realtime voices to the Fox V3 speaker', () => {
    assert.equal(
      resolveFoxTtsVoiceType('zh_female_vv_jupiter_bigtts'),
      FOX_TTS_SPEAKER,
    );
  });

  it('falls back to the Fox V3 speaker when configured voice is empty', () => {
    assert.equal(resolveFoxTtsVoiceType(''), FOX_TTS_SPEAKER);
  });
});
