import { Audio } from 'expo-av';
import { File, Paths } from 'expo-file-system';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  concatAudioChunks,
  createPcm16WavBytes,
} from '../nativeRealtimeAudio';

const REALTIME_TTS_SAMPLE_RATE = 24_000;

type PlaybackStatus = 'idle' | 'buffering' | 'playing' | 'error';

export function useNativeRealtimeAudioPlayback(onPlaybackComplete: () => void) {
  const chunksRef = useRef<Uint8Array[]>([]);
  const soundRef = useRef<Audio.Sound | null>(null);
  const sequenceRef = useRef(0);
  const onPlaybackCompleteRef = useRef(onPlaybackComplete);
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    void Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => undefined);
  }, []);

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
  }, []);

  const speakTextFallback = useCallback(async (text: string) => {
    const normalizedText = text.trim();
    if (!normalizedText) {
      onPlaybackCompleteRef.current();
      return;
    }

    try {
      await soundRef.current?.unloadAsync();
      soundRef.current = null;
      Speech.stop();
      setStatus('playing');
      setErrorText('');
      Speech.speak(normalizedText, {
        language: 'zh-CN',
        rate: 0.92,
        onDone: () => {
          setStatus('idle');
          onPlaybackCompleteRef.current();
        },
        onStopped: () => {
          setStatus('idle');
          onPlaybackCompleteRef.current();
        },
        onError: () => {
          setStatus('error');
          setErrorText('Native TTS 播放失败。');
          onPlaybackCompleteRef.current();
        },
      });
    } catch (error) {
      setStatus('error');
      setErrorText(error instanceof Error ? error.message : 'Native TTS 播放失败。');
      onPlaybackCompleteRef.current();
    }
  }, []);

  useEffect(
    () => () => {
      chunksRef.current = [];
      Speech.stop();
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
    speakTextFallback,
    resetBuffer,
  };
}
