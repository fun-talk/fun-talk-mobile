import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeRealtimeLessonDefinition,
  toChallengeTemplateSequence,
  getLessonChallengeScript,
  getLessonChallengeStep,
  getNextLessonChallengeStep,
  getLessonChallengeTerminalStep,
  resolveLessonChallengeStepMedia,
} from "./lessonDefinition";

const MINIMAL_LESSON = {
  lesson: {
    metadata: { id: "413", title: "Test Lesson", version: 1 },
    assets: {
      backgrounds: { default: "https://example.com/bg.jpg" },
      transitionMedia: {
        cue_1: { type: "image", url: "https://example.com/trans1.jpg" },
        cue_2: { type: "video", url: "https://example.com/trans2.mp4" },
      },
      foxVideos: {
        idle: "https://example.com/fox_idle.mp4",
        talking: "https://example.com/fox_talk.mp4",
      },
    },
    story: {
      enabled: true,
      title: "Test Story",
      backgroundImageUrl: "https://example.com/story_bg.jpg",
      openingVideoUrl: "https://example.com/story_open.mp4",
      segments: [
        {
          id: "seg-1",
          spokenText: "Hello",
          mediaType: "image",
          mediaUrl: "https://example.com/seg1.jpg",
        },
      ],
    },
    teaching: {
      enabled: true,
      title: "Test Teaching",
      backgroundImageUrl: "https://example.com/teach_bg.jpg",
      segments: [
        {
          id: "tseg-1",
          kind: "narration",
          spokenText: "Welcome",
        },
      ],
    },
    challenges: [
      {
        key: "template_2",
        title: "Duck House",
        backgroundImageUrl: "https://example.com/ch_bg.jpg",
        openingStep: 1,
        terminalStep: 12,
        steps: {
          1: {
            step: 1,
            title: "Step 1",
            promptText: "Welcome to the challenge",
            autoAdvance: true,
          },
          2: {
            step: 2,
            title: "Step 2",
            promptText: "What do you see?",
            expectedText: "a duck",
            responseMode: "speech",
          },
        },
      },
      {
        key: "template_duolingo",
        title: "Duolingo Challenge",
        backgroundImageUrl: "https://example.com/duo_bg.jpg",
        openingStep: 1,
        terminalStep: 10,
        steps: {
          1: {
            step: 1,
            title: "Duo Step 1",
            promptText: "Pick the right answer",
            responseMode: "choice",
            options: [
              { id: "a", label: "Option A", text: "Answer A" },
              { id: "b", label: "Option B", text: "Answer B" },
            ],
            correctOptionId: "a",
          },
        },
      },
    ],
    freeChatBridges: {
      preDuolingo: {
        id: "pre_duo_chat",
        openingQuestion: "Ready for a challenge?",
        topicMode: "a",
      },
    },
    flags: {
      storyIntroEnabled: true,
      teachingIntroEnabled: true,
    },
  },
};

