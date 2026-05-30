import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeRealtimeControlEvent,
  buildInitSessionCommand,
  buildTriggerStepPromptCommand,
  buildStartLessonCommand,
  buildMediaFinishedCommand,
  buildAssistantPromptSpokenCommand,
  buildSubmitChoiceCommand,
  buildVideoPlayFinishedCommand,
} from "./sessionProtocol";

describe("normalizeRealtimeControlEvent", () => {
  it("returns null for non-object input", () => {
    assert.equal(normalizeRealtimeControlEvent(null), null);
    assert.equal(normalizeRealtimeControlEvent(undefined), null);
    assert.equal(normalizeRealtimeControlEvent("string"), null);
    assert.equal(normalizeRealtimeControlEvent(42), null);
    assert.equal(normalizeRealtimeControlEvent([]), null);
  });

  it("returns null when event field is missing or empty", () => {
    assert.equal(normalizeRealtimeControlEvent({}), null);
    assert.equal(normalizeRealtimeControlEvent({ event: "" }), null);
    assert.equal(normalizeRealtimeControlEvent({ event: "  " }), null);
  });

  it("normalizes a session_created event", () => {
    const result = normalizeRealtimeControlEvent({
      event: "session_created",
      session_id: "abc-123",
      resumed: false,
    });
    assert.notEqual(result, null);
    assert.equal(result!.event, "session_created");
    assert.equal(result!.session_id, "abc-123");
    assert.equal(result!.resumed, false);
  });

  it("normalizes an assistant_text event", () => {
    const result = normalizeRealtimeControlEvent({
      event: "assistant_text",
      text: "你好，小朋友！",
      utterance_id: 1,
    });
    assert.notEqual(result, null);
    assert.equal(result!.event, "assistant_text");
    assert.equal(result!.text, "你好，小朋友！");
    assert.equal(result!.utterance_id, 1);
  });

  it("normalizes a step_transition event with duolingo payload", () => {
    const result = normalizeRealtimeControlEvent({
      event: "step_transition",
      step_payload: {
        protocol: "duolingo",
        step: 1,
        title: "Pick the fruit",
        expects_user_input: true,
        screen_text: "Which one is the apple?",
        question: {
          response_mode: "choice",
          correct_option_id: "a",
          options: [
            { id: "a", label: "Apple", image_url: "https://example.com/apple.png" },
            { id: "b", label: "Banana", image_url: "https://example.com/banana.png" },
          ],
        },
      },
    });
    assert.notEqual(result, null);
    assert.equal(result!.event, "step_transition");
    assert.equal(result!.step_payload?.protocol, "duolingo");
    assert.equal(result!.step_payload?.step, 1);
  });

  it("normalizes a user_transcript event", () => {
    const result = normalizeRealtimeControlEvent({
      event: "user_transcript",
      text: "apple",
      is_final: true,
    });
    assert.notEqual(result, null);
    assert.equal(result!.event, "user_transcript");
    assert.equal(result!.text, "apple");
  });

  it("normalizes a bot_speaking_start event", () => {
    const result = normalizeRealtimeControlEvent({
      event: "bot_speaking_start",
      utterance_id: 5,
    });
    assert.notEqual(result, null);
    assert.equal(result!.event, "bot_speaking_start");
  });

  it("passes through unknown event fields", () => {
    const result = normalizeRealtimeControlEvent({
      event: "custom_event",
      custom_field: "custom_value",
      nested: { deep: true },
    });
    assert.notEqual(result, null);
    assert.equal(result!.event, "custom_event");
    assert.equal(result!.custom_field, "custom_value");
  });

  it("extracts known fields by type", () => {
    const result = normalizeRealtimeControlEvent({
      event: "test",
      text: "hello",
      intent: "greeting",
      message: "hi there",
      utterance_id: 42,
      transition_index: 3,
      session_id: "sess-1",
      resumed: true,
      step: 7,
      matched: true,
      response_mode: "speech",
      reason: "testing",
      from_step: 5,
      to_step: 9,
      use_lesson_runtime: true,
      current_step_id: 8,
      current_media: null,
      feedback_text: "great job",
      kind: "praise",
    });
    assert.notEqual(result, null);
    assert.equal(result!.text, "hello");
    assert.equal(result!.intent, "greeting");
    assert.equal(result!.utterance_id, 42);
    assert.equal(result!.transition_index, 3);
    assert.equal(result!.step, 7);
    assert.equal(result!.matched, true);
    assert.equal(result!.response_mode, "speech");
    assert.equal(result!.from_step, 5);
    assert.equal(result!.to_step, 9);
    assert.equal(result!.use_lesson_runtime, true);
    assert.equal(result!.current_step_id, 8);
    assert.equal(result!.current_media, null);
    assert.equal(result!.feedback_text, "great job");
    assert.equal(result!.kind, "praise");
  });
});

