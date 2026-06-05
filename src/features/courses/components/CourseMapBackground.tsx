import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { courseHomeImages } from '../assets/courseHomeAssets';
import {
  computeBackgroundTileCount,
  computeBackgroundTileHeight,
} from '../layout/courseHomeLayout';

type CourseMapBackgroundProps = {
  width: number;
  height: number;
};

export function CourseMapBackground({ width, height }: CourseMapBackgroundProps) {
  const tileHeight = computeBackgroundTileHeight(width);
  const tileCount = computeBackgroundTileCount(width, height);

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      {Array.from({ length: tileCount }, (_, index) => (
        <Image
          key={index}
          source={courseHomeImages.background}
          style={{
            position: 'absolute',
            top: index * tileHeight,
            width,
            height: tileHeight,
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
