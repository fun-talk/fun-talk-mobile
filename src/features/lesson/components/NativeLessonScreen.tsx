import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { useAuth } from '@/features/auth';
import type { ApiClient } from '@/lib/api/client';

import {
  buildNativeLessonFallbackPath,
  type LessonModeRouteParams,
} from '../lessonMode';
import { normalizeRouteParam } from '../buildLessonWebUrl';
import {
  classifyNativeLessonError,
  type NativeLessonErrorView,
} from '../nativeLessonErrors';
import {
  fetchNativeLessonDefinition,
  getNativeLessonRequestFromParams,
} from '../nativeLessonLoader';
import { completeNativeLessonProgress } from '../nativeLessonProgress';
import type { NativeLessonDefinition } from '../nativeLessonTypes';
import { NativeLessonShell } from './NativeLessonShell';
import { useNativeLessonController } from '../hooks/useNativeLessonController';
import { useNativeLessonMediaPreload } from '../hooks/useNativeLessonMediaPreload';
import { useNativeLessonRecording } from '../hooks/useNativeLessonRecording';
import { useNativeLessonRealtimeSession } from '../hooks/useNativeLessonRealtimeSession';
import {
  getStructuredSpeechAutoTurnKey,
  shouldAutoStartStructuredSpeechRecording,
  shouldAutoSubmitStructuredSpeechRecording,
} from '../structuredSpeechAutoRecording';

const LOGIN_ROUTE = '/(auth)/login' as Href;

