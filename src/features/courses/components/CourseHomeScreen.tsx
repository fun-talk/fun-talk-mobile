import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';

import { useAuth } from '@/features/auth';
import { MAP_WIDTH } from '@/shared/courseHomeMap';

import { courseHomeImages } from '../assets/courseHomeAssets';
import { CourseEnterLoadingOverlay, CourseHomeLoadingState } from './CourseEnterLoadingOverlay';
import { CourseMapBackground } from './CourseMapBackground';
import { CourseNode } from './CourseNode';
import { CourseToolbar } from './CourseToolbar';
import { useCourseHome } from '../hooks/useCourseHome';
import { useLogoutTimer } from '../hooks/useLogoutTimer';
import {
  clampByViewport,
  computeContinueWidth,
  computeFoxWidth,
  computeTipWidth,
  isLandscapeTablet,
} from '../layout/courseHomeLayout';

export function CourseHomeScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { auth, apiClient, logout } = useAuth();
  const landscapeTablet = isLandscapeTablet(width, height);

  const {
    scrollRef,
    isLoadingLessons,
    lessonLoadFailed,
    isEnteringCourse,
    isLoggingOut,
    totalCourses,
    mapHeight,
    mapSegmentCount,
    mapPixelHeight,
    mapPixelWidth,
    completedSet,
    courseNodes,
    currentCourse,
    userName,
    handleCourseClick,
    handleContinue,
    handleLogout,
    refreshCourseHome,
  } = useCourseHome({
    apiClient,
    auth,
    logout,
    viewportWidth: width,
    viewportHeight: height,
  });

  const onForceLogout = useCallback(() => {
    void handleLogout();
  }, [handleLogout]);

  useLogoutTimer(apiClient, onForceLogout);

  useFocusEffect(
    useCallback(() => {
      void refreshCourseHome();
    }, [refreshCourseHome]),
  );

  useEffect(() => {
    void ScreenOrientation.unlockAsync();
    return () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const countLabel = isLoadingLessons
    ? '正在加载课程...'
    : lessonLoadFailed
      ? '课程加载失败，请稍后重试'
      : `共 ${totalCourses} 节课程`;

  const continueWidth = computeContinueWidth(width);
  const tipWidth = computeTipWidth(width);
  const tipFontSize = clampByViewport({ min: 12, vw: 0.01, max: 20 }, width);
  const foxWidth = computeFoxWidth(width);

  if (isLoadingLessons && totalCourses === 0 && !lessonLoadFailed) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <CourseHomeLoadingState />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={{
          minHeight: height,
          paddingBottom: insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View
          style={{
            width: mapPixelWidth,
            height: mapPixelHeight,
            position: 'relative',
          }}
        >
          <CourseMapBackground
            width={mapPixelWidth}
            height={mapPixelHeight}
            segmentCount={mapSegmentCount}
          />

          <View
            style={[
              styles.tip,
              {
                left: mapPixelWidth * 0.318,
                top: mapPixelHeight * 0.132,
                width: tipWidth,
              },
            ]}
            pointerEvents="none"
          >
            <Image source={courseHomeImages.tipBubble} style={styles.tipImage} contentFit="contain" />
            <View style={styles.tipTextWrap}>
              <Text style={[styles.tipText, { fontSize: tipFontSize }]}>点击课程可重复学习哦！</Text>
            </View>
          </View>

          {courseNodes.map((course) => {
            const completed = completedSet.has(course.number);
            const current = course.number === currentCourse?.number;
            const disabled = (!completed && !current) || isEnteringCourse;

            return (
              <CourseNode
                key={course.number}
                course={course}
                mapHeight={mapHeight}
                mapPixelHeight={mapPixelHeight}
                mapWidth={mapPixelWidth}
                viewportWidth={width}
                completed={completed}
                current={current}
                disabled={disabled}
                onPress={() => {
                  if (current) {
                    handleContinue();
                  } else {
                    handleCourseClick(course);
                  }
                }}
              />
            );
          })}

          {currentCourse ? (
            <Image
              source={courseHomeImages.fox}
              style={[
                styles.fox,
                {
                  width: foxWidth,
                  height: foxWidth * 1.1,
                  left:
                    (currentCourse.x / MAP_WIDTH) * mapPixelWidth - foxWidth / 2,
                  top:
                    ((currentCourse.y - 185) / mapHeight) * mapPixelHeight - foxWidth / 2,
                },
              ]}
              contentFit="contain"
            />
          ) : null}
        </View>
      </ScrollView>

      <CourseToolbar
        viewportWidth={width}
        landscapeTablet={landscapeTablet}
        countLabel={countLabel}
        userName={userName}
        currentCourseNumber={currentCourse?.number || 1}
        isLoggingOut={isLoggingOut}
        onLogout={() => {
          void handleLogout();
        }}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="继续学习"
        disabled={!currentCourse || isEnteringCourse}
        onPress={handleContinue}
        style={({ pressed }) => [
          styles.continue,
          {
            width: continueWidth,
            bottom: insets.bottom + 36,
            opacity: !currentCourse || isEnteringCourse ? 0.72 : 1,
          },
          pressed && currentCourse && !isEnteringCourse && styles.continuePressed,
        ]}
      >
        <Image
          source={courseHomeImages.continueButton}
          style={styles.continueImage}
          contentFit="contain"
        />
      </Pressable>

      <CourseEnterLoadingOverlay visible={isEnteringCourse} viewportWidth={width} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#25b8dd',
  },
  scroll: {
    flex: 1,
  },
  tip: {
    position: 'absolute',
    zIndex: 3,
  },
  tipImage: {
    width: '100%',
    aspectRatio: 2.2,
  },
  tipTextWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    paddingLeft: '8%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    color: '#426ae6',
    fontWeight: '900',
  },
  fox: {
    position: 'absolute',
    zIndex: 5,
    shadowColor: '#164011',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 16 },
    elevation: 4,
  },
  continue: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 20,
    backgroundColor: 'transparent',
  },
  continuePressed: {
    transform: [{ translateY: -2 }],
  },
  continueImage: {
    width: '100%',
    aspectRatio: 3.2,
    shadowColor: '#6f4703',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
});
