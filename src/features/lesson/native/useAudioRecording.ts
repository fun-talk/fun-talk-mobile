/**
 * Audio recording hook using expo-av Audio.Recording.
 * Replaces the web's getUserMedia + ScriptProcessorNode pattern.
 *
 * Web pattern:
 *   const stream = await navigator.mediaDevices.getUserMedia({ audio: {...} });
 *   const ctx = new AudioContext({ sampleRate: 16000 });
 *   const processor = ctx.createScriptProcessor(1024, 1, 1);
 *   processor.onaudioprocess = (e) => { const pcm = float32ToInt16(...); };
 *
 * Native pattern (expo-av):
 *   const recording = new Audio.Recording();
 *   await recording.prepareToRecordAsync(options);
 *   await recording.startAsync();
 *   // ... later:
 *   await recording.stopAndUnloadAsync();
 *   const uri = recording.getURI();
 *
 * Note: expo-av Audio.Recording writes to a file, not raw PCM chunks.
 * For real-time audio streaming to WebSocket, a lower-level approach
 * (e.g. react-native-audio-api or native module) would be needed.
 * This hook covers the basic record-to-file use case.
 */

import { useCallback, useRef, useState } from "react";
import { Audio } from "expo-av";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CAPTURE_SAMPLE_RATE = 16000;

const DEFAULT_RECORDING_OPTIONS = {
  isMeteringEnabled: true,
  keepAudioActiveHint: true,
  android: {
    extension: ".wav",
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: CAPTURE_SAMPLE_RATE,
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: ".wav",
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.MAX,
    sampleRate: CAPTURE_SAMPLE_RATE,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/wav",
    bitsPerSecond: 256000,
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AudioRecordingCallbacks {
  onStart?: () => void;
  onStop?: (uri: string) => void;
  onError?: (error: string) => void;
  onMeter?: (level: number) => void;
}

// ---------------------------------------------------------------------------
// Permission helper
// ---------------------------------------------------------------------------

export async function requestAudioPermission(): Promise<boolean> {
  try {
    const { granted } = await Audio.requestPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// PCM conversion (for reading recorded WAV files)
// ---------------------------------------------------------------------------

/**
 * Convert Float32Array PCM samples to Int16Array.
 * Ported from the web's float32ToInt16 equivalent.
 */
export function pcmFloat32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i += 1) {
    const s = Math.max(-1, Math.min(1, float32[i] || 0));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

/**
 * Detect whether an audio frame contains speech (non-silence).
 * Simple energy-based VAD — threshold tuned for 16kHz 16-bit mono.
 */
export function isSpeechLikeFrame(
  float32: Float32Array,
  threshold = 0.005,
): boolean {
  let sum = 0;
  for (let i = 0; i < float32.length; i += 1) {
    sum += Math.abs(float32[i] || 0);
  }
  return sum / float32.length > threshold;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAudioRecording() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const callbacksRef = useRef<AudioRecordingCallbacks>({});
  const [isRecording, setIsRecording] = useState(false);

  const stopAndUnload = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
    } catch {
      // May already be stopped
    }
    recordingRef.current = null;
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(
    async (callbacks: AudioRecordingCallbacks = {}): Promise<boolean> => {
      const { onStart, onError } = callbacks;
      callbacksRef.current = callbacks;

      // Stop any existing recording
      await stopAndUnload();

      const hasPermission = await requestAudioPermission();
      if (!hasPermission) {
        onError?.("麦克风权限未授予");
        return false;
      }

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(DEFAULT_RECORDING_OPTIONS);
        await recording.startAsync();
        recordingRef.current = recording;
        setIsRecording(true);
        onStart?.();
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        onError?.(`录音启动失败: ${message}`);
        return false;
      }
    },
    [stopAndUnload],
  );

  const stopRecording = useCallback(async (): Promise<string | null> => {
    const recording = recordingRef.current;
    if (!recording) return null;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      // Restore audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      callbacksRef.current.onStop?.(uri ?? "");
      return uri ?? null;
    } catch (error) {
      recordingRef.current = null;
      setIsRecording(false);

      const message =
        error instanceof Error ? error.message : String(error);
      callbacksRef.current.onError?.(`录音停止失败: ${message}`);
      return null;
    }
  }, []);

  return {
    startRecording,
    stopRecording,
    stopAndUnload,
    isRecording,
    recordingRef,
  };
}
