import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';

import {
  shouldAttemptNativeLessonVideoPlayback,
  shouldCompleteNativeLessonVideoPlayback,
} from '../nativeLessonMedia';

type NativeLessonVideoPlayerProps = {
  uri: string;
  playbackKey: string;
  shouldPlay: boolean;
  onComplete: () => void;
};

function mapVideoPlaybackStatus(player: ReturnType<typeof useVideoPlayer>) {
  return {
    isLoaded: player.status === 'readyToPlay',
    isPlaying: player.playing,
    didJustFinish: false,
    durationMillis: player.duration > 0 ? player.duration * 1000 : undefined,
    positionMillis: player.currentTime > 0 ? player.currentTime * 1000 : undefined,
    error: player.status === 'error' ? 'playback-error' : undefined,
  };
}

export function NativeLessonVideoPlayer({
  uri,
  playbackKey,
  shouldPlay,
  onComplete,
}: NativeLessonVideoPlayerProps) {
  const playAttemptCountsRef = useRef(0);
  const player = useVideoPlayer({ uri }, (instance) => {
    instance.loop = false;
  });

  const attemptPlayback = useCallback(() => {
    if (!shouldPlay || player.status !== 'readyToPlay' || player.playing) {
      return;
    }
    if (playAttemptCountsRef.current >= 3) {
      return;
    }
    playAttemptCountsRef.current += 1;
    player.play();
  }, [player, shouldPlay]);

  const handleStatusUpdate = useCallback(() => {
    const status = mapVideoPlaybackStatus(player);
    if (shouldAttemptNativeLessonVideoPlayback(status, shouldPlay)) {
      attemptPlayback();
    }
    if (shouldCompleteNativeLessonVideoPlayback(status)) {
      onComplete();
    }
  }, [attemptPlayback, onComplete, player, shouldPlay]);

  useEventListener(player, 'statusChange', handleStatusUpdate);
  useEventListener(player, 'timeUpdate', handleStatusUpdate);
  useEventListener(player, 'playToEnd', onComplete);

  useEffect(() => {
    playAttemptCountsRef.current = 0;
  }, [playbackKey]);

  useEffect(() => {
    attemptPlayback();
  }, [attemptPlayback, playbackKey]);

  return (
    <VideoView
      player={player}
      style={styles.fill}
      contentFit="contain"
      nativeControls={false}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
});
