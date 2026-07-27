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
  segmentCount: number;
};

export function CourseMapBackground({ width, height, segmentCount }: CourseMapBackgroundProps) {
  const tileHeight = computeBackgroundTileHeight(width);
  const tileCount = computeBackgroundTileCount(width, height);
  const pathWidth = (width * 609) / 851;

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      {Array.from({ length: tileCount }, (_, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            top: index * tileHeight,
            width,
            height: tileHeight,
            overflow: 'hidden',
          }}
        >
          <Image
            source={courseHomeImages.background}
            style={StyleSheet.absoluteFill}
            contentFit="fill"
          />
          {index < segmentCount ? (
            <Image
              source={courseHomeImages.path}
              style={{
                position: 'absolute',
                top: (tileHeight * 100) / 1280,
                left: (width - pathWidth) / 2,
                width: pathWidth,
                height: (width * 1372) / 851,
              }}
              contentFit="fill"
            />
          ) : null}
        </View>
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
