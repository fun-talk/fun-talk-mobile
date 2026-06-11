import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { NativeLessonControllerView } from '../nativeLessonController';
import {
  buildNativeLessonMediaView,
  shouldAcceptMediaCompletion,
} from '../nativeLessonMedia';
import { NativeLessonVideoPlayer } from './NativeLessonVideoPlayer';

type CourseMediaAreaProps = {
  controllerView: NativeLessonControllerView;
  titleFontSize: number;
  captionFontSize: number;
  onComplete: () => void;
  onError?: (message: string) => void;
};

export function CourseMediaArea({
  controllerView,
  titleFontSize,
  captionFontSize,
  onComplete,
}: CourseMediaAreaProps) {
  const completedPlaybackKeysRef = useRef(new Set<string>());
  const mediaView = useMemo(
    () => buildNativeLessonMediaView(controllerView),
    [controllerView],
  );

  const completeCurrentMedia = useCallback(() => {
    if (
      mediaView.kind === 'video' &&
      shouldAcceptMediaCompletion(completedPlaybackKeysRef.current, mediaView.playbackKey)
    ) {
      onComplete();
    }
  }, [mediaView.kind, mediaView.playbackKey, onComplete]);

  useEffect(() => {
    if (mediaView.kind !== 'video' || !mediaView.shouldPlay) {
      return undefined;
    }
    const timeout = setTimeout(completeCurrentMedia, 90_000);
    return () => clearTimeout(timeout);
  }, [completeCurrentMedia, mediaView.kind, mediaView.shouldPlay]);

  if (mediaView.kind === 'image') {
    return (
      <Image
        source={{ uri: mediaView.uri }}
        style={styles.fill}
        cachePolicy="memory-disk"
        contentFit="contain"
        recyclingKey={mediaView.playbackKey}
      />
    );
  }

  if (mediaView.kind === 'video') {
    return (
      <NativeLessonVideoPlayer
        uri={mediaView.uri}
        playbackKey={mediaView.playbackKey}
        shouldPlay={mediaView.shouldPlay}
        onComplete={completeCurrentMedia}
      />
    );
  }

  return (
    <View style={styles.placeholder}>
      <Text style={[styles.placeholderTitle, { fontSize: titleFontSize }]}>课程媒体</Text>
      <Text style={[styles.placeholderText, { fontSize: captionFontSize }]}>
        等待当前媒体内容
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  placeholderTitle: {
    color: '#f8fafc',
    fontWeight: '900',
  },
  placeholderText: {
    marginTop: 8,
    color: '#cbd5e1',
    textAlign: 'center',
  },
});
