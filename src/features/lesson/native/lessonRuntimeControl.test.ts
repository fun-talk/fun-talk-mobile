import assert from 'node:assert/strict';
import test from 'node:test';

import { applyLessonRuntimeControlState } from './lessonRuntimeControl';

test('applyLessonRuntimeControlState syncs snapshot screen text and media', () => {
  const currentStepIdRef = { current: null as number | null };
  const currentMediaCueIdRef = { current: null as string | null };
  let screenText = '';
  let media: { url: string | null } | null = null;

  applyLessonRuntimeControlState(
    {
      event: 'lesson_state_snapshot',
      current_step_id: 1,
      screen_text: '到了！看那台子——就是入队宣誓台！',
      current_media: {
        cue_id: 'beijing_playground_video',
        kind: 'video',
        url: 'https://example.com/video.mp4',
      },
    },
    {
      currentStepIdRef,
      currentMediaCueIdRef,
      setScreenText: (value) => {
        screenText = value;
      },
      setMessageHint: () => {},
      setCurrentMedia: (value) => {
        media = value;
      },
    },
  );

  assert.equal(currentStepIdRef.current, 1);
  assert.equal(screenText, '到了！看那台子——就是入队宣誓台！');
  assert.equal(media?.url, 'https://example.com/video.mp4');
});
