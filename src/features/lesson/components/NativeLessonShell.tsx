import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { courseHomeImages } from '@/features/courses/assets/courseHomeAssets';

import type { NativeLessonDefinition } from '../nativeLessonTypes';
import type { NativeLessonControllerView } from '../nativeLessonController';
import type { NativeLessonErrorView } from '../nativeLessonErrors';
import type { RecordingControllerState } from '../recordingController';
import { useNativeLessonScale } from '../hooks/useNativeLessonScale';
import type { RealtimeConversationItem } from '../hooks/useNativeLessonRealtimeSession';
import { CourseMediaArea } from './CourseMediaArea';
import { FreeChatPanel } from './FreeChatPanel';
import { RecordingPanel } from './RecordingPanel';

type NativeLessonShellProps = {
  lesson: NativeLessonDefinition;
  courseNumber?: string;
  totalCourses?: string;
  controllerView: NativeLessonControllerView;
  realtimeStatus?: string;
  realtimeErrorText?: string;
  nativeError?: NativeLessonErrorView | null;
  completionStatus?: 'idle' | 'saving' | 'saved' | 'error';
  completionErrorText?: string;
  onNext: () => void;
  onSubmitChoice: (optionId: string) => void;
  onSubmitText: (text: string) => void;
  recordingState: RecordingControllerState;
  conversationHistory?: RealtimeConversationItem[];
  liveUserTranscript?: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  onSubmitRecording: () => void;
  onMediaComplete: () => void;
  onMediaError?: (message: string) => void;
  onPauseToggle: () => void;
  onReset: () => void;
  onRetryCompletion?: () => void;
  onRetryNativeError?: () => void;
  onFallback: () => void;
  onExit: () => void;
};

const WEB_CANVAS_WIDTH = 3325;
const WEB_CANVAS_HEIGHT = 1536;
const COMPACT_CANVAS_WIDTH = 1180;

function scaled(value: number, scale: number): number {
  return value * scale;
}

