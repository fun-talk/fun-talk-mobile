/**
 * Audio playback hook using expo-av Audio.Sound.
 * Replaces the web's HTMLAudioElement pattern (new Audio(url) + play()).
 *
 * Web pattern:
 *   const audio = new Audio(url);
 *   audio.onplay = () => { ... };
 *   audio.onended = () => { ... };
 *   audio.onerror = () => { ... };
 *   void audio.play();
 *
 * Native pattern (expo-av):
 *   const { sound } = await Audio.Sound.createAsync({ uri: url });
 *   sound.setOnPlaybackStatusUpdate((status) => { ... });
 *   await sound.playAsync();
 */

import { useCallback, useRef } from "react";
import { Audio } from "expo-av";
import type { AVPlaybackStatus, AVPlaybackStatusError } from "expo-av";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AudioPlaybackCallbacks {
  onPlay?: () => void;
  onDone?: () => void;
  onError?: (error: string) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAudioPlayback() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const activeCallbacksRef = useRef<AudioPlaybackCallbacks>({});

  const stopPlayback = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;

    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
    } catch {
      // Sound may already be unloaded
    }

    soundRef.current = null;
    activeCallbacksRef.current = {};
  }, []);

  const playAudio = useCallback(
    async (
      source: { uri: string } | number,
      callbacks: AudioPlaybackCallbacks = {},
    ): Promise<void> => {
      // Stop any currently playing audio
      await stopPlayback();

      const { onError } = callbacks;
      activeCallbacksRef.current = callbacks;

      try {
        const { sound } = await Audio.Sound.createAsync(
          typeof source === "number" ? source : { uri: source.uri },
          { shouldPlay: false },
          (status: AVPlaybackStatus) => {
            if (!status.isLoaded) {
              // Error status
              const errorStatus = status as AVPlaybackStatusError;
              if (errorStatus.error) {
                activeCallbacksRef.current.onError?.(
                  `音频播放错误: ${errorStatus.error}`,
                );
                void stopPlayback();
              }
              return;
            }

            if (status.didJustFinish) {
              activeCallbacksRef.current.onDone?.();
              void stopPlayback();
              return;
            }

            if (status.isPlaying && !status.isBuffering) {
              // Trigger onPlay only once when playback actually starts
              if (status.positionMillis > 0 && status.positionMillis < 200) {
                activeCallbacksRef.current.onPlay?.();
              }
            }
          },
        );

        soundRef.current = sound;
        await sound.playAsync();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        onError?.(`音频加载失败: ${message}`);
        soundRef.current = null;
      }
    },
    [stopPlayback],
  );

  const preloadAudio = useCallback(
    async (
      source: { uri: string } | number,
    ): Promise<Audio.Sound | null> => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          typeof source === "number" ? source : { uri: source.uri },
          { shouldPlay: false },
        );
        return sound;
      } catch (error) {
        console.warn(
          "preload audio failed:",
          error instanceof Error ? error.message : error,
        );
        return null;
      }
    },
    [],
  );

  const isPlaying = useCallback(async (): Promise<boolean> => {
    const sound = soundRef.current;
    if (!sound) return false;

    try {
      const status = await sound.getStatusAsync();
      return status.isLoaded && status.isPlaying;
    } catch {
      return false;
    }
  }, []);

  return {
    playAudio,
    stopPlayback,
    preloadAudio,
    isPlaying,
    soundRef,
  };
}
