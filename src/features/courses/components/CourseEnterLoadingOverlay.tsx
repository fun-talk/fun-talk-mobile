import { Image } from 'expo-image';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { LANDSCAPE_MODAL_ORIENTATIONS } from '@/constants/orientation';
import { courseHomeImages } from '../assets/courseHomeAssets';
import { clampByViewport } from '../layout/courseHomeLayout';

type CourseEnterLoadingOverlayProps = {
  visible: boolean;
  viewportWidth: number;
  title?: string;
  coverImageUrl?: string;
};

export function CourseEnterLoadingOverlay({
  visible,
  viewportWidth,
  title = '',
  coverImageUrl = '',
}: CourseEnterLoadingOverlayProps) {
  const bounce = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    bounce.value = withRepeat(
      withTiming(-8, { duration: 500, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    spin.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1, false);
  }, [bounce, spin, visible]);

  const foxStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }],
  }));

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  if (!visible) return null;

  const coverSize = Math.min(128, Math.max(96, viewportWidth * 0.32));
  const normalizedTitle = title.trim();
  const normalizedCoverImageUrl = coverImageUrl.trim();
  const coverSource = normalizedCoverImageUrl
    ? { uri: normalizedCoverImageUrl }
    : courseHomeImages.fox;
  const titleSize = clampByViewport({ min: 18, vw: 0.03, max: 28 }, viewportWidth);
  const labelSize = clampByViewport({ min: 16, vw: 0.024, max: 22 }, viewportWidth);

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      supportedOrientations={LANDSCAPE_MODAL_ORIENTATIONS}
    >
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <Animated.View
            style={[
              styles.coverWrap,
              foxStyle,
              {
                width: coverSize,
                height: coverSize,
                borderRadius: coverSize * 0.25,
              },
            ]}
          >
            <Image
              source={coverSource}
              style={styles.coverImage}
              contentFit={normalizedCoverImageUrl ? 'cover' : 'contain'}
            />
          </Animated.View>
          {normalizedTitle ? (
            <Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={3}>
              {normalizedTitle}
            </Text>
          ) : null}
          <Animated.View style={[styles.spinner, spinnerStyle]} />
          <Text style={[styles.label, { fontSize: labelSize }]}>正在进入课程...</Text>
        </View>
      </View>
    </Modal>
  );
}

export function CourseHomeLoadingState({ label = '正在加载课程...' }: { label?: string }) {
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color="#1760c4" />
      <Text style={styles.loadingLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 184, 221, 0.92)',
  },
  panel: {
    width: '86%',
    maxWidth: 460,
    minWidth: 220,
    paddingHorizontal: 32,
    paddingTop: 34,
    paddingBottom: 28,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#0f59a4',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8,
  },
  coverWrap: {
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    backgroundColor: 'rgba(230, 248, 253, 0.92)',
    shadowColor: '#1054a6',
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    width: '100%',
    color: '#1559b8',
    fontWeight: '900',
    lineHeight: undefined,
    textAlign: 'center',
  },
  spinner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 4,
    borderColor: 'rgba(23, 96, 196, 0.16)',
    borderTopColor: '#1760c4',
  },
  label: {
    color: '#1760c4',
    fontWeight: '800',
    letterSpacing: 0.64,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25b8dd',
    gap: 12,
  },
  loadingLabel: {
    color: '#1760c4',
    fontSize: 18,
    fontWeight: '700',
  },
});
