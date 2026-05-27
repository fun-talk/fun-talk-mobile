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

import { courseHomeImages } from '../assets/courseHomeAssets';
import { clampByViewport } from '../layout/courseHomeLayout';

type CourseEnterLoadingOverlayProps = {
  visible: boolean;
  viewportWidth: number;
};

export function CourseEnterLoadingOverlay({
  visible,
  viewportWidth,
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

  const foxSize = Math.min(88, viewportWidth * 0.22);
  const labelSize = clampByViewport({ min: 16, vw: 0.024, max: 22 }, viewportWidth);

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <Animated.View style={foxStyle}>
            <Image
              source={courseHomeImages.fox}
              style={{ width: foxSize, height: foxSize * 1.1 }}
              contentFit="contain"
            />
          </Animated.View>
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
    minWidth: 220,
    paddingHorizontal: 36,
    paddingTop: 28,
    paddingBottom: 24,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignItems: 'center',
    gap: 18,
    shadowColor: '#0f59a4',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8,
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
