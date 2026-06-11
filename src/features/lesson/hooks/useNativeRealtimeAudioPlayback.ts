import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  concatAudioChunks,
  createPcm16WavBytes,
} from '../nativeRealtimeAudio';
import { loadNativeExpoFileSystem } from '../nativeExpoModules';

const REALTIME_TTS_SAMPLE_RATE = 24_000;

type PlaybackStatus = 'idle' | 'buffering' | 'playing' | 'error';

export function useNativeRealtimeAudioPlayback(onPlaybackComplete: () => void) {
  const chunksRef = useRef<Uint8Array[]>([]);
  const playerRef = useRef<AudioPlayer | null>(null);
  const playerSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const sequenceRef = useRef(0);
  const onPlaybackCompleteRef = useRef(onPlaybackComplete);
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [errorText, setErrorText] = useState('');

  const releasePlayer = useCallback(() => {
    playerSubscriptionRef.current?.remove();
    playerSubscriptionRef.current = null;
    playerRef.current?.remove();
    playerRef.current = null;
  }, []);

  const ensurePlaybackAudioMode = useCallback(async () => {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
      shouldPlayInBackground: false,
    });
  }, []);

  const startPlayer = useCallback(
    async (source: string, onComplete?: () => void) => {
      await ensurePlaybackAudioMode();
      releasePlayer();

      const player = createAudioPlayer(source, { downloadFirst: true });
      playerRef.current = player;
      playerSubscriptionRef.current = player.addListener('playbackStatusUpdate', (playbackStatus) => {
        if (playbackStatus.didJustFinish) {
          setStatus('idle');
          if (onComplete) {
            onComplete();
          } else {
            onPlaybackCompleteRef.current();
          }
          releasePlayer();
        }
      });
      player.play();
      setStatus('playing');
    },
    [ensurePlaybackAudioMode, releasePlayer],
  );

  useEffect(() => {
    void ensurePlaybackAudioMode().catch(() => undefined);
  }, [ensurePlaybackAudioMode]);

  useEffect(() => {
    onPlaybackCompleteRef.current = onPlaybackComplete;
  }, [onPlaybackComplete]);

  const resetBuffer = useCallback(() => {
    chunksRef.current = [];
    setStatus('idle');
    setErrorText('');
  }, []);

  const pushPcmChunk = useCallback((chunk: Uint8Array) => {
    chunksRef.current.push(chunk);
    setStatus((current) => (current === 'playing' ? current : 'buffering'));
  }, []);

  const playBufferedPcm = useCallback(async (onComplete?: () => void) => {
    const pcm = concatAudioChunks(chunksRef.current);
    chunksRef.current = [];
    if (!pcm.byteLength) {
      setStatus('idle');
      if (onComplete) {
        onComplete();
      } else {
        onPlaybackCompleteRef.current();
      }
      return;
    }

    try {
      const { File, Paths } = await loadNativeExpoFileSystem();
      const wav = createPcm16WavBytes(pcm, {
        sampleRate: REALTIME_TTS_SAMPLE_RATE,
        channels: 1,
      });
      const file = new File(
        Paths.cache,
        `funtalk-realtime-tts-${Date.now()}-${sequenceRef.current}.wav`,
      );
      sequenceRef.current += 1;
      file.write(wav);
      await startPlayer(file.uri, onComplete);
    } catch (error) {
      setStatus('error');
      setErrorText(error instanceof Error ? error.message : 'Realtime audio 播放失败。');
      if (onComplete) {
        onComplete();
      } else {
        onPlaybackCompleteRef.current();
      }
    }
  }, [startPlayer]);

  const playRemoteUrl = useCallback(
    async (url: string, onComplete?: () => void) => {
      const normalizedUrl = url.trim();
      if (!normalizedUrl) {
        if (onComplete) {
          onComplete();
        } else {
          onPlaybackCompleteRef.current();
        }
        return;
      }

      try {
        await startPlayer(normalizedUrl, onComplete);
      } catch (error) {
        setStatus('error');
        setErrorText(error instanceof Error ? error.message : 'Realtime voiceUrl 播放失败。');
        if (onComplete) {
          onComplete();
        } else {
          onPlaybackCompleteRef.current();
        }
      }
    },
    [startPlayer],
  );

  useEffect(
    () => () => {
      chunksRef.current = [];
      releasePlayer();
    },
    [releasePlayer],
  );

  return {
    status,
    errorText,
    pushPcmChunk,
    playBufferedPcm,
    playRemoteUrl,
    resetBuffer,
  };
}
