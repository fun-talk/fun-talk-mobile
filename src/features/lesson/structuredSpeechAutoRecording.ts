import type { NativeLessonControllerView } from './nativeLessonController';
import type { RecordingControllerStatus } from './recordingController';

type StructuredSpeechAudioStatus = 'idle' | 'buffering' | 'playing' | 'error';

type AutoStartOptions = {
  controllerView: NativeLessonControllerView;
  realtimeConnected: boolean;
  audioStatus: StructuredSpeechAudioStatus;
  assistantPlaybackPending: boolean;
  recordingStatus: RecordingControllerStatus;
  lastStartedTurnKey: string | null;
};

type AutoSubmitOptions = {
  controllerView: NativeLessonControllerView;
  recordingStatus: RecordingControllerStatus;
  recordingUri: string | null;
  hasSpeech: boolean;
  lastSubmittedRecordingUri: string | null;
};

type ForceCloseOptions = {
  controllerView: NativeLessonControllerView | null;
  realtimeConnected: boolean;
  audioStatus: StructuredSpeechAudioStatus;
  assistantPlaybackPending: boolean;
  recordingStatus: RecordingControllerStatus;
};

const AUTO_STARTABLE_RECORDING_STATUSES = new Set<RecordingControllerStatus>([
  'idle',
  'recorded',
  'submitted',
  'cancelled',
  'error',
]);

const ACTIVE_RECORDING_STATUSES = new Set<RecordingControllerStatus>([
  'recording',
  'auto_stopping',
]);

function isStructuredSpeechTurn(controllerView: NativeLessonControllerView | null): boolean {
  if (!controllerView || controllerView.lifecycle !== 'waiting_user') {
    return false;
  }

  return (
    controllerView.phase === 'free_chat' ||
    controllerView.step?.responseMode === 'speech'
  );
}

export function getStructuredSpeechAutoTurnKey(
  controllerView: NativeLessonControllerView | null,
): string | null {
  if (!controllerView || !isStructuredSpeechTurn(controllerView)) {
    return null;
  }

  const stepId = controllerView.step?.step ?? controllerView.id;
  const turnText =
    controllerView.step?.screenText.trim() ||
    controllerView.screenText.trim() ||
    controllerView.text.trim() ||
    '';
  return `${controllerView.phase}:${controllerView.lifecycle}:${stepId}:${turnText}`;
}

export function shouldAutoStartStructuredSpeechRecording({
  controllerView,
  realtimeConnected,
  audioStatus,
  assistantPlaybackPending,
  recordingStatus,
  lastStartedTurnKey,
}: AutoStartOptions): boolean {
  const turnKey = getStructuredSpeechAutoTurnKey(controllerView);
  if (!turnKey) {
    return false;
  }
  if (!realtimeConnected || audioStatus !== 'idle' || assistantPlaybackPending) {
    return false;
  }
  if (!AUTO_STARTABLE_RECORDING_STATUSES.has(recordingStatus)) {
    return false;
  }
  return turnKey !== lastStartedTurnKey;
}

export function shouldAutoSubmitStructuredSpeechRecording({
  controllerView,
  recordingStatus,
  recordingUri,
  hasSpeech,
  lastSubmittedRecordingUri,
}: AutoSubmitOptions): boolean {
  return (
    isStructuredSpeechTurn(controllerView) &&
    recordingStatus === 'recorded' &&
    hasSpeech &&
    Boolean(recordingUri) &&
    recordingUri !== lastSubmittedRecordingUri
  );
}

export function getStructuredSpeechRecordingCloseReason({
  controllerView,
  realtimeConnected,
  audioStatus,
  assistantPlaybackPending,
  recordingStatus,
}: ForceCloseOptions): string | null {
  if (!ACTIVE_RECORDING_STATUSES.has(recordingStatus)) {
    return null;
  }
  if (!controllerView) {
    return 'missing_controller_view';
  }
  if (controllerView.isPaused) {
    return 'lesson_paused';
  }
  if (!realtimeConnected) {
    return 'realtime_disconnected';
  }
  if (controllerView.lifecycle !== 'waiting_user') {
    return `lifecycle_${controllerView.lifecycle}`;
  }
  if (!isStructuredSpeechTurn(controllerView)) {
    return 'non_speech_turn';
  }
  if (assistantPlaybackPending) {
    return 'assistant_playback_pending';
  }
  if (audioStatus !== 'idle') {
    return `audio_${audioStatus}`;
  }
  return null;
}
