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

  return (
    <View style={styles.root}>
      <View style={styles.panel}>
        <Text style={styles.kicker}>Native Lesson</Text>
        <Text style={styles.title}>
          {lessonDefinition?.metadata.title || '课程 Native 化入口已启用'}
        </Text>
        <Text style={styles.description}>
          阶段 2 已接入真实 lesson loader。当前先展示课程结构摘要，后续阶段会接入 controller 和课程 UI。
        </Text>

        <View style={styles.metaList}>
          <Text style={styles.metaItem}>
            lesson_id: {lessonDefinition?.metadata.id || lessonId}
          </Text>
          {sectionId ? <Text style={styles.metaItem}>section_id: {sectionId}</Text> : null}
          {courseNumber ? <Text style={styles.metaItem}>course_number: {courseNumber}</Text> : null}
          {totalCourses ? <Text style={styles.metaItem}>total_courses: {totalCourses}</Text> : null}
          {lessonDefinition ? (
            <>
              <Text style={styles.metaItem}>
                bot: {lessonDefinition.metadata.botName || '未配置'}
              </Text>
              <Text style={styles.metaItem}>
                challenges: {lessonDefinition.summary.challengeCount}
              </Text>
              <Text style={styles.metaItem}>steps: {lessonDefinition.summary.stepCount}</Text>
              {lessonDefinition.summary.firstStep ? (
                <Text style={styles.metaItem}>
                  first_step: {lessonDefinition.summary.firstStep.promptText || '无提示文本'}
                </Text>
              ) : null}
            </>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          style={styles.primaryButton}
          onPress={() => router.replace(fallbackPath as Href)}
        >
          <Text style={styles.primaryButtonText}>切换到 WebView fallback</Text>
        </Pressable>
      </View>
    </View>
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
  metaList: {
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
  },
  metaItem: {
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 18,
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
