import { Image } from 'expo-image';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useAuth } from '@/features/auth';
import { MAP_WIDTH } from '@/shared/courseHomeMap';

import { courseHomeImages } from '../assets/courseHomeAssets';
import { CourseEnterLoadingOverlay, CourseHomeLoadingState } from './CourseEnterLoadingOverlay';
import { CourseMapBackground } from './CourseMapBackground';
import { CourseNode } from './CourseNode';
import { CourseToolbar } from './CourseToolbar';
import { useCourseHome } from '../hooks/useCourseHome';
import {
  clampByViewport,
  computeContinueWidth,
  computeFoxWidth,
  computeTipWidth,
  isLandscapeTablet,
} from '../layout/courseHomeLayout';

const PROFILE_ROUTE = '/(app)/profile' as Href;
const REVIEW_TIP_Y = 353;

export function CourseHomeScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth, apiClient, logout } = useAuth();
  const landscapeTablet = isLandscapeTablet(width, height);

  const {
    scrollRef,
    isLoadingLessons,
    lessonLoadFailed,
    isEnteringCourse,
    enteringCourse,
    isLoggingOut,
    totalCourses,
    mapHeight,
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
    pendingFoxMove,
    clearPendingFoxMove,
  } = useCourseHome({
    apiClient,
    auth,
    logout,
    viewportWidth: width,
    viewportHeight: height,
  });

  // ponytail: inlined useLogoutTimer — polls /api/v1/should_logout every 60s
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const check = async () => {
      try {
        const response = await apiClient.get('/api/v1/should_logout');
        if (response.ok) {
          const payload = (await response.json()) as { logout?: boolean };
          if (payload.logout) {
            void handleLogout();
          }
        }
      } catch {
        // network error → ignore
      }
    };

    void check();
    timerRef.current = setInterval(check, 60_000);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void check();
      }
    });

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      subscription.remove();
    };
  }, [apiClient, handleLogout]);

  useFocusEffect(
    useCallback(() => {
      void refreshCourseHome();
    }, [refreshCourseHome]),
  );

  const countLabel = isLoadingLessons
    ? '正在加载课程...'
    : lessonLoadFailed
      ? '课程加载失败，请稍后重试'
      : `共 ${totalCourses} 节课程`;

  const continueWidth = computeContinueWidth(width);
  const tipWidth = computeTipWidth(width);
  const tipFontSize = clampByViewport({ min: 12, vw: 0.01, max: 20 }, width);
  const foxWidth = computeFoxWidth(width);
  const foxLeft = useSharedValue(0);
  const foxTop = useSharedValue(0);
  const foxScale = useSharedValue(1);

  const resolveFoxLayout = useCallback(
    (course: { x: number; y: number }) => ({
      left: (course.x / MAP_WIDTH) * mapPixelWidth - foxWidth / 2,
      top: ((course.y - 185) / mapHeight) * mapPixelHeight - foxWidth / 2,
    }),
    [foxWidth, mapHeight, mapPixelHeight, mapPixelWidth],
  );

  const currentFoxLayout = useMemo(
    () => (currentCourse ? resolveFoxLayout(currentCourse) : null),
    [currentCourse, resolveFoxLayout],
  );

  useEffect(() => {
    if (!currentFoxLayout || !currentCourse) {
      return;
    }

    const fromCourse = pendingFoxMove
      ? courseNodes.find((course) => course.number === pendingFoxMove.fromCourseNumber)
      : null;
    const canAnimateMove =
      pendingFoxMove &&
      pendingFoxMove.toCourseNumber === currentCourse.number &&
      fromCourse;

    if (!canAnimateMove) {
      foxLeft.value = currentFoxLayout.left;
      foxTop.value = currentFoxLayout.top;
      foxScale.value = 1;
      // 目标课程尚未到达时保留 pendingFoxMove，等待 currentCourse 推进后再播放动画；
      // 目标课程已过期或无效时立即清除。
      const shouldKeepPending =
        pendingFoxMove &&
        pendingFoxMove.toCourseNumber > currentCourse.number &&
        pendingFoxMove.toCourseNumber <= totalCourses;
      if (pendingFoxMove && !shouldKeepPending) {
        clearPendingFoxMove();
      }
      return;
    }

    const fromFoxLayout = resolveFoxLayout(fromCourse);
    foxLeft.value = fromFoxLayout.left;
    foxTop.value = fromFoxLayout.top;
    foxScale.value = 1;

    const frameId = requestAnimationFrame(() => {
      foxLeft.value = withTiming(currentFoxLayout.left, {
        duration: 950,
        easing: Easing.inOut(Easing.cubic),
      });
      foxTop.value = withTiming(
        currentFoxLayout.top,
        {
          duration: 950,
          easing: Easing.inOut(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            runOnJS(clearPendingFoxMove)();
          }
        },
      );
      foxScale.value = withSequence(
        withTiming(1.08, { duration: 240, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 710, easing: Easing.inOut(Easing.quad) }),
      );
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [
    clearPendingFoxMove,
    courseNodes,
    currentCourse,
    currentFoxLayout,
    foxLeft,
    foxScale,
    foxTop,
    pendingFoxMove,
    resolveFoxLayout,
  ]);

  const foxAnimatedStyle = useAnimatedStyle(() => ({
    left: foxLeft.value,
    top: foxTop.value,
    transform: [{ scale: foxScale.value }],
  }));

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
          />

          <View
            style={[
              styles.tip,
              {
                left: mapPixelWidth * 0.318,
                top: (REVIEW_TIP_Y / mapHeight) * mapPixelHeight,
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
            <Animated.View
              pointerEvents="none"
              style={[
                styles.fox,
                foxAnimatedStyle,
                {
                  width: foxWidth,
                  height: foxWidth * 1.1,
                },
              ]}
            >
              <Image
                source={courseHomeImages.fox}
                style={styles.foxImage}
                contentFit="contain"
              />
            </Animated.View>
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
        onProfilePress={() => router.push(PROFILE_ROUTE)}
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

      <CourseEnterLoadingOverlay
        visible={isEnteringCourse}
        viewportWidth={width}
        title={enteringCourse?.title}
        coverImageUrl={enteringCourse?.coverImageUrl}
      />
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
  },
  foxImage: {
    width: '100%',
    height: '100%',
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
