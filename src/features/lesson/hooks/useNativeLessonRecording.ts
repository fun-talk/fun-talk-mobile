import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useReducer } from 'react';

import {
  createRecordingControllerState,
  reduceRecordingController,
} from '../recordingController';

type NativeRecordingStatus = {
  isRecording?: boolean;
  metering?: number;
  durationMillis?: number;
};

export function useNativeLessonRecording() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [state, dispatch] = useReducer(
    reduceRecordingController,
    undefined,
    createRecordingControllerState,
  );

  const stop = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) {
      return;
    }
    recordingRef.current = null;
    try {
      const status = await recording.stopAndUnloadAsync();
      dispatch({
        type: 'stop',
        uri: recording.getURI(),
        durationMs: status.durationMillis ?? state.durationMs,
      });
    } catch (error) {
      dispatch({
        type: 'error',
        message: error instanceof Error ? error.message : '录音停止失败。',
      });
    }
  }, [state.durationMs]);

  const start = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        dispatch({ type: 'permission_denied' });
        return;
      }
      dispatch({ type: 'permission_granted' });
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status: NativeRecordingStatus) => {
          if (status.isRecording) {
            dispatch({
              type: 'metering',
              metering: status.metering,
              elapsedMs: status.durationMillis ?? 0,
            });
          }
        },
        200,
      );
      recordingRef.current = recording;
      dispatch({ type: 'start' });
    } catch (error) {
      dispatch({
        type: 'error',
        message: error instanceof Error ? error.message : '录音启动失败。',
      });
    }
  }, []);

  const cancel = useCallback(async () => {
    const recording = recordingRef.current;
    recordingRef.current = null;
    try {
      await recording?.stopAndUnloadAsync();
    } catch {
      // The recording may already be unloaded by auto-stop; cancellation should still clear UI state.
    }
    dispatch({ type: 'cancel' });
  }, []);

  const submit = useCallback(() => {
    dispatch({ type: 'submit' });
  }, []);

  useEffect(() => {
    if (state.shouldStopRecording) {
      stop();
    }
  }, [state.shouldStopRecording, stop]);

  useEffect(
    () => () => {
      const recording = recordingRef.current;
      recordingRef.current = null;
      recording?.stopAndUnloadAsync().catch(() => {});
    },
    [],
  );

  return {
    state,
    start,
    stop,
    cancel,
    submit,
  };
}
