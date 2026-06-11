export type NativeLessonRouteRequest = {
  lessonId?: string;
  sectionId?: string;
};

export type NativeLessonMetadata = {
  id: string;
  title: string;
  version: number;
  coverImageUrl?: string;
  defaultSpeaker?: string;
  botName?: string;
};

export type NativeLessonChoiceOption = {
  id: string;
  label: string;
  text: string;
  imageUrl?: string;
};

export type NativeLessonStep = {
  step: number;
  promptText: string;
  screenText: string;
  mediaCueId?: string;
  voiceUrl?: string;
  responseMode?: string;
  correctOptionId?: string;
  expectedPhrases?: string[];
  successReply?: string;
  retryText?: string;
  options: NativeLessonChoiceOption[];
  autoAdvance: boolean;
  raw: Record<string, unknown>;
};

export type NativeLessonChallenge = {
  key: string;
  title: string;
  subtitle?: string;
  backgroundImageUrl?: string;
  terminalStep: number;
  steps: Record<number, NativeLessonStep>;
};

export type NativeLessonDefinition = {
  metadata: NativeLessonMetadata;
  assets: {
    transitionMedia: Record<string, { type: string; url: string }>;
    backgrounds: Record<string, string>;
    foxVideos: {
      idle?: string;
      talking?: string;
    };
  };
  story: Record<string, unknown>;
  teaching: Record<string, unknown>;
  challenges: NativeLessonChallenge[];
  freeChatBridges: Record<string, unknown>;
  flags: Record<string, unknown>;
  summary: {
    challengeCount: number;
    stepCount: number;
    firstStep: NativeLessonStep | null;
  };
};
