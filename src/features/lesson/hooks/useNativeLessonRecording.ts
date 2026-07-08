import { useCallback, useEffect, useRef, useReducer } from 'react';
import { AppState } from 'react-native';

import {
  createRecordingControllerState,
  reduceRecordingController,
} from '../recordingController';
import type { SimpleVadConfig } from '../simpleVad';
import { Audio } from 'expo-av';

type NativeRecordingStatus = {
  isRecording?: boolean;
  metering?: number;
  durationMillis?: number;
};

type UseNativeLessonRecordingOptions = {
  vadConfig?: Partial<SimpleVadConfig>;
};

export function useNativeLessonRecording(options?: UseNativeLessonRecordingOptions) {
  const recordingRef = useRef<{
    stopAndUnloadAsync: () => Promise<{ durationMillis?: number }>;
    getURI: () => string | null;
  } | null>(null);
  const [state, dispatch] = useReducer(
    reduceRecordingController,
    options?.vadConfig,
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

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && recordingRef.current) {
        void stop();
      }
    });

    return () => subscription.remove();
  }, [stop]);

  return {
    state,
    start,
    stop,
    cancel,
    submit,
  };
}
