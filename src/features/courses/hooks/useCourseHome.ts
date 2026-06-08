import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, type Href } from 'expo-router';

import { checkSession, LoginError } from '@/features/auth/services/login';
import type { ApiClient } from '@/lib/api/client';
import type { FtAuthRecord } from '@/lib/auth/types';
import {
  buildCourseMapNodes,
  getCourseMapHeight,
  type CourseHomeLesson,
  type CourseMapNode,
} from '@/shared/courseHomeMap';
import {
  fetchCourseHomeProgress,
  readCourseProgress,
  type CourseProgress,
} from '@/shared/courseHomeProgress';
import { resolveCourseLessonEntryPath } from '@/shared/courseOpeningSceneEntry';
import { getWebBaseUrl } from '@/lib/env';

import { computeMapPixelHeight } from '../layout/courseHomeLayout';
import { fetchPublishedLessons, postLogout } from '../services/courseHomeApi';

const LESSON_ROUTE = '/(app)/lesson';
const LOGIN_ROUTE = '/(auth)/login' as Href;

function waitForCourseEnterAnimation(durationMs = 2000): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

export function useCourseHome(options: {
  apiClient: ApiClient;
  auth: FtAuthRecord | null;
  logout: () => Promise<void>;
  viewportWidth: number;
  viewportHeight: number;
}) {
  const router = useRouter();
  const { apiClient, auth, logout, viewportWidth, viewportHeight } = options;

  const [lessons, setLessons] = useState<CourseHomeLesson[]>([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(true);
  const [lessonLoadFailed, setLessonLoadFailed] = useState(false);
  const [isEnteringCourse, setIsEnteringCourse] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [progress, setProgress] = useState<CourseProgress>({
    completedCourseNumbers: [],
    currentCourseNumber: 1,
  });

  const scrollRef = useRef<import('react-native').ScrollView | null>(null);

  const refreshCourseHome = useCallback(async () => {
    setIsLoadingLessons(true);
    try {
      const items = await fetchPublishedLessons(apiClient);
      setLessons(items);
      setLessonLoadFailed(false);
      const total = items.length;
      const localProgress = await readCourseProgress(total);
      setProgress(localProgress);
      if (total > 0) {
        try {
          const serverProgress = await fetchCourseHomeProgress(total, apiClient);
          setProgress(serverProgress);
        } catch (error) {
          console.warn('load course home progress failed:', error);
        }
      }
    } catch (error) {
      console.warn('load course home lessons failed:', error);
      setLessonLoadFailed(true);
      setLessons([]);
    } finally {
      setIsLoadingLessons(false);
    }
  }, [apiClient]);

  const totalCourses = lessons.length;
  const mapHeight = getCourseMapHeight(totalCourses);
  const mapPixelHeight = computeMapPixelHeight(viewportWidth, viewportHeight, mapHeight);

  const completedSet = useMemo(
    () => new Set(progress.completedCourseNumbers),
    [progress.completedCourseNumbers],
  );

  const courseNodes = useMemo(
    () => buildCourseMapNodes(lessons, totalCourses),
    [lessons, totalCourses],
  );

  const currentCourse =
    courseNodes.find((course) => course.number === progress.currentCourseNumber) ||
    courseNodes[0];

  const userName = auth?.username || auth?.name || '同学';

  const scrollToCurrentCourse = useCallback(() => {
    if (!currentCourse || isLoadingLessons) return;
    const nodeTop = (currentCourse.y / mapHeight) * mapPixelHeight;
    scrollRef.current?.scrollTo({
      y: Math.max(0, nodeTop - viewportHeight * 0.35),
      animated: true,
    });
  }, [currentCourse, isLoadingLessons, mapHeight, mapPixelHeight, viewportHeight]);

  useEffect(() => {
    scrollToCurrentCourse();
  }, [isLoadingLessons, progress.currentCourseNumber, totalCourses, scrollToCurrentCourse]);

  const checkLoginBeforeEnter = useCallback(async () => {
    try {
      await checkSession(apiClient, auth);
      return true;
    } catch (error) {
      if (error instanceof LoginError) {
        await logout();
        router.replace(LOGIN_ROUTE);
      }
      return false;
    }
  }, [apiClient, auth, logout, router]);

  const enterCourse = useCallback(
    async (course: CourseMapNode, skipOpeningScene: boolean) => {
      if (isEnteringCourse) return;
      setIsEnteringCourse(true);

      try {
        const [loggedIn] = await Promise.all([
          checkLoginBeforeEnter(),
          waitForCourseEnterAnimation(),
        ]);
        if (!loggedIn) {
          setIsEnteringCourse(false);
          return;
        }

        const search = new URLSearchParams({
          lesson_id: course.lessonId,
          from: 'course_home',
          course_number: String(course.number),
          total_courses: String(totalCourses),
          autostart: '1',
        });
        if (skipOpeningScene) {
          search.set('skip_opening', '1');
        }

        const webDestination = await resolveCourseLessonEntryPath(
          search,
          skipOpeningScene,
          apiClient,
        );

        search.set('skip_opening', skipOpeningScene ? '1' : '0');
        search.set('web_destination', webDestination);
        search.set('web_base_url', getWebBaseUrl());
        router.push(`${LESSON_ROUTE}?${search.toString()}` as Href);
      } catch (error) {
        console.warn('enter course failed:', error);
      } finally {
        setIsEnteringCourse(false);
      }
    },
    [apiClient, checkLoginBeforeEnter, isEnteringCourse, router, totalCourses],
  );

  const handleCourseClick = useCallback(
    (course: CourseMapNode) => {
      if (!completedSet.has(course.number)) return;
      void enterCourse(course, true);
    },
    [completedSet, enterCourse],
  );

  const handleContinue = useCallback(() => {
    if (!currentCourse) return;
    void enterCourse(currentCourse, completedSet.has(currentCourse.number));
  }, [completedSet, currentCourse, enterCourse]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await postLogout(apiClient);
    } catch (error) {
      console.warn('logout request failed:', error);
    } finally {
      await logout();
      router.replace(LOGIN_ROUTE);
      setIsLoggingOut(false);
    }
  }, [apiClient, isLoggingOut, logout, router]);

  return {
    scrollRef,
    lessons,
    isLoadingLessons,
    lessonLoadFailed,
    isEnteringCourse,
    isLoggingOut,
    progress,
    totalCourses,
    mapHeight,
    mapPixelHeight,
    mapPixelWidth: viewportWidth,
    completedSet,
    courseNodes,
    currentCourse,
    userName,
    handleCourseClick,
    handleContinue,
    handleLogout,
    refreshCourseHome,
  };
}
