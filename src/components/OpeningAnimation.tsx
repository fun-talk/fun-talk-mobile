import { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const FOX_SIZE = Math.min(220, SCREEN_W * 0.52);
const LOGO_WIDTH = Math.min(260, SCREEN_W * 0.62);
const LOGO_HEIGHT = LOGO_WIDTH * 0.38;

const foxImage = require('../../assets/images/login/fox-register.png');
const logoImage = require('../../assets/images/login/logo.png');

type Props = {
  /** Called once the exit animation is complete. */
  onFinish?: () => void;
};

export function OpeningAnimation({ onFinish }: Props) {
  const logoOpacity = useSharedValue(0);
  const logoY = useSharedValue(40);
  const logoScale = useSharedValue(0.8);

  const exitOpacity = useSharedValue(1);

  // ── kick off entrance sequence ──
  useEffect(() => {
    logoOpacity.value = withDelay(450, withTiming(1, { duration: 500 }));
    logoY.value = withDelay(450, withTiming(0, { duration: 500 }));
    logoScale.value = withDelay(500, withTiming(1, { duration: 500 }));

    // Exit: fade everything out after ~2.8s
    exitOpacity.value = withDelay(
      2800,
      withTiming(0, { duration: 500 }, (finished) => {
        if (finished && onFinish) {
          runOnJS(onFinish)();
        }
      }),
    );
  }, [logoOpacity, logoY, logoScale, exitOpacity, onFinish]);

  // ── animated styles ──
  const containerStyle = useAnimatedStyle(() => ({
    opacity: exitOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }, { scale: logoScale.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, containerStyle]} pointerEvents="none">
      {/* Gradient-like background layers */}
      <View style={styles.bgBase} />
      <View style={styles.bgGlow} />

      {/* Decorative circles */}
      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />
      <View style={[styles.circle, styles.circle3]} />

      {/* Main content */}
      <View style={styles.content}>
        <View>
          <Image
            source={foxImage}
            style={{ width: FOX_SIZE, height: FOX_SIZE * 1.05 }}
            contentFit="contain"
          />
        </View>

        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <Image
            source={logoImage}
            style={{ width: LOGO_WIDTH, height: LOGO_HEIGHT }}
            contentFit="contain"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 999,
    elevation: 30,
  },
  bgBase: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FF8C42',
  },
  bgGlow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFD166',
    opacity: 0.45,
    // Radial glow effect via large blurred circle would need native,
    // so we use a semi-transparent overlay for warmth
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.15,
  },
  circle1: {
    width: 300,
    height: 300,
    top: -60,
    right: -80,
    backgroundColor: '#fff',
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: 80,
    left: -60,
    backgroundColor: '#FFD166',
  },
  circle3: {
    width: 140,
    height: 140,
    top: SCREEN_H * 0.35,
    right: -30,
    backgroundColor: '#fff',
    opacity: 0.1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: SCREEN_H * 0.06,
  },
  logoWrap: {
    marginTop: -6,
  },
});
