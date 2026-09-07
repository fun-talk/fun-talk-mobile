import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const openingImage = require('../../assets/images/opening.png');

type Props = {
  /** Called once the exit animation is complete. */
  onFinish?: () => void;
};

export function OpeningAnimation({ onFinish }: Props) {
  const exitOpacity = useSharedValue(1);

  useEffect(() => {
    exitOpacity.value = withDelay(
      2800,
      withTiming(0, { duration: 500 }, (finished) => {
        if (finished && onFinish) {
          runOnJS(onFinish)();
        }
      }),
    );
  }, [exitOpacity, onFinish]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: exitOpacity.value,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, containerStyle]} pointerEvents="none">
      <Image source={openingImage} style={StyleSheet.absoluteFill} contentFit="cover" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 999,
    elevation: 30,
    backgroundColor: '#FFA33F',
  },
});
