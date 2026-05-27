import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { courseHomeImages } from '../assets/courseHomeAssets';

type CourseMapBackgroundProps = {
  width: number;
  height: number;
  segmentCount: number;
};

export function CourseMapBackground({ width, height, segmentCount }: CourseMapBackgroundProps) {
  const safeSegmentCount = Math.max(1, segmentCount);
  const segmentHeight = height / safeSegmentCount;

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      {Array.from({ length: safeSegmentCount }, (_, index) => (
        <Image
          key={index}
          source={courseHomeImages.background}
          style={{
            position: 'absolute',
            top: index * segmentHeight,
            width,
            height: segmentHeight,
          }}
          contentFit="fill"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: '#25b8dd',
    zIndex: 0,
  },
});
