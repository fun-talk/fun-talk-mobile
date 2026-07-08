import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, type Href } from 'expo-router';

import { checkSession, LoginError } from '@/features/auth/services/login';
import type { ApiClient } from '@/lib/api/client';
import type { FtAuthRecord } from '@/lib/auth/types';
import {
  buildCourseMapNodes,
  getCourseMapHeight,
  getPublishedLessons,
  type CourseHomeLesson,
  type CourseMapNode,
} from '@/shared/courseHomeMap';
import {
  fetchCourseHomeProgress,
  readCourseProgress,
  type CourseProgress,
} from '@/shared/courseHomeProgress';
import {
  consumeCourseHomeFoxMove,
  type CourseHomeFoxMove,
} from '@/shared/courseHomeFoxMove';
import { getWebBaseUrl } from '@/lib/env';

import { computeMapPixelHeight } from '../layout/courseHomeLayout';

async function fetchPublishedLessons(apiClient: ApiClient): Promise<CourseHomeLesson[]> {
  const response = await apiClient.get('/api/v1/realtime_lessons?published_only=1');
  if (!response.ok) {
    throw new Error(`load realtime lessons failed: ${response.status}`);
  }
  const payload = (await response.json()) as { lessons?: CourseHomeLesson[] };
  return getPublishedLessons(Array.isArray(payload.lessons) ? payload.lessons : []);
}

async function postLogout(apiClient: ApiClient): Promise<void> {
  const response = await apiClient.post('/api/v1/logout');
  if (!response.ok) {
    console.warn('logout failed:', response.status);
  }
}

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
  const [enteringCourse, setEnteringCourse] = useState<CourseMapNode | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [progress, setProgress] = useState<CourseProgress>({
    completedCourseNumbers: [],
    currentCourseNumber: 1,
  });
  const [pendingFoxMove, setPendingFoxMove] = useState<CourseHomeFoxMove | null>(null);

  const scrollRef = useRef<import('react-native').ScrollView | null>(null);

  const refreshCourseHome = useCallback(async () => {
    setIsLoadingLessons(true);
    try {
      const items = await fetchPublishedLessons(apiClient);
      setLessons(items);
      setLessonLoadFailed(false);
      const total = items.length;
      const localProgress = await readCourseProgress(total);
      const storedFoxMove = total > 0 ? await consumeCourseHomeFoxMove(total) : null;
      setProgress(localProgress);
      setPendingFoxMove(storedFoxMove);
      if (total > 0) {
        try {
          const serverProgress = await fetchCourseHomeProgress(total, apiClient);
          setProgress(serverProgress);
          if (
            !storedFoxMove &&
            serverProgress.currentCourseNumber === localProgress.currentCourseNumber + 1 &&
            serverProgress.completedCourseNumbers.includes(localProgress.currentCourseNumber)
          ) {
            setPendingFoxMove({
              fromCourseNumber: localProgress.currentCourseNumber,
              toCourseNumber: serverProgress.currentCourseNumber,
            });
          }
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
      setEnteringCourse(course);
      setIsEnteringCourse(true);

      try {
        const [loggedIn] = await Promise.all([
          checkLoginBeforeEnter(),
          waitForCourseEnterAnimation(),
        ]);
        if (!loggedIn) {
          setIsEnteringCourse(false);
          setEnteringCourse(null);
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

        // 直接构造课程页 URL，确保 from/course_number/total_courses 完整传入 WebView。
        // 绕开 opening scene 中转，避免 return_to 编码/解码过程中参数丢失。
        const webDestination = `/app/lesson?${search.toString()}`;

        search.set('skip_opening', skipOpeningScene ? '1' : '0');
        search.set('web_destination', webDestination);
        search.set('web_base_url', getWebBaseUrl());
        router.push(`${LESSON_ROUTE}?${search.toString()}` as Href);
      } catch (error) {
        console.warn('enter course failed:', error);
      } finally {
        setIsEnteringCourse(false);
        setEnteringCourse(null);
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
    enteringCourse,
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
    pendingFoxMove,
    clearPendingFoxMove: () => setPendingFoxMove(null),
  };
}
