import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { NativeLessonControllerView } from '../nativeLessonController';
import {
  buildNativeLessonMediaView,
  shouldAcceptMediaCompletion,
  shouldAttemptNativeLessonVideoPlayback,
  shouldCompleteNativeLessonVideoPlayback,
} from '../nativeLessonMedia';
import { loadNativeExpoAv, type NativeExpoAvModule, type NativeExpoVideoRef } from '../nativeExpoAv';

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
  onError,
}: CourseMediaAreaProps) {
  const completedPlaybackKeysRef = useRef(new Set<string>());
  const playAttemptCountsRef = useRef(new Map<string, number>());
  const reportedErrorKeysRef = useRef(new Set<string>());
  const hasLoadedCurrentVideoRef = useRef(false);
  const [expoAv, setExpoAv] = useState<NativeExpoAvModule | null>(null);
  const [videoErrorText, setVideoErrorText] = useState('');
  const mediaView = useMemo(
    () => buildNativeLessonMediaView(controllerView),
    [controllerView],
  );
  const videoRef = useRef<NativeExpoVideoRef | null>(null);

  const completeCurrentMedia = useCallback(() => {
    if (
      mediaView.kind === 'video' &&
      shouldAcceptMediaCompletion(completedPlaybackKeysRef.current, mediaView.playbackKey)
    ) {
      onComplete();
    }
  }, [mediaView.kind, mediaView.playbackKey, onComplete]);

  const attemptCurrentVideoPlayback = useCallback(() => {
    if (mediaView.kind !== 'video' || !mediaView.shouldPlay) {
      return;
    }
    const attempts = playAttemptCountsRef.current.get(mediaView.playbackKey) ?? 0;
    if (attempts >= 3) {
      return;
    }
    playAttemptCountsRef.current.set(mediaView.playbackKey, attempts + 1);
    void videoRef.current?.playAsync().catch(() => undefined);
  }, [mediaView.kind, mediaView.playbackKey, mediaView.shouldPlay]);

  const handleVideoRef = useCallback(
    (instance: NativeExpoVideoRef | null) => {
      videoRef.current = instance;
      if (instance && hasLoadedCurrentVideoRef.current) {
        attemptCurrentVideoPlayback();
      }
    },
    [attemptCurrentVideoPlayback],
  );

  useEffect(() => {
    if (mediaView.kind !== 'video') {
      return undefined;
    }
    let cancelled = false;
    hasLoadedCurrentVideoRef.current = false;
    setVideoErrorText('');
    void loadNativeExpoAv()
      .then((module) => {
        if (!cancelled) {
          setExpoAv(module);
        }
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Native video module is unavailable.';
        if (!cancelled) {
          setVideoErrorText(message);
        }
        if (!reportedErrorKeysRef.current.has(mediaView.playbackKey)) {
          reportedErrorKeysRef.current.add(mediaView.playbackKey);
          onError?.(message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mediaView.kind, mediaView.playbackKey, onError]);

  useEffect(() => {
    if (mediaView.kind !== 'video' || !mediaView.shouldPlay) {
      return undefined;
    }
    const timeout = setTimeout(completeCurrentMedia, 90_000);
    return () => clearTimeout(timeout);
  }, [completeCurrentMedia, mediaView.kind, mediaView.shouldPlay]);

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      void video?.unloadAsync().catch(() => undefined);
    };
  }, [mediaView.playbackKey]);

  const handlePlaybackStatusUpdate = (
    status: Parameters<typeof shouldAttemptNativeLessonVideoPlayback>[0] &
      Parameters<typeof shouldCompleteNativeLessonVideoPlayback>[0],
  ) => {
    if (
      mediaView.kind === 'video' &&
      shouldAttemptNativeLessonVideoPlayback(status, mediaView.shouldPlay)
    ) {
      attemptCurrentVideoPlayback();
    }
    if (
      mediaView.kind === 'video' &&
      shouldCompleteNativeLessonVideoPlayback(status)
    ) {
      completeCurrentMedia();
    }
  };

  const handleVideoLoad = () => {
    hasLoadedCurrentVideoRef.current = true;
    attemptCurrentVideoPlayback();
  };

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
    if (!expoAv) {
      return (
        <View style={styles.placeholder}>
          <Text style={[styles.placeholderTitle, { fontSize: titleFontSize }]}>课程视频</Text>
          <Text style={[styles.placeholderText, { fontSize: captionFontSize }]}>
            {videoErrorText || '正在准备 Native 视频模块'}
          </Text>
        </View>
      );
    }
    const Video = expoAv.Video;
    return (
      <Video
        ref={handleVideoRef}
        key={mediaView.playbackKey}
        source={{ uri: mediaView.uri }}
        style={styles.fill}
        resizeMode={expoAv.ResizeMode.CONTAIN}
        shouldPlay={mediaView.shouldPlay}
        isLooping={false}
        onLoad={handleVideoLoad}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onError={completeCurrentMedia}
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
