import { useCallback, useEffect, useRef, useReducer } from 'react';
import { AppState } from 'react-native';
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioStream,
} from 'expo-audio';

import {
  createRecordingControllerState,
  reduceRecordingController,
} from '../recordingController';
import type { SimpleVadConfig } from '../simpleVad';

type UseNativeLessonRecordingOptions = {
  vadConfig?: Partial<SimpleVadConfig>;
  onAudioChunk?: (chunk: Uint8Array) => void;
};

const STREAM_CHUNK_BYTES = 640;

function estimateDbFromInt16Pcm(data: ArrayBuffer): number {
  const samples = new Int16Array(data);
  if (!samples.length) {
    return -160;
  }
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const normalized = samples[i] / 32768;
    sum += normalized * normalized;
  }
  const rms = Math.sqrt(sum / samples.length);
  if (rms <= 1e-7) {
    return -160;
  }
  return Math.max(-160, Math.min(0, 20 * Math.log10(rms)));
}

export function useNativeLessonRecording(options?: UseNativeLessonRecordingOptions) {
  const isCapturingRef = useRef(false);
  const startedAtMsRef = useRef(0);
  const streamBufferRef = useRef(new Uint8Array(0));
  const onAudioChunkRef = useRef(options?.onAudioChunk);
  const [state, dispatch] = useReducer(
    reduceRecordingController,
    options?.vadConfig,
    createRecordingControllerState,
  );
  onAudioChunkRef.current = options?.onAudioChunk;

  const { stream } = useAudioStream({
    sampleRate: 16_000,
    channels: 1,
    encoding: 'int16',
    onBuffer: (buffer) => {
      if (!isCapturingRef.current) {
        return;
      }
      const elapsedMs = Math.max(0, Math.round(buffer.timestamp * 1000));
      dispatch({
        type: 'metering',
        metering: estimateDbFromInt16Pcm(buffer.data),
        elapsedMs,
      });

      const callback = onAudioChunkRef.current;
      if (!callback) {
        return;
      }
      const incoming = new Uint8Array(buffer.data);
      const merged = new Uint8Array(streamBufferRef.current.length + incoming.length);
      merged.set(streamBufferRef.current, 0);
      merged.set(incoming, streamBufferRef.current.length);
      let offset = 0;
      while (offset + STREAM_CHUNK_BYTES <= merged.length) {
        const chunk = merged.slice(offset, offset + STREAM_CHUNK_BYTES);
        callback(chunk);
        offset += STREAM_CHUNK_BYTES;
      }
      streamBufferRef.current = merged.slice(offset);
    },
  });

  const flushBufferedAudio = useCallback(() => {
    const callback = onAudioChunkRef.current;
    const leftover = streamBufferRef.current;
    streamBufferRef.current = new Uint8Array(0);
    if (!callback || !leftover.length) {
      return;
    }
    callback(leftover);
  }, []);

  const stop = useCallback(async () => {
    if (!isCapturingRef.current) {
      return;
    }
    isCapturingRef.current = false;
    try {
      stream.stop();
      flushBufferedAudio();
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        shouldPlayInBackground: false,
      });
      dispatch({
        type: 'stop',
        uri: `stream://${Date.now()}`,
        durationMs: Math.max(0, Date.now() - startedAtMsRef.current),
      });
    } catch (error) {
      dispatch({
        type: 'error',
        message: error instanceof Error ? error.message : '录音停止失败。',
      });
    }
  }, [flushBufferedAudio, stream]);

  const start = useCallback(async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        dispatch({ type: 'permission_denied' });
        return;
      }
      dispatch({ type: 'permission_granted' });
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        shouldPlayInBackground: false,
      });
      streamBufferRef.current = new Uint8Array(0);
      await stream.start();
      startedAtMsRef.current = Date.now();
      isCapturingRef.current = true;
      dispatch({ type: 'start' });
    } catch (error) {
      isCapturingRef.current = false;
      dispatch({
        type: 'error',
        message: error instanceof Error ? error.message : '录音启动失败。',
      });
    }
  }, [stream]);

  const cancel = useCallback(async () => {
    try {
      isCapturingRef.current = false;
      stream.stop();
      streamBufferRef.current = new Uint8Array(0);
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        shouldPlayInBackground: false,
      });
    } catch {
      // no-op
    }
    dispatch({ type: 'cancel' });
  }, [stream]);

  const submit = useCallback(() => {
    dispatch({ type: 'submit' });
  }, []);

  const acknowledgeSubmit = useCallback(() => {
    dispatch({ type: 'acknowledge_submit' });
  }, []);

  useEffect(() => {
    if (state.shouldStopRecording) {
      stop();
    }
  }, [state.shouldStopRecording, stop]);

  useEffect(
    () => () => {
      isCapturingRef.current = false;
      stream.stop();
      streamBufferRef.current = new Uint8Array(0);
    },
    [stream],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && isCapturingRef.current) {
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
    acknowledgeSubmit,
  };
}
