import type { NativeLessonDefinition, NativeLessonStep } from './nativeLessonTypes';

export type NativeLessonPhase = 'story' | 'teaching' | 'challenge' | 'free_chat' | 'end';
export type NativeLessonLifecycle =
  | 'pending'
  | 'assistant_turn'
  | 'waiting_user'
  | 'waiting_media'
  | 'transitioning'
  | 'completed';

export type NativeLessonControllerItem = {
  id: string;
  phase: NativeLessonPhase;
  title: string;
  text: string;
  screenText: string;
  backgroundImageUrl: string;
  media: { type: string; url: string } | null;
  voiceUrl?: string;
  mediaDescriptionVoiceUrl?: string;
  step?: NativeLessonStep;
};

export type NativeLessonControllerSnapshot = {
  currentIndex: number;
  totalItems: number;
  phase: NativeLessonPhase;
  lifecycle: NativeLessonLifecycle;
  completedItemIds: string[];
  answer?: NativeLessonAnswerState;
};

export type NativeLessonAnswerState = {
  itemId: string;
  selectedOptionId?: string;
  submittedText?: string;
  correct: boolean;
  feedbackText: string;
};

export type NativeLessonControllerState = {
  isPaused: boolean;
  phaseCorrectCount: number;
  currentStageKey?: string;
  snapshot: NativeLessonControllerSnapshot;
};

export type NativeLessonControllerAction =
  | { type: 'next' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'reset' }
  | { type: 'submit_choice'; optionId: string }
  | { type: 'submit_text'; text: string };

