import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { useAuth } from '@/features/auth';

import {
  buildNativeLessonFallbackPath,
  type LessonModeRouteParams,
} from '../lessonMode';
import { normalizeRouteParam } from '../buildLessonWebUrl';
import {
  fetchNativeLessonDefinition,
  getNativeLessonRequestFromParams,
} from '../nativeLessonLoader';
import type { NativeLessonDefinition } from '../nativeLessonTypes';
import { NativeLessonShell } from './NativeLessonShell';
import { useNativeLessonController } from '../hooks/useNativeLessonController';

const LOGIN_ROUTE = '/(auth)/login' as Href;

export function NativeLessonScreen() {
  const params = useLocalSearchParams<LessonModeRouteParams>();
  const router = useRouter();
  const { auth, apiClient } = useAuth();
  const [lessonDefinition, setLessonDefinition] = useState<NativeLessonDefinition | null>(null);
  const [loadError, setLoadError] = useState('');
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const lessonId = normalizeRouteParam(params.lesson_id)?.trim() || '413';
  const sectionId = normalizeRouteParam(params.section_id)?.trim();
  const courseNumber = normalizeRouteParam(params.course_number)?.trim();
  const totalCourses = normalizeRouteParam(params.total_courses)?.trim();
  const fallbackPath = useMemo(() => buildNativeLessonFallbackPath(params), [params]);
  const lessonRequest = useMemo(
    () => getNativeLessonRequestFromParams({ lesson_id: lessonId, section_id: sectionId }),
    [lessonId, sectionId],
  );

  useEffect(() => {
    if (!auth?.token) {
      return;
    }

    let cancelled = false;
    setIsLoadingLesson(true);
    setLoadError('');

    void fetchNativeLessonDefinition(apiClient, lessonRequest)
      .then((lesson) => {
        if (!cancelled) {
          setLessonDefinition(lesson);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLessonDefinition(null);
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingLesson(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiClient, auth?.token, lessonRequest, retryCount]);

  if (!auth?.token) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>登录状态已失效</Text>
        <Text style={styles.description}>请重新登录后继续课程。</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace(LOGIN_ROUTE)}>
          <Text style={styles.primaryButtonText}>返回登录</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoadingLesson) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.title}>正在加载 Native 课程</Text>
        <Text style={styles.description}>正在请求后端 lesson definition...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.root}>
        <View style={styles.panel}>
          <Text style={styles.kicker}>Native Lesson</Text>
          <Text style={styles.title}>课程加载失败</Text>
          <Text style={styles.description}>{loadError}</Text>
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              style={styles.primaryButton}
              onPress={() => setRetryCount((current) => current + 1)}
            >
              <Text style={styles.primaryButtonText}>重试加载</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.secondaryButton}
              onPress={() => router.replace(fallbackPath as Href)}
            >
              <Text style={styles.secondaryButtonText}>切换到 WebView</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (!lessonDefinition) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>课程内容为空</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.primaryButton}
          onPress={() => setRetryCount((current) => current + 1)}
        >
          <Text style={styles.primaryButtonText}>重新加载</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <NativeLessonLoadedScreen
      lesson={lessonDefinition}
      courseNumber={courseNumber}
      totalCourses={totalCourses}
      onExit={() => router.replace('/(app)/courses' as Href)}
      onFallback={() => router.replace(fallbackPath as Href)}
    />
  );
}

function NativeLessonLoadedScreen({
  lesson,
  courseNumber,
  totalCourses,
  onExit,
  onFallback,
}: {
  lesson: NativeLessonDefinition;
  courseNumber?: string;
  totalCourses?: string;
  onExit: () => void;
  onFallback: () => void;
}) {
  const controller = useNativeLessonController(lesson);

  return (
    <NativeLessonShell
      lesson={lesson}
      courseNumber={courseNumber}
      totalCourses={totalCourses}
      controllerView={controller.view}
      onNext={controller.next}
      onSubmitChoice={controller.submitChoice}
      onSubmitText={controller.submitText}
      onPauseToggle={controller.view.isPaused ? controller.resume : controller.pause}
      onExit={onExit}
      onFallback={onFallback}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0f172a',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
    backgroundColor: '#0f172a',
  },
  panel: {
    width: '100%',
    maxWidth: 640,
    gap: 18,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
  },
  kicker: {
    color: '#7dd3fc',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
  },
  description: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 23,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.65)',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  secondaryButtonText: {
    color: '#bae6fd',
    fontSize: 14,
    fontWeight: '800',
  },
});
