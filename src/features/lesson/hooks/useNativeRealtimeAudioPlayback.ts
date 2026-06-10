import { useCallback, useEffect, useRef, useState } from 'react';

import {
  concatAudioChunks,
  createPcm16WavBytes,
} from '../nativeRealtimeAudio';
import { loadNativeExpoAv } from '../nativeExpoAv';
import { loadNativeExpoFileSystem } from '../nativeExpoModules';

const REALTIME_TTS_SAMPLE_RATE = 24_000;

type PlaybackStatus = 'idle' | 'buffering' | 'playing' | 'error';

export function useNativeRealtimeAudioPlayback(onPlaybackComplete: () => void) {
  const chunksRef = useRef<Uint8Array[]>([]);
  const soundRef = useRef<{
    unloadAsync: () => Promise<unknown>;
    setOnPlaybackStatusUpdate: (callback: (status: { isLoaded: boolean; didJustFinish?: boolean }) => void) => void;
  } | null>(null);
  const sequenceRef = useRef(0);
  const onPlaybackCompleteRef = useRef(onPlaybackComplete);
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [errorText, setErrorText] = useState('');

  const ensurePlaybackAudioMode = useCallback(async () => {
    const { Audio } = await loadNativeExpoAv();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    return Audio;
  }, []);

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

  const playBufferedPcm = useCallback(async () => {
    const pcm = concatAudioChunks(chunksRef.current);
    chunksRef.current = [];
    if (!pcm.byteLength) {
      setStatus('idle');
      onPlaybackCompleteRef.current();
      return;
    }

    try {
      const Audio = await ensurePlaybackAudioMode();
      const { File, Paths } = await loadNativeExpoFileSystem();
      await soundRef.current?.unloadAsync();
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
      const { sound } = await Audio.Sound.createAsync({ uri: file.uri }, { shouldPlay: true });
      soundRef.current = sound;
      setStatus('playing');
      sound.setOnPlaybackStatusUpdate((playbackStatus) => {
        if (playbackStatus.isLoaded && playbackStatus.didJustFinish) {
          setStatus('idle');
          onPlaybackCompleteRef.current();
          void sound.unloadAsync();
          if (soundRef.current === sound) {
            soundRef.current = null;
          }
        }
      });
    } catch (error) {
      setStatus('error');
      setErrorText(error instanceof Error ? error.message : 'Realtime audio 播放失败。');
    }
  }, []);

  const playRemoteUrl = useCallback(async (url: string) => {
    const normalizedUrl = url.trim();
    if (!normalizedUrl) {
      onPlaybackCompleteRef.current();
      return;
    }

    try {
      const Audio = await ensurePlaybackAudioMode();
      await soundRef.current?.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(
        { uri: normalizedUrl },
        { shouldPlay: true },
      );
      soundRef.current = sound;
      setStatus('playing');
      sound.setOnPlaybackStatusUpdate((playbackStatus) => {
        if (playbackStatus.isLoaded && playbackStatus.didJustFinish) {
          setStatus('idle');
          onPlaybackCompleteRef.current();
          void sound.unloadAsync();
          if (soundRef.current === sound) {
            soundRef.current = null;
          }
        }
      });
    } catch (error) {
      setStatus('error');
      setErrorText(error instanceof Error ? error.message : 'Realtime voiceUrl 播放失败。');
      onPlaybackCompleteRef.current();
    }
  }, [ensurePlaybackAudioMode]);

  useEffect(
    () => () => {
      chunksRef.current = [];
      void soundRef.current?.unloadAsync();
      soundRef.current = null;
    },
    [],
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
