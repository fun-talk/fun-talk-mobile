import type { AVPlaybackStatus } from 'expo-av';
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import { useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { NativeLessonControllerView } from '../nativeLessonController';
import {
  buildNativeLessonMediaView,
  shouldAcceptMediaCompletion,
} from '../nativeLessonMedia';

type CourseMediaAreaProps = {
  controllerView: NativeLessonControllerView;
  titleFontSize: number;
  captionFontSize: number;
  onComplete: () => void;
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

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (
      mediaView.kind === 'video' &&
      status.isLoaded &&
      status.didJustFinish &&
      shouldAcceptMediaCompletion(completedPlaybackKeysRef.current, mediaView.playbackKey)
    ) {
      onComplete();
    }
  };

  if (mediaView.kind === 'image') {
    return (
      <Image
        source={{ uri: mediaView.uri }}
        style={styles.fill}
        contentFit="contain"
      />
    );
  }

  if (mediaView.kind === 'video') {
    return (
      <Video
        key={mediaView.playbackKey}
        source={{ uri: mediaView.uri }}
        style={styles.fill}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={mediaView.shouldPlay}
        useNativeControls
        isLooping={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
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

