export type SimpleVadStatus = 'silence' | 'speech' | 'silence_timeout' | 'max_duration';

export type SimpleVadConfig = {
  speechThresholdDb: number;
  speechStartSamples: number;
  silenceTimeoutMs: number;
  maxDurationMs: number;
};

export type SimpleVadState = SimpleVadConfig & {
  status: SimpleVadStatus;
  loudSampleCount: number;
  speechStartedAtMs: number | null;
  lastSpeechAtMs: number | null;
  hasSpeech: boolean;
  shouldAutoSubmit: boolean;
};

export type SimpleVadSample = {
  metering: number | null | undefined;
  elapsedMs: number;
};

const DEFAULT_SIMPLE_VAD_CONFIG: SimpleVadConfig = {
  speechThresholdDb: -35,
  speechStartSamples: 2,
  silenceTimeoutMs: 1200,
  maxDurationMs: 15000,
};

export function createSimpleVadState(
  config: Partial<SimpleVadConfig> = {},
): SimpleVadState {
  return {
    ...DEFAULT_SIMPLE_VAD_CONFIG,
    ...config,
    status: 'silence',
    loudSampleCount: 0,
    speechStartedAtMs: null,
    lastSpeechAtMs: null,
    hasSpeech: false,
    shouldAutoSubmit: false,
  };
}

export function reduceSimpleVad(
  state: SimpleVadState,
  sample: SimpleVadSample,
): SimpleVadState {
  if (sample.elapsedMs >= state.maxDurationMs) {
    return {
      ...state,
      status: 'max_duration',
      shouldAutoSubmit: true,
    };
  }

  const metering = typeof sample.metering === 'number' ? sample.metering : -160;
  const isLoud = metering >= state.speechThresholdDb;
  const loudSampleCount = isLoud ? state.loudSampleCount + 1 : 0;
  const justStartedSpeech =
    state.status !== 'speech' && loudSampleCount >= state.speechStartSamples;
  const hasSpeech = state.hasSpeech || justStartedSpeech || state.status === 'speech';
  const lastSpeechAtMs =
    isLoud && hasSpeech ? sample.elapsedMs : state.lastSpeechAtMs;
  const speechStartedAtMs =
    justStartedSpeech && state.speechStartedAtMs === null
      ? sample.elapsedMs
      : state.speechStartedAtMs;

  if (
    hasSpeech &&
    lastSpeechAtMs !== null &&
    !isLoud &&
    sample.elapsedMs - lastSpeechAtMs >= state.silenceTimeoutMs
  ) {
    return {
      ...state,
      status: 'silence_timeout',
      loudSampleCount,
      speechStartedAtMs,
      lastSpeechAtMs,
      hasSpeech,
      shouldAutoSubmit: true,
    };
  }

  return {
    ...state,
    status: hasSpeech && isLoud ? 'speech' : state.status === 'speech' ? 'speech' : 'silence',
    loudSampleCount,
    speechStartedAtMs,
    lastSpeechAtMs,
    hasSpeech,
    shouldAutoSubmit: false,
  };
}

