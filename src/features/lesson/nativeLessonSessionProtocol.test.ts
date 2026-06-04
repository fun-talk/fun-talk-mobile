import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildAssistantPromptSpokenCommand,
  buildInitSessionCommand,
  buildMediaFinishedCommand,
  buildRealtimeLessonWsUrl,
  buildStartLessonCommand,
  buildSubmitChoiceCommand,
  buildSubmitUserTextCommand,
  decodeRealtimeLessonMessage,
  normalizeRealtimeLessonEvent,
} from './nativeLessonSessionProtocol.ts';

describe('nativeLessonSessionProtocol', () => {
  it('builds server-compatible lesson runtime commands', () => {
    assert.deepEqual(buildStartLessonCommand(), { type: 'START_LESSON' });
    assert.deepEqual(buildSubmitUserTextCommand('hello', 3), {
      type: 'SUBMIT_USER_TEXT',
      text: 'hello',
      step_id: 3,
    });
    assert.deepEqual(buildSubmitChoiceCommand(4, 'A'), {
      type: 'SUBMIT_CHOICE',
      step_id: 4,
      option_id: 'A',
    });
    assert.deepEqual(buildMediaFinishedCommand({ cueId: 'intro', summary: 'done' }), {
      type: 'MEDIA_FINISHED',
      cue_id: 'intro',
      summary: 'done',
    });
    assert.deepEqual(buildAssistantPromptSpokenCommand(8), {
      type: 'ASSISTANT_PROMPT_SPOKEN',
      step_id: 8,
    });
  });

  it('builds init and websocket urls with lesson runtime params', () => {
    const init = buildInitSessionCommand({
      lessonId: '414',
      sectionId: '9',
      token: 'jwt',
      resumeSessionId: 'old-session',
    });

    assert.equal(init.type, 'init');
    assert.equal(init.use_lesson_runtime, true);
    assert.equal(init.lesson_id, '414');
    assert.equal(init.section_id, 9);
    assert.equal(init.resume_session_id, 'old-session');

    assert.equal(
      buildRealtimeLessonWsUrl('http://127.0.0.1:9000', 'device 1', 'jwt'),
      'ws://127.0.0.1:9000/ws/realtime?deviceID=device+1&token=jwt',
    );
    assert.equal(
      buildRealtimeLessonWsUrl('https://api.example.com/base', 'd', null),
      'wss://api.example.com/ws/realtime?deviceID=d',
    );
  });

  it('decodes string, array buffer, typed array, and blob-like websocket messages', async () => {
    const payload = { event: 'lesson_state_snapshot', current_step_id: 2 };
    const json = JSON.stringify(payload);

    assert.deepEqual(await decodeRealtimeLessonMessage(json), payload);
    assert.deepEqual(await decodeRealtimeLessonMessage(new TextEncoder().encode(json)), payload);
    assert.deepEqual(
      await decodeRealtimeLessonMessage(new TextEncoder().encode(json).buffer),
      payload,
    );
    assert.deepEqual(
      await decodeRealtimeLessonMessage({ text: async () => json }),
      payload,
    );
    assert.equal(await decodeRealtimeLessonMessage(new Uint8Array([1, 2, 3])), null);
  });

  it('normalizes lesson runtime events and keeps snapshot fields', () => {
    const event = normalizeRealtimeLessonEvent({
      event: 'lesson_state_snapshot',
      phase: 'challenge',
      current_step_id: 2,
      lifecycle: 'waiting_user',
      input_mode: 'choice',
      screen_text: 'Pick one',
      choice_options: [{ option_id: 'A', label: 'A', text: 'Globe' }],
      completed_step_ids: [1],
      total_steps: 9,
    });

    assert.equal(event?.event, 'lesson_state_snapshot');
    assert.equal(event?.currentStepId, 2);
    assert.equal(event?.lifecycle, 'waiting_user');
    assert.equal(event?.choiceOptions[0]?.optionId, 'A');
    assert.deepEqual(event?.completedStepIds, [1]);
    assert.equal(event?.totalSteps, 9);
  });
});