describe("normalizeRealtimeLessonDefinition", () => {
  it("normalizes a complete lesson definition", () => {
    const result = normalizeRealtimeLessonDefinition(MINIMAL_LESSON.lesson);

    assert.equal(result.metadata.id, "413");
    assert.equal(result.metadata.title, "Test Lesson");
    assert.equal(result.metadata.version, 1);

    assert.equal(result.assets.backgrounds.default, "https://example.com/bg.jpg");
    assert.equal(result.assets.foxVideos.idle, "https://example.com/fox_idle.mp4");
    assert.equal(result.assets.foxVideos.talking, "https://example.com/fox_talk.mp4");

    assert.equal(result.story.enabled, true);
    assert.equal(result.story.segments.length, 1);
    assert.equal(result.story.segments[0].id, "seg-1");

    assert.equal(result.teaching.enabled, true);
    assert.equal(result.teaching.segments.length, 1);

    assert.equal(result.challenges.length, 2);
    assert.equal(result.challenges[0].key, "template_2");
    assert.equal(result.challenges[0].steps[1].title, "Step 1");

    assert.equal(result.flags.storyIntroEnabled, true);
    assert.equal(result.flags.teachingIntroEnabled, true);
    assert.equal(result.flags.duolingoOnly, false);
  });

  it("applies defaults for missing fields", () => {
    const result = normalizeRealtimeLessonDefinition({
      metadata: {},
      assets: {},
      story: {},
      teaching: {},
    });

    assert.equal(result.metadata.id, "413");
    assert.equal(result.metadata.title, "Realtime Lesson");
    assert.equal(result.metadata.version, 1);
    assert.equal(result.story.enabled, false);
    assert.equal(result.teaching.enabled, true);
    assert.deepEqual(result.challenges, []);
    assert.deepEqual(result.assets.backgrounds, {});
    assert.deepEqual(result.assets.transitionMedia, {});
  });

  it("normalizes transition media map", () => {
    const result = normalizeRealtimeLessonDefinition(MINIMAL_LESSON.lesson);
    const media = result.assets.transitionMedia;

    assert.equal(media.cue_1?.type, "image");
    assert.equal(media.cue_1?.url, "https://example.com/trans1.jpg");
    assert.equal(media.cue_2?.type, "video");
    assert.equal(media.cue_2?.url, "https://example.com/trans2.mp4");
  });

  it("filters invalid backgrounds", () => {
    const lesson = {
      ...MINIMAL_LESSON.lesson,
      assets: {
        ...MINIMAL_LESSON.lesson.assets,
        backgrounds: {
          valid: "https://example.com/bg.jpg",
          invalid_number: 123,
          invalid_null: null,
        },
      },
    };
    const result = normalizeRealtimeLessonDefinition(lesson);

    assert.equal(result.assets.backgrounds.valid, "https://example.com/bg.jpg");
    assert.equal("invalid_number" in result.assets.backgrounds, false);
    assert.equal("invalid_null" in result.assets.backgrounds, false);
  });

  it("handles legacy string media format in challenge steps", () => {
    const lesson = {
      metadata: { id: "1" },
      assets: { backgrounds: {}, transitionMedia: {}, foxVideos: {} },
      story: { segments: [] },
      teaching: { segments: [] },
      challenges: [
        {
          key: "test",
          title: "Test",
          backgroundImageUrl: "",
          steps: {
            1: {
              step: 1,
              title: "Legacy Step",
              promptText: "Hello",
              media: "https://example.com/legacy.jpg",
            },
          },
        },
      ],
    };
    const result = normalizeRealtimeLessonDefinition(lesson);

    const step = result.challenges[0].steps[1];
    assert.equal(step.media?.type, "image");
    assert.equal(step.media?.url, "https://example.com/legacy.jpg");
  });

  it("handles flat imageUrl/videoUrl fields on step", () => {
    const lesson = {
      metadata: { id: "1" },
      assets: { backgrounds: {}, transitionMedia: {}, foxVideos: {} },
      story: { segments: [] },
      teaching: { segments: [] },
      challenges: [
        {
          key: "test",
          title: "Test",
          backgroundImageUrl: "",
          steps: {
            1: {
              step: 1,
              title: "Flat Step",
              promptText: "Hello",
              imageUrl: "https://example.com/flat.jpg",
              imageCueId: "cue_flat",
            },
          },
        },
      ],
    };
    const result = normalizeRealtimeLessonDefinition(lesson);

    const step = result.challenges[0].steps[1];
    assert.equal(step.media?.type, "image");
    assert.equal(step.media?.url, "https://example.com/flat.jpg");
    assert.equal(step.mediaCueId, "cue_flat");
  });

  it("infers step number from key when step field is missing", () => {
    const lesson = {
      metadata: { id: "1" },
      assets: { backgrounds: {}, transitionMedia: {}, foxVideos: {} },
      story: { segments: [] },
      teaching: { segments: [] },
      challenges: [
        {
          key: "test",
          title: "Test",
          backgroundImageUrl: "",
          steps: {
            5: {
              title: "Inferred Step",
              promptText: "Hello",
            },
          },
        },
      ],
    };
    const result = normalizeRealtimeLessonDefinition(lesson);

    const step = result.challenges[0].steps[5];
    assert.equal(step.step, 5);
    assert.equal(step.title, "Inferred Step");
  });

  it("throws on invalid lesson payload", () => {
    assert.throws(() => normalizeRealtimeLessonDefinition(null));
    assert.throws(() => normalizeRealtimeLessonDefinition("not an object"));
    assert.throws(() => normalizeRealtimeLessonDefinition([]));
  });

  it("throws when challenges is not an array", () => {
    assert.throws(() =>
      normalizeRealtimeLessonDefinition({
        metadata: {},
        assets: {},
        story: {},
        teaching: {},
        challenges: "not-an-array",
      }),
    );
  });

  it("throws when challenge step is missing numeric step", () => {
    assert.throws(() =>
      normalizeRealtimeLessonDefinition({
        metadata: {},
        assets: {},
        story: {},
        teaching: {},
        challenges: [
          {
            key: "test",
            steps: {
              not_a_number: {
                step: "not-a-number",
                title: "Bad Step",
              },
            },
          },
        ],
      }),
    );
  });
});

