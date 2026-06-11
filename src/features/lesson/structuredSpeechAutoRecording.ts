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
  lastSubmittedRecordingUri: string | null;
};

const AUTO_STARTABLE_RECORDING_STATUSES = new Set<RecordingControllerStatus>([
  'idle',
  'recorded',
  'submitted',
  'cancelled',
  'error',
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
  lastSubmittedRecordingUri,
}: AutoSubmitOptions): boolean {
  return (
    isStructuredSpeechTurn(controllerView) &&
    recordingStatus === 'recorded' &&
    Boolean(recordingUri) &&
    recordingUri !== lastSubmittedRecordingUri
  );
}