export function NativeLessonScreen() {
  const params = useLocalSearchParams<LessonModeRouteParams>();
  const router = useRouter();
  const { auth, apiClient } = useAuth();
  const [lessonDefinition, setLessonDefinition] = useState<NativeLessonDefinition | null>(null);
  const [loadError, setLoadError] = useState<NativeLessonErrorView | null>(null);
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const lessonId = normalizeRouteParam(params.lesson_id)?.trim() || '413';
  const sectionId = normalizeRouteParam(params.section_id)?.trim();
  const courseNumber = normalizeRouteParam(params.course_number)?.trim();
  const totalCourses = normalizeRouteParam(params.total_courses)?.trim();
  const goFallback = useCallback(
    (error?: NativeLessonErrorView) => {
      const fallbackPath = buildNativeLessonFallbackPath(
        params,
        error
          ? {
              reason: error.fallbackReason,
              category: error.category,
            }
          : { reason: 'manual_native_fallback' },
      );
      console.warn('native_lesson_fallback', {
        reason: error?.fallbackReason ?? 'manual_native_fallback',
        category: error?.category ?? 'manual',
        lessonId,
        sectionId,
      });
      router.replace(fallbackPath as Href);
    },
    [lessonId, params, router, sectionId],
  );
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
    setLoadError(null);

    void fetchNativeLessonDefinition(apiClient, lessonRequest)
      .then((lesson) => {
        if (!cancelled) {
          setLessonDefinition(lesson);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLessonDefinition(null);
          setLoadError(classifyNativeLessonError('loader', error));
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
          <Text style={styles.title}>{loadError.title}</Text>
          <Text style={styles.description}>{loadError.message}</Text>
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              style={styles.primaryButton}
              onPress={() => setRetryCount((current) => current + 1)}
            >
              <Text style={styles.primaryButtonText}>{loadError.retryLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.secondaryButton}
              onPress={() => router.replace('/(app)/courses' as Href)}
            >
              <Text style={styles.secondaryButtonText}>返回课程</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.secondaryButton}
              onPress={() => goFallback(loadError)}
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
      lessonId={lessonId}
      sectionId={sectionId}
      apiClient={apiClient}
      apiBaseUrl={apiClient.baseUrl}
      token={auth.token}
      courseNumber={courseNumber}
      totalCourses={totalCourses}
      onExit={() => router.replace('/(app)/courses' as Href)}
      onFallback={(error) => goFallback(error)}
    />
  );
}

function NativeLessonLoadedScreen({
  lesson,
  lessonId,
  sectionId,
  apiClient,
  apiBaseUrl,
  token,
  courseNumber,
  totalCourses,
  onExit,
  onFallback,
}: {
  lesson: NativeLessonDefinition;
  lessonId: string;
  sectionId?: string;
  apiClient: ApiClient;
  apiBaseUrl: string;
  token: string;
  courseNumber?: string;
  totalCourses?: string;
  onExit: () => void;
  onFallback: (error?: NativeLessonErrorView) => void;
}) {
  const controller = useNativeLessonController(lesson);
  const sendAudioChunkRef = useRef<(chunk: Uint8Array) => boolean>(() => false);
  const isRealtimeConnectedRef = useRef(false);
  const recording = useNativeLessonRecording({
    vadConfig: { silenceTimeoutMs: 2000 },
    onAudioChunk: (chunk) => {
      if (isRealtimeConnectedRef.current) {
        sendAudioChunkRef.current(chunk);
      }
    },
  });
  const realtime = useNativeLessonRealtimeSession({
    enabled: true,
    apiBaseUrl,
    token,
    lessonId,
    sectionId,
    title: lesson.metadata.title,
    defaultSpeaker: lesson.metadata.defaultSpeaker,
    backgroundImageUrl:
      lesson.assets.backgrounds.story ||
      lesson.assets.backgrounds.teaching ||
      lesson.assets.backgrounds.challengeLevel1,
    onCaptureTurnEnded: recording.acknowledgeSubmit,
  });

  useEffect(() => {
    sendAudioChunkRef.current = realtime.sendAudioChunk;
    isRealtimeConnectedRef.current = realtime.isConnected;
  }, [realtime.isConnected, realtime.sendAudioChunk]);
  const [mediaErrorText, setMediaErrorText] = useState('');
  const [completionStatus, setCompletionStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [completionErrorText, setCompletionErrorText] = useState('');
  const lastStructuredAutoStartTurnKeyRef = useRef<string | null>(null);
  const lastStructuredAutoSubmittedUriRef = useRef<string | null>(null);
  const runtimeError = useMemo<NativeLessonErrorView | null>(() => {
    if (realtime.errorText) {
      return classifyNativeLessonError('session', realtime.errorText);
    }
    if (realtime.audioErrorText) {
      return classifyNativeLessonError('audio', realtime.audioErrorText);
    }
    if (mediaErrorText) {
      return classifyNativeLessonError('media', mediaErrorText);
    }
    if (recording.state.status === 'error' && recording.state.errorText) {
      return classifyNativeLessonError('permission', recording.state.errorText);
    }
    return null;
  }, [mediaErrorText, recording.state.errorText, recording.state.status, realtime.audioErrorText, realtime.errorText]);
  const controllerView = realtime.realtimeView ?? controller.view;
  const nextControllerStep = controller.next;
  const recordingStatus = recording.state.status;
  const recordingUri = recording.state.recordingUri;
  const startRecording = recording.start;
  const submitRecordingState = recording.submit;
  const isRealtimeConnected = realtime.isConnected;
  const realtimeAudioStatus = realtime.audioStatus;
  const assistantPlaybackPending = realtime.assistantPlaybackPending;
  const isLessonComplete =
    controllerView.phase === 'end' ||
    controllerView.lifecycle === 'completed' ||
    realtime.projection.completed;
  const completionParams = useMemo(
    () => ({
      lessonId,
      courseNumber,
      totalCourses,
    }),
    [courseNumber, lessonId, totalCourses],
  );
  const submitRecording = useCallback(async () => {
    const sentToRealtime = Boolean(recordingUri) && isRealtimeConnected;
    submitRecordingState();
    if (!sentToRealtime && !isRealtimeConnected) {
      nextControllerStep();
    }
  }, [
    isRealtimeConnected,
    nextControllerStep,
    recordingUri,
    submitRecordingState,
  ]);

  const saveCompletion = useCallback(async () => {
    setCompletionStatus('saving');
    setCompletionErrorText('');
    try {
      await completeNativeLessonProgress(completionParams, apiClient);
      setCompletionStatus('saved');
      onExit();
    } catch (error) {
      setCompletionErrorText(error instanceof Error ? error.message : String(error));
      setCompletionStatus('error');
    }
  }, [apiClient, completionParams, onExit]);

  useEffect(() => {
    if (!isLessonComplete || completionStatus !== 'idle') {
      return;
    }
    void saveCompletion();
  }, [completionStatus, isLessonComplete, saveCompletion]);

  useEffect(() => {
    if (
      recordingStatus === 'recording' ||
      recordingStatus === 'cancelled' ||
      recordingStatus === 'idle'
    ) {
      lastStructuredAutoSubmittedUriRef.current = null;
    }
  }, [recordingStatus]);

  useEffect(() => {
    const autoTurnKey = getStructuredSpeechAutoTurnKey(controllerView);
    if (
      !shouldAutoStartStructuredSpeechRecording({
        controllerView,
        realtimeConnected: isRealtimeConnected,
        audioStatus: realtimeAudioStatus,
        assistantPlaybackPending,
        recordingStatus,
        lastStartedTurnKey: lastStructuredAutoStartTurnKeyRef.current,
      })
    ) {
      return;
    }

    lastStructuredAutoStartTurnKeyRef.current = autoTurnKey;
    void startRecording();
  }, [
    controllerView,
    isRealtimeConnected,
    realtimeAudioStatus,
    assistantPlaybackPending,
    recordingStatus,
    startRecording,
  ]);

  useEffect(() => {
    if (
      !shouldAutoSubmitStructuredSpeechRecording({
        controllerView,
        recordingStatus,
        recordingUri,
        lastSubmittedRecordingUri: lastStructuredAutoSubmittedUriRef.current,
      })
    ) {
      return;
    }

    lastStructuredAutoSubmittedUriRef.current = recordingUri;
    void submitRecording();
  }, [
    controllerView,
    recordingStatus,
    recordingUri,
    submitRecording,
  ]);

  useNativeLessonMediaPreload(controller.preloadUris);

  return (
    <NativeLessonShell
      lesson={lesson}
      courseNumber={courseNumber}
      totalCourses={totalCourses}
      controllerView={controllerView}
      realtimeStatus={
        realtime.audioStatus === 'idle'
          ? realtime.status
          : `${realtime.status} · audio ${realtime.audioStatus}`
      }
      realtimeErrorText={realtime.errorText || realtime.audioErrorText}
      nativeError={runtimeError}
      completionStatus={completionStatus}
      completionErrorText={completionErrorText}
      onRetryCompletion={() => setCompletionStatus('idle')}
      onRetryNativeError={() => {
        if (!runtimeError) {
          return;
        }
        if (runtimeError.category === 'permission') {
          void recording.start();
          return;
        }
        void realtime.connect();
      }}
      onNext={() => {
        const stepId = controllerView.step?.step;
        if (
          realtime.realtimeView &&
          (controllerView.lifecycle === 'waiting_user' || controllerView.phase === 'free_chat')
        ) {
          if (!realtime.requestDebugNextStep()) {
            controller.next();
          }
          return;
        }
        if (!stepId || !realtime.sendAssistantPromptSpoken(stepId)) {
          controller.next();
        }
      }}
      onSubmitChoice={(optionId) => {
        const stepId = controllerView.step?.step;
        if (!stepId || !realtime.sendChoice(stepId, optionId)) {
          controller.submitChoice(optionId);
        }
      }}
      onSubmitText={(text) => {
        const stepId = controllerView.step?.step;
        if (!realtime.sendText(text, stepId)) {
          controller.submitText(text);
        }
      }}
      recordingState={recording.state}
      conversationHistory={realtime.conversationHistory}
      liveUserTranscript={realtime.liveUserTranscript}
      onReplaySpeechPrompt={realtime.replayCurrentStepPrompt}
      onMediaComplete={() => {
        setMediaErrorText('');
        const cueId = controllerView.step?.mediaCueId;
        if (!realtime.sendMediaFinished(cueId)) {
          controller.next();
        }
      }}
      onMediaError={setMediaErrorText}
      onPauseToggle={controllerView.isPaused ? controller.resume : controller.pause}
      onReset={() => {
        setMediaErrorText('');
        setCompletionStatus('idle');
        setCompletionErrorText('');
        controller.reset();
        realtime.reset();
      }}
      onExit={onExit}
      onFallback={() => onFallback(runtimeError ?? undefined)}
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
