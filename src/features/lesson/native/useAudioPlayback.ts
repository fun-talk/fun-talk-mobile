/**
 * Audio playback hook using expo-audio AudioPlayer.
 * Replaces the web's HTMLAudioElement pattern (new Audio(url) + play()).
 *
 * Web pattern:
 *   const audio = new Audio(url);
 *   audio.onplay = () => { ... };
 *   audio.onended = () => { ... };
 *   audio.onerror = () => { ... };
 *   void audio.play();
 *
 * Native pattern (expo-audio):
 *   const player = createAudioPlayer({ uri: url });
 *   player.addListener("playbackStatusUpdate", (status) => { ... });
 *   player.play();
 */

import { useCallback, useRef } from "react";
import {
  createAudioPlayer,
  type AudioPlayer,
  type AudioSource,
  type AudioStatus,
} from "expo-audio";

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
  const playerRef = useRef<AudioPlayer | null>(null);
  const playbackSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const activeCallbacksRef = useRef<AudioPlaybackCallbacks>({});
  const didNotifyPlayRef = useRef(false);

  const stopPlayback = useCallback(async () => {
    const player = playerRef.current;
    if (!player) return;

    try {
      player.pause();
      player.remove();
    } catch {
      // Player may already be removed
    }

    playbackSubscriptionRef.current?.remove();
    playbackSubscriptionRef.current = null;
    playerRef.current = null;
    activeCallbacksRef.current = {};
    didNotifyPlayRef.current = false;
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
        const audioSource: AudioSource =
          typeof source === "number" ? source : { uri: source.uri };
        const player = createAudioPlayer(audioSource, { updateInterval: 100 });
        playbackSubscriptionRef.current = player.addListener(
          "playbackStatusUpdate",
          (status: AudioStatus) => {
            if (!status.isLoaded) {
              return;
            }

            if (status.didJustFinish) {
              activeCallbacksRef.current.onDone?.();
              void stopPlayback();
              return;
            }

            if (
              status.playing &&
              !status.isBuffering &&
              status.currentTime > 0 &&
              !didNotifyPlayRef.current
            ) {
              didNotifyPlayRef.current = true;
              activeCallbacksRef.current.onPlay?.();
            }
          },
        );

        playerRef.current = player;
        player.play();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        onError?.(`音频加载失败: ${message}`);
        playerRef.current = null;
      }
    },
    [stopPlayback],
  );

  const preloadAudio = useCallback(
    async (
      source: { uri: string } | number,
    ): Promise<AudioPlayer | null> => {
      try {
        return createAudioPlayer(
          typeof source === "number" ? source : { uri: source.uri },
          { downloadFirst: true },
        );
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
    return Boolean(playerRef.current?.playing);
  }, []);

  return {
    playAudio,
    stopPlayback,
    preloadAudio,
    isPlaying,
    playerRef,
  };
}
