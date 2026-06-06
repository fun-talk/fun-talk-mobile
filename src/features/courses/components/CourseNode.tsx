import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text } from 'react-native';

import { getCourseButtonImageSource, courseHomeImages } from '../assets/courseHomeAssets';
import { clampByViewport } from '../layout/courseHomeLayout';
import { MAP_WIDTH, type CourseMapNode } from '@/shared/courseHomeMap';

type CourseNodeProps = {
  course: CourseMapNode;
  mapHeight: number;
  mapPixelHeight: number;
  mapWidth: number;
  viewportWidth: number;
  completed: boolean;
  current: boolean;
  disabled: boolean;
  onPress: () => void;
};

export function CourseNode({
  course,
  mapHeight,
  mapPixelHeight,
  mapWidth,
  viewportWidth,
  completed,
  current,
  disabled,
  onPress,
}: CourseNodeProps) {
  const nodeWidth = Math.max(62, mapWidth * 0.0662);
  const numberSize = clampByViewport({ min: 20, vw: 0.031, max: 62 }, viewportWidth);

  const centerX = (course.x / MAP_WIDTH) * mapWidth;
  const centerY = (course.y / mapHeight) * mapPixelHeight;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${course.title}${completed ? '，已完成，可复习' : current ? '，当前课程' : '，未解锁'}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.node,
        {
          width: nodeWidth,
          left: centerX - nodeWidth / 2,
          top: centerY - nodeWidth / 2,
          zIndex: current ? 4 : 2,
        },
        completed && styles.completed,
        !completed && !current && styles.locked,
        !disabled && pressed && styles.pressed,
      ]}
    >
      <Image
        source={getCourseButtonImageSource(completed)}
        style={styles.nodeImage}
        contentFit="contain"
      />
      <Text
        style={[
          styles.number,
          { fontSize: numberSize },
          completed ? styles.numberCompleted : styles.numberLocked,
        ]}
      >
        {course.number}
      </Text>
      {completed ? (
        <Image source={courseHomeImages.stars} style={styles.stars} contentFit="contain" />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  node: {
    position: 'absolute',
    backgroundColor: 'transparent',
    padding: 0,
  },
  completed: {},
  locked: {
    opacity: 0.98,
  },
  pressed: {
    transform: [{ translateY: -4 }, { scale: 1.06 }],
  },
  nodeImage: {
    width: '100%',
    aspectRatio: 1,
  },
  number: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '21%',
    color: '#ffffff',
    fontWeight: '900',
    lineHeight: undefined,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  numberCompleted: {
    textShadowColor: 'rgba(54, 125, 29, 0.38)',
  },
  numberLocked: {
    textShadowColor: 'rgba(84, 92, 104, 0.42)',
  },
  stars: {
    position: 'absolute',
    left: '14%',
    bottom: '18%',
    width: '72%',
    aspectRatio: 3,
  },
});
