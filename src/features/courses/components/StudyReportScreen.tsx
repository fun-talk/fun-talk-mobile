import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useRouter, type Href } from 'expo-router';

import { useAuth } from '@/features/auth';
import { checkSession, LoginError } from '@/features/auth/services/login';
import { getWebBaseUrl } from '@/lib/env';
import {
  FALLBACK_TOTAL_COURSES,
  fetchLearningRecords,
  type LearningRecord,
} from '@/shared/courseHomeProgress';

import { CourseEnterLoadingOverlay } from './CourseEnterLoadingOverlay';

const LESSON_ROUTE = '/(app)/lesson';
const LOGIN_ROUTE = '/(auth)/login' as Href;

const completedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function waitForCourseEnterAnimation(durationMs = 2000): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

export function StudyReportScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { apiClient, auth, logout } = useAuth();
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isEnteringCourse, setIsEnteringCourse] = useState(false);
  const [enteringCourseNumber, setEnteringCourseNumber] = useState<number | null>(null);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setLoadFailed(false);
    try {
      setRecords(await fetchLearningRecords(apiClient));
    } catch (error) {
      console.warn('load learning records failed:', error);
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const totalCourses = Math.max(
    FALLBACK_TOTAL_COURSES,
    ...records.map((record) => record.courseNumber),
  );

  const checkLoginBeforeEnter = useCallback(async () => {
    if (!auth) {
      router.replace(LOGIN_ROUTE);
      return false;
    }
    try {
      await checkSession(apiClient);
      return true;
    } catch (error) {
      if (error instanceof LoginError) {
        await logout();
        router.replace(LOGIN_ROUTE);
      }
      return false;
    }
  }, [apiClient, auth, logout, router]);

  const handleRelearn = useCallback(
    async (record: LearningRecord) => {
      const lessonId = record.lessonId.trim();
      if (!lessonId || isEnteringCourse) return;

      setEnteringCourseNumber(record.courseNumber);
      setIsEnteringCourse(true);
      try {
        const [loggedIn] = await Promise.all([
          checkLoginBeforeEnter(),
          waitForCourseEnterAnimation(),
        ]);
        if (!loggedIn) {
          return;
        }

        const search = new URLSearchParams({
          lesson_id: lessonId,
          from: 'course_home',
          course_number: String(record.courseNumber),
          total_courses: String(totalCourses),
          autostart: '1',
          skip_opening: '1',
        });
        const webDestination = `/app/lesson?${search.toString()}`;
        search.set('web_destination', webDestination);
        search.set('web_base_url', getWebBaseUrl());
        router.push(`${LESSON_ROUTE}?${search.toString()}` as Href);
      } catch (error) {
        console.warn('relearn course failed:', error);
      } finally {
        setIsEnteringCourse(false);
        setEnteringCourseNumber(null);
      }
    },
    [checkLoginBeforeEnter, isEnteringCourse, router, totalCourses],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '学习记录',
          headerBackTitle: '课程大厅',
          headerTintColor: '#1760c4',
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.root}
        contentContainerStyle={styles.content}
      >
        {isLoading ? (
          <View style={styles.state}>
            <ActivityIndicator size="large" color="#1760c4" />
            <Text selectable style={styles.stateText}>正在加载学习记录...</Text>
          </View>
        ) : loadFailed ? (
          <View style={styles.state}>
            <Text selectable style={styles.stateText}>学习记录加载失败</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadRecords()}
              style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.retryText}>重试</Text>
            </Pressable>
          </View>
        ) : records.length === 0 ? (
          <View style={styles.state}>
            <Text selectable style={styles.emptyTitle}>还没有学习记录</Text>
            <Text selectable style={styles.stateText}>完成第一节课后会显示在这里。</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {records.map((record) => {
              const canRelearn = Boolean(record.lessonId.trim());
              const isEnteringThis =
                isEnteringCourse && enteringCourseNumber === record.courseNumber;
              return (
                <View
                  key={`${record.courseNumber}-${record.lessonId}`}
                  style={styles.recordCard}
                >
                  <View style={styles.recordHeading}>
                    <Text selectable style={styles.courseTitle}>第 {record.courseNumber} 课</Text>
                    <Text selectable style={styles.completedBadge}>已完成</Text>
                  </View>
                  <View style={styles.recordMeta}>
                    <Text selectable style={styles.completedAt}>
                      完成于 {completedAtFormatter.format(new Date(record.completedAt * 1000))}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`重新学习第 ${record.courseNumber} 课`}
                      disabled={!canRelearn || isEnteringCourse}
                      onPress={() => void handleRelearn(record)}
                      style={({ pressed }) => [
                        styles.relearnButton,
                        (!canRelearn || isEnteringCourse) && styles.relearnButtonDisabled,
                        pressed && canRelearn && !isEnteringCourse && styles.buttonPressed,
                      ]}
                    >
                      <Text style={styles.relearnText}>
                        {isEnteringThis ? '进入中...' : '重新学习'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <CourseEnterLoadingOverlay
        visible={isEnteringCourse}
        viewportWidth={width}
        title={enteringCourseNumber ? `第 ${enteringCourseNumber} 课` : ''}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#eef8ff',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 24,
  },
  list: {
    width: '100%',
    maxWidth: 760,
    gap: 12,
  },
  recordCard: {
    gap: 12,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: '#ffffff',
    padding: 20,
    boxShadow: '0 6px 18px rgba(15, 89, 164, 0.10)',
  },
  recordHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  courseTitle: {
    color: '#174f9a',
    fontSize: 20,
    fontWeight: '800',
  },
  completedBadge: {
    color: '#197447',
    fontSize: 14,
    fontWeight: '700',
    borderRadius: 999,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  recordMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  completedAt: {
    flexShrink: 1,
    color: '#5d7189',
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  relearnButton: {
    borderRadius: 999,
    backgroundColor: '#1760c4',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  relearnButtonDisabled: {
    opacity: 0.72,
  },
  relearnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 32,
  },
  emptyTitle: {
    color: '#174f9a',
    fontSize: 22,
    fontWeight: '800',
  },
  stateText: {
    color: '#63778f',
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 999,
    backgroundColor: '#1760c4',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