export type NativeLessonControllerView = NativeLessonControllerItem & {
  lifecycle: NativeLessonLifecycle;
  isPaused: boolean;
  index: number;
  total: number;
  canGoNext: boolean;
  answer?: NativeLessonAnswerState;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isEnabled(value: unknown, fallback = true): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function freeChatQuestionFromRaw(raw: Record<string, unknown>): string {
  const config = asRecord(raw.freeChatConfig);
  return asString(config.openingQuestion || config.prompt || config.message);
}

function mediaFromRawSegment(raw: Record<string, unknown>): { type: string; url: string } | null {
  const url = asString(raw.mediaUrl || raw.videoUrl || raw.imageUrl);
  if (!url) {
    return null;
  }
  return {
    type: asString(raw.mediaType) || (asString(raw.imageUrl) ? 'image' : 'video'),
    url,
  };
}

function getStepMedia(
  lesson: NativeLessonDefinition,
  step: NativeLessonStep | null,
): { type: string; url: string } | null {
  if (step?.media) {
    return step.media;
  }
  if (!step?.mediaCueId) {
    return null;
  }
  return lesson.assets.transitionMedia[step.mediaCueId] ?? null;
}

function storyItems(lesson: NativeLessonDefinition): NativeLessonControllerItem[] {
  const story = asRecord(lesson.story);
  if (!isEnabled(story.enabled, false)) {
    return [];
  }
  const segments = Array.isArray(story.segments) ? story.segments : [];
  return segments.map((segment, index) => {
    const raw = asRecord(segment);
    const voiceUrl = asString(raw.voiceUrl);
    const mediaDescriptionVoiceUrl = asString(raw.mediaDescriptionVoiceUrl);
    return {
      id: `story:${asString(raw.id) || index + 1}`,
      phase: 'story',
      title: asString(story.title) || '故事开场',
      text: asString(raw.spokenText || raw.text || raw.promptText),
      screenText: asString(raw.screenText),
      backgroundImageUrl:
        asString(raw.backgroundImageUrl) ||
        asString(story.backgroundImageUrl) ||
        lesson.assets.backgrounds.story ||
        '',
      media: mediaFromRawSegment(raw),
      ...(voiceUrl ? { voiceUrl } : {}),
      ...(mediaDescriptionVoiceUrl ? { mediaDescriptionVoiceUrl } : {}),
    };
  });
}

function teachingItems(lesson: NativeLessonDefinition): NativeLessonControllerItem[] {
  const teaching = asRecord(lesson.teaching);
  if (!isEnabled(teaching.enabled, true)) {
    return [];
  }
  const segments = Array.isArray(teaching.segments) ? teaching.segments : [];
  return segments.map((segment, index) => {
    const raw = asRecord(segment);
    const freeChatQuestion = freeChatQuestionFromRaw(raw);
    const voiceUrl = asString(raw.voiceUrl);
    const mediaDescriptionVoiceUrl = asString(raw.mediaDescriptionVoiceUrl);
    if (asString(raw.kind) === 'free_chat' && freeChatQuestion) {
      return {
        id: `teaching:${asString(raw.id) || index + 1}:free_chat`,
        phase: 'free_chat',
        title: '自由对话',
        text: freeChatQuestion,
        screenText: asString(raw.screenText) || freeChatQuestion,
        backgroundImageUrl:
          asString(raw.backgroundImageUrl) ||
          asString(teaching.backgroundImageUrl) ||
          lesson.assets.backgrounds.teaching ||
          '',
        media: mediaFromRawSegment(raw),
        ...(voiceUrl ? { voiceUrl } : {}),
        ...(mediaDescriptionVoiceUrl ? { mediaDescriptionVoiceUrl } : {}),
        step: {
          step: index + 1,
          promptText: freeChatQuestion,
          screenText: asString(raw.screenText) || freeChatQuestion,
          responseMode: 'speech',
          options: [],
          autoAdvance: false,
          raw,
        },
      };
    }
    return {
      id: `teaching:${asString(raw.id) || index + 1}`,
      phase: 'teaching',
      title: asString(teaching.title) || '教学讲解',
      text: asString(raw.spokenText || raw.text || raw.promptText),
      screenText: asString(raw.screenText || raw.targetText),
      backgroundImageUrl:
        asString(raw.backgroundImageUrl) ||
        asString(teaching.backgroundImageUrl) ||
        lesson.assets.backgrounds.teaching ||
        '',
      media: mediaFromRawSegment(raw),
      ...(voiceUrl ? { voiceUrl } : {}),
      ...(mediaDescriptionVoiceUrl ? { mediaDescriptionVoiceUrl } : {}),
    };
  });
}

function challengeItems(lesson: NativeLessonDefinition): NativeLessonControllerItem[] {
  return lesson.challenges.flatMap((challenge) =>
    Object.keys(challenge.steps)
      .map((step) => Number(step))
      .sort((a, b) => a - b)
      .map((stepNumber) => {
        const step = challenge.steps[stepNumber];
        const freeChatQuestion = freeChatQuestionFromRaw(step.raw);
        const isFreeChat = Boolean(freeChatQuestion);
        return {
          id: `challenge:${challenge.key}:${stepNumber}`,
          phase: isFreeChat ? 'free_chat' as const : 'challenge' as const,
          title: isFreeChat ? '自由对话' : challenge.title || challenge.key,
          text: freeChatQuestion || step.promptText,
          screenText: isFreeChat ? step.screenText || freeChatQuestion : step.screenText,
          backgroundImageUrl:
            challenge.backgroundImageUrl ||
            lesson.assets.backgrounds[challenge.key] ||
            lesson.assets.backgrounds.challengeLevel1 ||
            '',
          media: getStepMedia(lesson, step),
          step: isFreeChat
            ? {
                ...step,
                promptText: freeChatQuestion,
                screenText: step.screenText || freeChatQuestion,
                responseMode: 'speech',
              }
            : step,
        };
      }),
  );
}

export function buildNativeLessonControllerItems(
  lesson: NativeLessonDefinition,
): NativeLessonControllerItem[] {
  const items = [
    ...storyItems(lesson),
    ...teachingItems(lesson),
    ...challengeItems(lesson),
  ].filter((item) => item.text || item.screenText || item.media);

  return [
    ...items,
    {
      id: 'end',
      phase: 'end',
      title: '课程完成',
      text: '太棒了，今天的课程已经完成。',
      screenText: '课程完成',
      backgroundImageUrl:
        lesson.assets.backgrounds.teaching ||
        lesson.assets.backgrounds.story ||
        '',
      media: null,
    },
  ];
}

function lifecycleForItem(item: NativeLessonControllerItem): NativeLessonLifecycle {
  if (item.phase === 'end') {
    return 'completed';
  }
  if (
    item.step?.options.length ||
    item.step?.expectedPhrases?.length ||
    item.step?.responseMode === 'speech'
  ) {
    return 'waiting_user';
  }
  if (item.media?.type === 'video') {
    return 'waiting_media';
  }
  return 'assistant_turn';
}

function challengeKeyFromItemId(itemId: string): string | null {
  const parts = itemId.split(':');
  if (parts.length !== 3 || parts[0] !== 'challenge') {
    return null;
  }
  return parts[1] || null;
}

function stageKeyForItem(item: NativeLessonControllerItem | undefined): string | null {
  if (!item?.step || item.phase !== 'challenge') {
    return null;
  }
  const challengeKey = challengeKeyFromItemId(item.id);
  if (!challengeKey) {
    return null;
  }
  const raw = asRecord(item.step.raw);
  const phaseTitle = asString(raw.phaseTitle) || 'default';
  return `${challengeKey}:${phaseTitle}`;
}

function evaluateBranchCondition(condition: string, score: number): boolean {
  const conditionMatch = condition.match(/^score\s*(==|>=)\s*(\d+)$/);
  if (!conditionMatch) {
    return false;
  }
  const [, operator, valueText] = conditionMatch;
  const value = Number.parseInt(valueText, 10);
  if (!Number.isFinite(value)) {
    return false;
  }
  if (operator === '==') {
    return score === value;
  }
  if (operator === '>=') {
    return score >= value;
  }
  return false;
}

function resolveBranchNextIndex(
  items: NativeLessonControllerItem[],
  current: NativeLessonControllerItem | undefined,
  phaseCorrectCount: number,
): number | null {
  const branchOnStageEnd = current?.step?.branchOnStageEnd;
  if (!current || !branchOnStageEnd || branchOnStageEnd.scoreMetric !== 'phase_correct_count') {
    return null;
  }

  const challengeKey = challengeKeyFromItemId(current.id);
  if (!challengeKey) {
    return null;
  }

  for (const branch of branchOnStageEnd.branches) {
    if (!evaluateBranchCondition(branch.condition, phaseCorrectCount)) {
      continue;
    }
    const targetId = `challenge:${challengeKey}:${branch.nextStep}`;
    const targetIndex = items.findIndex((item) => item.id === targetId);
    return targetIndex >= 0 ? targetIndex : null;
  }

  return null;
}

function resolveNextIndex(
  items: NativeLessonControllerItem[],
  currentIndex: number,
  current: NativeLessonControllerItem | undefined,
  phaseCorrectCount: number,
): number {
  const branchNextIndex = resolveBranchNextIndex(items, current, phaseCorrectCount);
  if (branchNextIndex != null) {
    return branchNextIndex;
  }

  if (!current?.step?.nextStep) {
    return Math.min(currentIndex + 1, Math.max(items.length - 1, 0));
  }

  const challengeKey = challengeKeyFromItemId(current.id);
  if (!challengeKey) {
    return Math.min(currentIndex + 1, Math.max(items.length - 1, 0));
  }

  const targetId = `challenge:${challengeKey}:${current.step.nextStep}`;
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (targetIndex < 0) {
    return Math.min(currentIndex + 1, Math.max(items.length - 1, 0));
  }
  return targetIndex;
}

export function createNativeLessonControllerState(
  lesson: NativeLessonDefinition,
): NativeLessonControllerState {
  const items = buildNativeLessonControllerItems(lesson);
  const first = items[0];
  return {
    isPaused: false,
    phaseCorrectCount: 0,
    currentStageKey: stageKeyForItem(first) || undefined,
    snapshot: {
      currentIndex: 0,
      totalItems: items.length,
      phase: first?.phase ?? 'end',
      lifecycle: first ? lifecycleForItem(first) : 'completed',
      completedItemIds: [],
      answer: undefined,
    },
  };
}

function advanceNativeLessonController(
  lesson: NativeLessonDefinition,
  state: NativeLessonControllerState,
): NativeLessonControllerState {
  const items = buildNativeLessonControllerItems(lesson);
  const current = items[state.snapshot.currentIndex];
  const nextIndex = resolveNextIndex(
    items,
    state.snapshot.currentIndex,
    current,
    state.phaseCorrectCount,
  );
  const next = items[nextIndex];
  const completedItemIds =
    current && !state.snapshot.completedItemIds.includes(current.id)
      ? [...state.snapshot.completedItemIds, current.id]
      : state.snapshot.completedItemIds;
  const nextStageKey = stageKeyForItem(next);
  const stageChanged = state.currentStageKey !== nextStageKey;
  const branchResolved = Boolean(current?.step?.branchOnStageEnd);
  const phaseCorrectCount = branchResolved || stageChanged ? 0 : state.phaseCorrectCount;

  return {
    ...state,
    phaseCorrectCount,
    currentStageKey: nextStageKey || undefined,
    snapshot: {
      currentIndex: nextIndex,
      totalItems: items.length,
      phase: next?.phase ?? 'end',
      lifecycle: next ? lifecycleForItem(next) : 'completed',
      completedItemIds,
      answer: undefined,
    },
  };
}

function normalizeAnswerText(text: string): string {
  return text.trim().toLowerCase();
}

function textMatchesExpected(text: string, expectedPhrases: string[] | undefined): boolean {
  const normalized = normalizeAnswerText(text);
  return Boolean(
    normalized &&
      expectedPhrases?.some((phrase) => normalized.includes(normalizeAnswerText(phrase))),
  );
}

function feedbackForStep(step: NativeLessonStep, correct: boolean): string {
  if (correct) {
    return step.successReply || '答对了！';
  }
  return step.retryText || '再试一次。';
}

export function reduceNativeLessonController(
  lesson: NativeLessonDefinition,
  state: NativeLessonControllerState,
  action: NativeLessonControllerAction,
): NativeLessonControllerState {
  if (action.type === 'reset') {
    return createNativeLessonControllerState(lesson);
  }
  if (action.type === 'pause') {
    return { ...state, isPaused: true };
  }
  if (action.type === 'resume') {
    return { ...state, isPaused: false };
  }
  if (state.isPaused) {
    return state;
  }

  const items = buildNativeLessonControllerItems(lesson);
  const current = items[state.snapshot.currentIndex];
  const step = current?.step;

  if (action.type === 'submit_choice') {
    if (!current || !step?.options.length) {
      return state;
    }
    const selectedOptionId = action.optionId.trim();
    const correct = Boolean(
      step.correctOptionId &&
        selectedOptionId.toLowerCase() === step.correctOptionId.trim().toLowerCase(),
    );
    if (correct) {
      return advanceNativeLessonController(lesson, {
        ...state,
        phaseCorrectCount: state.phaseCorrectCount + 1,
      });
    }
    return {
      ...state,
      snapshot: {
        ...state.snapshot,
        answer: {
          itemId: current.id,
          selectedOptionId,
          correct,
          feedbackText: feedbackForStep(step, correct),
        },
      },
    };
  }

  if (action.type === 'submit_text') {
    if (!current || !step) {
      return state;
    }
    const correct = textMatchesExpected(action.text, step.expectedPhrases);
    if (correct) {
      return advanceNativeLessonController(lesson, {
        ...state,
        phaseCorrectCount: state.phaseCorrectCount + 1,
      });
    }
    return {
      ...state,
      snapshot: {
        ...state.snapshot,
        answer: {
          itemId: current.id,
          submittedText: action.text,
          correct,
          feedbackText: feedbackForStep(step, correct),
        },
      },
    };
  }

  return advanceNativeLessonController(lesson, state);
}

export function getNativeLessonControllerView(
  lesson: NativeLessonDefinition,
  state: NativeLessonControllerState,
): NativeLessonControllerView {
  const items = buildNativeLessonControllerItems(lesson);
  const item = items[state.snapshot.currentIndex] ?? items[items.length - 1];
  return {
    ...item,
    lifecycle: state.snapshot.lifecycle,
    isPaused: state.isPaused,
    index: state.snapshot.currentIndex,
    total: items.length,
    canGoNext: !state.isPaused && state.snapshot.currentIndex < items.length - 1,
    answer: state.snapshot.answer?.itemId === item.id ? state.snapshot.answer : undefined,
  };
}
