import type { NativeLessonControllerView } from './nativeLessonController';
import type { RecordingControllerStatus } from './recordingController';

type FreeChatAudioStatus = 'idle' | 'buffering' | 'playing' | 'error';

type AutoStartOptions = {
  controllerView: NativeLessonControllerView;
  realtimeConnected: boolean;
  audioStatus: FreeChatAudioStatus;
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

export function getFreeChatAutoTurnKey(
  controllerView: NativeLessonControllerView | null,
): string | null {
  if (
    !controllerView ||
    controllerView.phase !== 'free_chat' ||
    controllerView.lifecycle !== 'waiting_user'
  ) {
    return null;
  }

  const stepId = controllerView.step?.step ?? controllerView.id;
  return `${controllerView.phase}:${controllerView.lifecycle}:${stepId}`;
}

export function shouldAutoStartFreeChatRecording({
  controllerView,
  realtimeConnected,
  audioStatus,
  recordingStatus,
  lastStartedTurnKey,
}: AutoStartOptions): boolean {
  const turnKey = getFreeChatAutoTurnKey(controllerView);
  if (!turnKey) {
    return false;
  }
  if (!realtimeConnected || audioStatus !== 'idle') {
    return false;
  }
  if (!AUTO_STARTABLE_RECORDING_STATUSES.has(recordingStatus)) {
    return false;
  }
  return turnKey !== lastStartedTurnKey;
}

export function shouldAutoSubmitFreeChatRecording({
  controllerView,
  recordingStatus,
  recordingUri,
  lastSubmittedRecordingUri,
}: AutoSubmitOptions): boolean {
  return (
    controllerView.phase === 'free_chat' &&
    recordingStatus === 'recorded' &&
    Boolean(recordingUri) &&
    recordingUri !== lastSubmittedRecordingUri
  );
}