describe("toChallengeTemplateSequence", () => {
  it("returns challenge keys in order", () => {
    const lesson = normalizeRealtimeLessonDefinition(MINIMAL_LESSON.lesson);
    assert.deepEqual(toChallengeTemplateSequence(lesson), [
      "template_2",
      "template_duolingo",
    ]);
  });
});

describe("getLessonChallengeScript", () => {
  it("finds challenge by key", () => {
    const lesson = normalizeRealtimeLessonDefinition(MINIMAL_LESSON.lesson);
    const script = getLessonChallengeScript(lesson, "template_2");
    assert.equal(script?.title, "Duck House");
  });

  it("returns null for unknown key", () => {
    const lesson = normalizeRealtimeLessonDefinition(MINIMAL_LESSON.lesson);
    assert.equal(getLessonChallengeScript(lesson, "nonexistent"), null);
  });
});

describe("getLessonChallengeStep", () => {
  it("returns step by number", () => {
    const lesson = normalizeRealtimeLessonDefinition(MINIMAL_LESSON.lesson);
    const step = getLessonChallengeStep(lesson, "template_2", 2);
    assert.equal(step?.title, "Step 2");
    assert.equal(step?.expectedText, "a duck");
  });

  it("returns null for unknown step", () => {
    const lesson = normalizeRealtimeLessonDefinition(MINIMAL_LESSON.lesson);
    assert.equal(getLessonChallengeStep(lesson, "template_2", 999), null);
  });
});

describe("getNextLessonChallengeStep", () => {
  it("returns the next step", () => {
    const lesson = normalizeRealtimeLessonDefinition(MINIMAL_LESSON.lesson);
    const next = getNextLessonChallengeStep(lesson, "template_2", 1);
    assert.equal(next?.step, 2);
    assert.equal(next?.title, "Step 2");
  });
});

describe("getLessonChallengeTerminalStep", () => {
  it("returns terminal step number", () => {
    const lesson = normalizeRealtimeLessonDefinition(MINIMAL_LESSON.lesson);
    assert.equal(getLessonChallengeTerminalStep(lesson, "template_2"), 12);
    assert.equal(
      getLessonChallengeTerminalStep(lesson, "template_duolingo"),
      10,
    );
  });
});

describe("resolveLessonChallengeStepMedia", () => {
  it("returns step.media when present", () => {
    const lesson = normalizeRealtimeLessonDefinition(MINIMAL_LESSON.lesson);
    const step = getLessonChallengeStep(lesson, "template_2", 1);
    assert.equal(step?.media, undefined); // autoAdvance step has no media

    const step2 = getLessonChallengeStep(lesson, "template_2", 2);
    assert.equal(step2?.media, undefined); // speech step has no media either
  });

  it("resolves from mediaMap when step has mediaCueId", () => {
    const step = { step: 1, title: "T", promptText: "P", mediaCueId: "cue_1" };
    const mediaMap = {
      cue_1: { type: "image" as const, url: "https://example.com/img.jpg" },
    };
    const resolved = resolveLessonChallengeStepMedia(step, mediaMap);
    assert.equal(resolved?.type, "image");
    assert.equal(resolved?.url, "https://example.com/img.jpg");
  });

  it("prefers step.media over mediaCueId", () => {
    const step = {
      step: 1,
      title: "T",
      promptText: "P",
      media: { type: "video" as const, url: "https://example.com/direct.mp4" },
      mediaCueId: "cue_1",
    };
    const mediaMap = {
      cue_1: { type: "image" as const, url: "https://example.com/img.jpg" },
    };
    const resolved = resolveLessonChallengeStepMedia(step, mediaMap);
    assert.equal(resolved?.type, "video");
    assert.equal(resolved?.url, "https://example.com/direct.mp4");
  });
});
