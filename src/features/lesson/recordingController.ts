import {
  createSimpleVadState,
  reduceSimpleVad,
  type SimpleVadConfig,
  type SimpleVadState,
} from './simpleVad';

export type RecordingControllerStatus =
  | 'idle'
  | 'permission_denied'
  | 'recording'
  | 'auto_stopping'
  | 'recorded'
  | 'submitted'
  | 'cancelled'
  | 'error';

export type RecordingControllerState = {
  status: RecordingControllerStatus;
  hasPermission: boolean;
  recordingUri: string | null;
  durationMs: number;
  metering: number | null;
  hasSpeech: boolean;
  shouldStopRecording: boolean;
  errorText: string | null;
  vadConfig: Partial<SimpleVadConfig>;
  vad: SimpleVadState;
};

export type RecordingControllerAction =
  | { type: 'permission_granted' }
  | { type: 'permission_denied' }
  | { type: 'start' }
  | { type: 'metering'; metering: number | null | undefined; elapsedMs: number }
  | { type: 'stop'; uri: string | null; durationMs: number }
  | { type: 'submit' }
  | { type: 'cancel' }
  | { type: 'error'; message: string };

export function createRecordingControllerState(
  vadConfig: Partial<SimpleVadConfig> = {},
): RecordingControllerState {
  return {
    status: 'idle',
    hasPermission: false,
    recordingUri: null,
    durationMs: 0,
    metering: null,
    hasSpeech: false,
    shouldStopRecording: false,
    errorText: null,
    vadConfig,
    vad: createSimpleVadState(vadConfig),
  };
}

export function reduceRecordingController(
  state: RecordingControllerState,
  action: RecordingControllerAction,
): RecordingControllerState {
  switch (action.type) {
    case 'permission_granted':
      return {
        ...state,
        hasPermission: true,
        status: 'idle',
        errorText: null,
      };
    case 'permission_denied':
      return {
        ...state,
        hasPermission: false,
        status: 'permission_denied',
        errorText: '需要麦克风权限才能录音。',
      };
    case 'start':
      if (!state.hasPermission) {
        return {
          ...state,
          status: 'permission_denied',
          errorText: '需要麦克风权限才能录音。',
        };
      }
      return {
        ...createRecordingControllerState(state.vadConfig),
        hasPermission: true,
        status: 'recording',
        vad: createSimpleVadState(state.vadConfig),
      };
    case 'metering': {
      if (state.status !== 'recording') {
        return state;
      }
      const vad = reduceSimpleVad(state.vad, {
        metering: action.metering,
        elapsedMs: action.elapsedMs,
      });
      return {
        ...state,
        status: vad.shouldAutoSubmit ? 'auto_stopping' : 'recording',
        metering: typeof action.metering === 'number' ? action.metering : null,
        durationMs: action.elapsedMs,
        hasSpeech: vad.hasSpeech,
        shouldStopRecording: vad.shouldAutoSubmit,
        vad,
      };
    }
    case 'stop':
      return {
        ...state,
        status: 'recorded',
        recordingUri: action.uri,
        durationMs: action.durationMs,
        shouldStopRecording: false,
      };
    case 'submit':
      return {
        ...state,
        status: 'submitted',
        errorText: null,
      };
    case 'cancel':
      return {
        ...createRecordingControllerState(state.vadConfig),
        hasPermission: state.hasPermission,
        status: 'cancelled',
      };
    case 'error':
      return {
        ...state,
        status: 'error',
        errorText: action.message,
        shouldStopRecording: false,
      };
    default:
      return state;
  }
}