describe("buildInitSessionCommand", () => {
  it("builds a basic init command", () => {
    const cmd = buildInitSessionCommand({
      systemRole: "You are a helpful fox.",
      agentPromptTemplate: "template_2",
      botName: "欧波",
      speaker: "zh_male_taocheng_uranus_bigtts",
      ttsSpeed: 1.0,
      useFrontendTts: false,
    });
    assert.equal(cmd.type, "init");
    assert.equal(cmd.system_role, "You are a helpful fox.");
    assert.equal(cmd.bot_name, "欧波");
    assert.equal(cmd.speaker, "zh_male_taocheng_uranus_bigtts");
    assert.equal(cmd.tts_speed, 1.0);
    assert.equal(cmd.use_frontend_tts, false);
  });

  it("includes lesson runtime fields when useLessonRuntime is true", () => {
    const cmd = buildInitSessionCommand({
      systemRole: "test",
      agentPromptTemplate: "template_2",
      botName: "Test",
      speaker: "test_speaker",
      ttsSpeed: 1.0,
      useFrontendTts: false,
      useLessonRuntime: true,
      lessonId: "413",
    });
    assert.equal(cmd.use_lesson_runtime, true);
    assert.equal(cmd.lesson_id, "413");
  });

  it("includes free chat config when provided", () => {
    const cmd = buildInitSessionCommand({
      systemRole: "test",
      agentPromptTemplate: "template_2",
      botName: "Test",
      speaker: "test_speaker",
      ttsSpeed: 1.0,
      useFrontendTts: false,
      freeChatConfig: {
        id: "chat_1",
        openingQuestion: "What's your favorite color?",
        topicMode: "a",
        minUserTurns: 3,
        maxUserTurns: 5,
      },
    });
    assert.equal(cmd.free_chat_enabled, true);
    assert.equal(cmd.free_chat_opening, "What's your favorite color?");
    assert.equal(cmd.free_chat_topic_mode, "a");
    assert.equal(cmd.free_chat_min_user_turns, 3);
    assert.equal(cmd.free_chat_max_user_turns, 5);
  });

  it("includes session resume fields", () => {
    const cmd = buildInitSessionCommand({
      systemRole: "test",
      agentPromptTemplate: "template_2",
      botName: "Test",
      speaker: "test_speaker",
      ttsSpeed: 1.0,
      useFrontendTts: false,
      resumeSessionId: "sess-resume-1",
      allowOwnerResume: true,
    });
    assert.equal(cmd.resume_session_id, "sess-resume-1");
    assert.equal(cmd.allow_owner_resume, true);
  });

  it("omits optional fields when not provided", () => {
    const cmd = buildInitSessionCommand({
      systemRole: "test",
      agentPromptTemplate: "template_2",
      botName: "Test",
      speaker: "test_speaker",
      ttsSpeed: 1.0,
      useFrontendTts: false,
    });
    assert.equal("lesson_id" in cmd, false);
    assert.equal("use_lesson_runtime" in cmd, false);
    assert.equal("resume_session_id" in cmd, false);
  });
});

describe("command builders", () => {
  it("buildTriggerStepPromptCommand with default text", () => {
    const cmd = buildTriggerStepPromptCommand();
    assert.equal(cmd.type, "TRIGGER_STEP_PROMPT");
    assert.equal(cmd.payload.text, "继续下一步");
  });

  it("buildTriggerStepPromptCommand with custom text", () => {
    const cmd = buildTriggerStepPromptCommand("开始闯关");
    assert.equal(cmd.payload.text, "开始闯关");
  });

  it("buildStartLessonCommand", () => {
    const cmd = buildStartLessonCommand();
    assert.equal(cmd.type, "START_LESSON");
  });

  it("buildMediaFinishedCommand", () => {
    const cmd = buildMediaFinishedCommand({
      cueId: "cue_1",
      summary: "Video played",
    });
    assert.equal(cmd.type, "MEDIA_FINISHED");
    assert.equal(cmd.cue_id, "cue_1");
    assert.equal(cmd.summary, "Video played");
  });

  it("buildMediaFinishedCommand with defaults", () => {
    const cmd = buildMediaFinishedCommand();
    assert.equal(cmd.type, "MEDIA_FINISHED");
    assert.equal(cmd.summary, "");
  });

  it("buildAssistantPromptSpokenCommand", () => {
    const cmd = buildAssistantPromptSpokenCommand(3);
    assert.equal(cmd.type, "ASSISTANT_PROMPT_SPOKEN");
    assert.equal(cmd.step_id, 3);
  });

  it("buildSubmitChoiceCommand", () => {
    const cmd = buildSubmitChoiceCommand(5, "option_a");
    assert.equal(cmd.type, "SUBMIT_CHOICE");
    assert.equal(cmd.step_id, 5);
    assert.equal(cmd.option_id, "option_a");
  });

  it("buildVideoPlayFinishedCommand", () => {
    const cmd = buildVideoPlayFinishedCommand("Opening video done");
    assert.equal(cmd.type, "VIDEO_PLAY_FINISHED");
    assert.equal(cmd.payload.summary, "Opening video done");
  });
});