export function NativeLessonShell({
  lesson,
  courseNumber,
  totalCourses,
  controllerView,
  realtimeStatus,
  realtimeErrorText,
  nativeError,
  completionStatus = 'idle',
  completionErrorText,
  onNext,
  onSubmitChoice,
  onSubmitText,
  recordingState,
  conversationHistory = [],
  liveUserTranscript = '',
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onSubmitRecording,
  onMediaComplete,
  onMediaError,
  onPauseToggle,
  onReset,
  onRetryCompletion,
  onRetryNativeError,
  onFallback,
  onExit,
}: NativeLessonShellProps) {
  const [draftAnswer, setDraftAnswer] = useState('');
  const [viewportHeight, setViewportHeight] = useState(0);
  const layout = useNativeLessonScale();
  const landscapeViewportHeight =
    layout.isLandscapeTablet && viewportHeight > 0 ? viewportHeight : layout.canvasHeight;
  const scale = layout.isLandscapeTablet
    ? landscapeViewportHeight / WEB_CANVAS_HEIGHT
    : Math.max(layout.width, COMPACT_CANVAS_WIDTH) / WEB_CANVAS_WIDTH;
  const canvasWidth = layout.isLandscapeTablet
    ? WEB_CANVAS_WIDTH * scale
    : Math.max(layout.width, COMPACT_CANVAS_WIDTH);
  const canvasHeight = WEB_CANVAS_HEIGHT * scale;
  const progressLabel =
    courseNumber && totalCourses
      ? `课程 ${courseNumber} / ${totalCourses} · ${controllerView.title}`
      : controllerView.title;
  const phaseLabel = `${controllerView.phase} · ${controllerView.lifecycle}`;
  const sessionLabel = nativeError
    ? `${nativeError.title} · ${nativeError.message}`
    : realtimeErrorText
      ? `realtime error · ${realtimeErrorText}`
    : realtimeStatus
      ? `realtime · ${realtimeStatus}`
      : phaseLabel;
  const completionLabel =
    completionStatus === 'saving'
      ? '保存进度中...'
      : completionStatus === 'error'
        ? `进度保存失败${completionErrorText ? ` · ${completionErrorText}` : ''}`
        : '';
  const displayText =
    controllerView.text ||
    controllerView.screenText ||
    (controllerView.phase === 'end' ? '课程完成' : controllerView.title);
  const choiceOptions = controllerView.step?.options ?? [];
  const isFreeChatPhase = controllerView.phase === 'free_chat';
  const expectsTextAnswer =
    !isFreeChatPhase &&
    !choiceOptions.length &&
    (Boolean(controllerView.step?.expectedPhrases?.length) ||
      controllerView.step?.responseMode === 'speech');
  const expectsRecording =
    isFreeChatPhase ||
    controllerView.step?.responseMode === 'speech';
  const canSubmitText = draftAnswer.trim().length > 0;
  const visibleConversationHistory = isFreeChatPhase
    ? conversationHistory.slice(Math.max(0, conversationHistory.length - 8))
    : [];
  const normalizedLiveUserTranscript = liveUserTranscript.trim();

  useEffect(() => {
    setDraftAnswer('');
  }, [controllerView.id]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onExit} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>返回课程</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {lesson.metadata.title}
          </Text>
          <Text numberOfLines={1} style={styles.headerSubtitle}>
            {progressLabel}
          </Text>
        </View>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onFallback} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>WebView</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.viewport}
        onLayout={(event) => {
          setViewportHeight(event.nativeEvent.layout.height);
        }}
        contentContainerStyle={[
          styles.viewportContent,
          layout.isLandscapeTablet && { minHeight: viewportHeight || layout.height },
        ]}
      >
        <ScrollView
          horizontal={!layout.isLandscapeTablet}
          showsHorizontalScrollIndicator={!layout.isLandscapeTablet}
          contentContainerStyle={styles.horizontalContent}
        >
          <View style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}>
            {controllerView.backgroundImageUrl ? (
              <Image
                source={{ uri: controllerView.backgroundImageUrl }}
                style={StyleSheet.absoluteFill}
                cachePolicy="memory-disk"
                contentFit="cover"
                recyclingKey={controllerView.backgroundImageUrl}
              />
            ) : null}
            <View style={styles.backgroundDim} />

            <Image
              source={courseHomeImages.fox}
              style={[
                styles.fox,
                {
                  left: scaled(760, scale),
                  top: scaled(520, scale),
                  width: scaled(270, scale),
                  height: scaled(320, scale),
                },
              ]}
              contentFit="contain"
            />

            <View
              style={[
                styles.mediaBackdrop,
                {
                  left: scaled(1265, scale),
                  top: scaled(49, scale),
                  width: scaled(1307, scale),
                  height: scaled(856, scale),
                  borderRadius: scaled(47, scale),
                },
              ]}
            />
            <View
              style={[
                styles.mediaFrame,
                {
                  left: scaled(1302, scale),
                  top: scaled(111, scale),
                  width: scaled(1236, scale),
                  height: scaled(720, scale),
                  borderRadius: scaled(46, scale),
                  padding: scaled(30, scale),
                },
              ]}
            >
              <View style={styles.mediaInner}>
                <CourseMediaArea
                  controllerView={controllerView}
                  titleFontSize={scaled(44, scale)}
                  captionFontSize={scaled(24, scale)}
                  onComplete={onMediaComplete}
                  onError={onMediaError}
                />
              </View>
            </View>

            {isFreeChatPhase ? (
              <View
                style={[
                  styles.freeChatPanelWrap,
                  {
                    left: scaled(1393, scale),
                    top: scaled(780, scale),
                    width: scaled(1052, scale),
                    minHeight: scaled(247, scale),
                    borderRadius: scaled(38, scale),
                  },
                ]}
              >
                <FreeChatPanel
                  state={recordingState}
                  scale={scale}
                />
              </View>
            ) : null}

            <View
              style={[
                styles.speechCard,
                {
                  left: scaled(1265, scale),
                  top: scaled(949, scale),
                  width: scaled(1307, scale),
                  height: scaled(518, scale),
                  borderRadius: scaled(16, scale),
                },
              ]}
            >
              <View
                style={[
                  styles.hintBubble,
                  {
                    top: scaled(34, scale),
                    left: scaled(150, scale),
                    right: scaled(150, scale),
                    minHeight: scaled(110, scale),
                    borderRadius: scaled(20, scale),
                    paddingHorizontal: scaled(34, scale),
                    paddingVertical: scaled(18, scale),
                  },
                ]}
              >
                <Text style={[styles.hintText, { fontSize: scaled(30, scale), lineHeight: scaled(42, scale) }]}>
                  {displayText}
                </Text>
              </View>

              {isFreeChatPhase && visibleConversationHistory.length ? (
                <ScrollView
                  style={[
                    styles.conversationList,
                    {
                      top: scaled(160, scale),
                      left: scaled(130, scale),
                      right: scaled(130, scale),
                      bottom: scaled(120, scale),
                    },
                  ]}
                  contentContainerStyle={{ paddingBottom: scaled(16, scale), gap: scaled(12, scale) }}
                  showsVerticalScrollIndicator={false}
                >
                  {visibleConversationHistory.map((item) => (
                    <View
                      key={item.id}
                      style={[
                        styles.conversationBubble,
                        item.role === 'assistant'
                          ? styles.conversationBubbleAssistant
                          : styles.conversationBubbleUser,
                      ]}
                    >
                      <Text
                        style={[
                          styles.conversationSpeaker,
                          {
                            fontSize: scaled(18, scale),
                            marginBottom: scaled(6, scale),
                          },
                        ]}
                      >
                        {item.role === 'assistant' ? '欧波' : '我'}
                      </Text>
                      <Text
                        style={[
                          styles.conversationText,
                          { fontSize: scaled(24, scale), lineHeight: scaled(34, scale) },
                        ]}
                      >
                        {item.text}
                      </Text>
                    </View>
                  ))}
                  {normalizedLiveUserTranscript ? (
                    <View
                      style={[
                        styles.conversationBubble,
                        styles.conversationBubbleUser,
                        styles.conversationBubbleLive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.conversationSpeaker,
                          {
                            fontSize: scaled(18, scale),
                            marginBottom: scaled(6, scale),
                          },
                        ]}
                      >
                        我（识别中）
                      </Text>
                      <Text
                        style={[
                          styles.conversationText,
                          { fontSize: scaled(24, scale), lineHeight: scaled(34, scale) },
                        ]}
                      >
                        {normalizedLiveUserTranscript}
                      </Text>
                    </View>
                  ) : null}
                </ScrollView>
              ) : null}

              {choiceOptions.length ? (
                <View
                  style={[
                    styles.optionGrid,
                    {
                      top: scaled(168, scale),
                      left: scaled(118, scale),
                      right: scaled(118, scale),
                      gap: scaled(18, scale),
                    },
                  ]}
                >
                  {choiceOptions.map((option) => {
                    const isSelected =
                      controllerView.answer?.selectedOptionId === option.id;
                    const isWrong = isSelected && controllerView.answer?.correct === false;
                    return (
                      <Pressable
                        key={option.id}
                        accessibilityRole="button"
                        onPress={() => onSubmitChoice(option.id)}
                        style={[
                          styles.optionButton,
                          {
                            minHeight: scaled(112, scale),
                            borderRadius: scaled(18, scale),
                            padding: scaled(12, scale),
                          },
                          isWrong && styles.optionButtonWrong,
                        ]}
                      >
                        {option.imageUrl ? (
                          <Image
                            source={{ uri: option.imageUrl }}
                            style={[
                              styles.optionImage,
                              {
                                width: scaled(84, scale),
                                height: scaled(84, scale),
                                borderRadius: scaled(12, scale),
                              },
                            ]}
                            cachePolicy="memory-disk"
                            contentFit="cover"
                            recyclingKey={option.imageUrl}
                          />
                        ) : null}
                        <View style={styles.optionTextWrap}>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.optionLabel,
                              { fontSize: scaled(22, scale) },
                            ]}
                          >
                            {option.label}
                          </Text>
                          <Text
                            numberOfLines={2}
                            style={[
                              styles.optionText,
                              { fontSize: scaled(26, scale), lineHeight: scaled(34, scale) },
                            ]}
                          >
                            {option.text}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {expectsTextAnswer ? (
                <View
                  style={[
                    styles.textAnswerRow,
                    {
                      top: scaled(expectsRecording ? 310 : 184, scale),
                      left: scaled(160, scale),
                      right: scaled(160, scale),
                      gap: scaled(16, scale),
                    },
                  ]}
                >
                  <TextInput
                    value={draftAnswer}
                    onChangeText={setDraftAnswer}
                    placeholder="输入跟读/填空内容"
                    placeholderTextColor="#9ca3af"
                    style={[
                      styles.textAnswerInput,
                      {
                        minHeight: scaled(82, scale),
                        borderRadius: scaled(14, scale),
                        fontSize: scaled(26, scale),
                        paddingHorizontal: scaled(24, scale),
                      },
                    ]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={!canSubmitText}
                    onPress={() => {
                      onSubmitText(draftAnswer);
                      setDraftAnswer('');
                    }}
                    style={[
                      styles.textAnswerButton,
                      {
                        minHeight: scaled(82, scale),
                        borderRadius: scaled(14, scale),
                        paddingHorizontal: scaled(30, scale),
                      },
                      !canSubmitText && styles.disabledButton,
                    ]}
                  >
                    <Text
                      style={[
                        styles.textAnswerButtonText,
                        { fontSize: scaled(24, scale) },
                      ]}
                    >
                      提交
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {expectsRecording && !isFreeChatPhase ? (
                <View
                  style={[
                    styles.recordingPanelWrap,
                    {
                      top: scaled(168, scale),
                      left: scaled(210, scale),
                      right: scaled(210, scale),
                    },
                  ]}
                >
                  <RecordingPanel
                    state={recordingState}
                    isFreeChat={false}
                    onStart={onStartRecording}
                    onStop={onStopRecording}
                    onCancel={onCancelRecording}
                    onSubmit={onSubmitRecording}
                  />
                </View>
              ) : null}

              {controllerView.answer ? (
                <View
                  style={[
                    styles.feedbackBubble,
                    {
                      left: scaled(210, scale),
                      right: scaled(210, scale),
                      bottom: scaled(42, scale),
                      borderRadius: scaled(16, scale),
                      paddingHorizontal: scaled(24, scale),
                      paddingVertical: scaled(12, scale),
                    },
                    controllerView.answer.correct
                      ? styles.feedbackBubbleCorrect
                      : styles.feedbackBubbleWrong,
                  ]}
                >
                  <Text
                    style={[
                      styles.feedbackText,
                      { fontSize: scaled(22, scale), lineHeight: scaled(30, scale) },
                    ]}
                  >
                    {controllerView.answer.feedbackText}
                  </Text>
                </View>
              ) : null}

              <Image
                source={courseHomeImages.fox}
                style={[
                  styles.avatar,
                  {
                    left: scaled(38, scale),
                    bottom: scaled(38, scale),
                    width: scaled(102, scale),
                    height: scaled(102, scale),
                    borderRadius: scaled(51, scale),
                  },
                ]}
                contentFit="cover"
              />
              <View
                style={[
                  styles.kidAvatar,
                  {
                    right: scaled(38, scale),
                    bottom: scaled(38, scale),
                    width: scaled(102, scale),
                    height: scaled(102, scale),
                    borderRadius: scaled(51, scale),
                  },
                ]}
              >
                <Text style={[styles.kidAvatarText, { fontSize: scaled(38, scale) }]}>孩</Text>
              </View>
            </View>
          </View>
          {controllerView.isPaused ? (
            <View style={styles.pauseOverlay}>
              <View style={styles.pausePanel}>
                <Text style={styles.pauseTitle}>课程暂停</Text>
                <Text style={styles.pauseText}>点击底部“恢复课程”继续</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </ScrollView>

      <View style={styles.bottomControls}>
        <Pressable accessibilityRole="button" hitSlop={8} style={styles.startButton} onPress={onPauseToggle}>
          <Text style={styles.startButtonText}>
            {controllerView.isPaused ? '恢复课程' : '暂停课程'}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" hitSlop={8} style={styles.controlButton} onPress={onReset}>
          <Text style={styles.controlButtonText}>重置课程</Text>
        </Pressable>
        <Pressable style={styles.controlButton}>
          <Text numberOfLines={1} style={styles.controlButtonText}>{sessionLabel}</Text>
        </Pressable>
        {completionLabel ? (
          <Pressable style={styles.completionStatusButton}>
            <Text numberOfLines={1} style={styles.controlButtonText}>
              {completionLabel}
            </Text>
          </Pressable>
        ) : null}
        {completionStatus === 'error' ? (
          <Pressable accessibilityRole="button" hitSlop={8} style={styles.controlButtonPurple} onPress={onRetryCompletion}>
            <Text style={styles.controlButtonText}>重试保存</Text>
          </Pressable>
        ) : null}
        {nativeError ? (
          <>
            <Pressable accessibilityRole="button" hitSlop={8} style={styles.controlButtonPurple} onPress={onRetryNativeError}>
              <Text style={styles.controlButtonText}>{nativeError.retryLabel}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" hitSlop={8} style={styles.controlButton} onPress={onFallback}>
              <Text style={styles.controlButtonText}>WebView 兜底</Text>
            </Pressable>
          </>
        ) : null}
        <Pressable
          style={[
            styles.controlButtonPurple,
            (!controllerView.canGoNext || completionStatus === 'saving') && styles.disabledButton,
          ]}
          disabled={!controllerView.canGoNext || completionStatus === 'saving'}
          hitSlop={8}
          onPress={onNext}
        >
          <Text style={styles.controlButtonText}>跳到下一步</Text>
        </Pressable>
        <Pressable style={styles.transcriptButton}>
          <Text style={styles.controlButtonText}>
            {controllerView.index + 1} / {controllerView.total}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080d18',
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.14)',
    backgroundColor: '#080d18',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  headerButton: {
    minHeight: 44,
    minWidth: 76,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
  },
  headerButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  headerTitle: {
    maxWidth: '100%',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  headerSubtitle: {
    marginTop: 2,
    maxWidth: '100%',
    color: '#cbd5e1',
    fontSize: 11,
  },
  viewport: {
    flex: 1,
  },
  viewportContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalContent: {
    alignItems: 'center',
  },
  canvas: {
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  backgroundDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15,23,42,0.34)',
  },
  fox: {
    position: 'absolute',
    zIndex: 6,
  },
  mediaBackdrop: {
    position: 'absolute',
    zIndex: 4,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  mediaFrame: {
    position: 'absolute',
    zIndex: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(0,0,0,0.88)',
  },
  mediaInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#05070a',
  },
  speechCard: {
    position: 'absolute',
    zIndex: 8,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  hintBubble: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f4d2a2',
    backgroundColor: '#fff0d8',
  },
  hintText: {
    color: '#92400e',
    fontWeight: '700',
    textAlign: 'center',
  },
  optionGrid: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  optionButton: {
    flex: 1,
    maxWidth: 360,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f4d2a2',
    backgroundColor: '#fffaf2',
  },
  optionButtonWrong: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  optionImage: {
    backgroundColor: '#f1f5f9',
  },
  optionTextWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  optionLabel: {
    color: '#b45309',
    fontWeight: '900',
  },
  optionText: {
    marginTop: 2,
    color: '#7c2d12',
    fontWeight: '800',
  },
  textAnswerRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  textAnswerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#f4d2a2',
    backgroundColor: '#fffaf2',
    color: '#7c2d12',
    fontWeight: '800',
  },
  textAnswerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0ea5e9',
  },
  textAnswerButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  recordingPanelWrap: {
    position: 'absolute',
  },
  freeChatPanelWrap: {
    position: 'absolute',
    zIndex: 30,
  },
  feedbackBubble: {
    position: 'absolute',
    alignItems: 'center',
    borderWidth: 1,
  },
  feedbackBubbleCorrect: {
    borderColor: '#86efac',
    backgroundColor: '#dcfce7',
  },
  feedbackBubbleWrong: {
    borderColor: '#fca5a5',
    backgroundColor: '#fee2e2',
  },
  feedbackText: {
    color: '#7f1d1d',
    fontWeight: '800',
    textAlign: 'center',
  },
  conversationList: {
    position: 'absolute',
    zIndex: 12,
  },
  conversationBubble: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  conversationBubbleAssistant: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    borderColor: '#f4d2a2',
    backgroundColor: '#fff7e6',
  },
  conversationBubbleUser: {
    alignSelf: 'flex-end',
    maxWidth: '88%',
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  conversationBubbleLive: {
    borderStyle: 'dashed',
  },
  conversationSpeaker: {
    color: '#334155',
    fontWeight: '800',
  },
  conversationText: {
    color: '#1f2937',
    fontWeight: '700',
  },
  avatar: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#b8ecff',
    backgroundColor: '#fff7ed',
  },
  kidAvatar: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#b8ecff',
    backgroundColor: '#fde7d3',
  },
  kidAvatarText: {
    color: '#9a3412',
    fontWeight: '900',
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  pausePanel: {
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.92)',
    paddingHorizontal: 34,
    paddingVertical: 24,
  },
  pauseTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  pauseText: {
    marginTop: 8,
    color: '#cbd5e1',
    fontSize: 14,
  },
  bottomControls: {
    minHeight: 58,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
    backgroundColor: '#080d18',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  startButton: {
    minHeight: 44,
    minWidth: 96,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#64748b',
    paddingHorizontal: 16,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  controlButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#3f324f',
    paddingHorizontal: 16,
  },
  controlButtonPurple: {
    minHeight: 44,
    minWidth: 96,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(216,180,254,0.5)',
    backgroundColor: '#2e2148',
    paddingHorizontal: 16,
  },
  completionStatusButton: {
    minHeight: 44,
    maxWidth: 360,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.55)',
    backgroundColor: '#422006',
    paddingHorizontal: 16,
  },
  transcriptButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(103,232,249,0.55)',
    backgroundColor: '#12333e',
    paddingHorizontal: 16,
  },
  disabledButton: {
    opacity: 0.45,
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
