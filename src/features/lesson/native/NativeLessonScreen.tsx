import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";

import { useAuth } from "@/features/auth";
import { getApiHost } from "@/lib/env";
import {
  normalizeRouteParam,
  type LessonRouteParams,
} from "../buildLessonWebUrl";
import { useRealtimeLessonDefinition } from "./useLessonLoader";
import { useLessonFlow } from "./useLessonFlow";
import { useAudioPlayback } from "./useAudioPlayback";
import { useAudioRecording } from "./useAudioRecording";

const COURSES_ROUTE = "/(app)/courses" as Href;

// ---------------------------------------------------------------------------
// Default asset URLs (mirrors web realtimeConversationV2.types.ts)
// ---------------------------------------------------------------------------

const DEMO_BACKGROUND_IMAGE_URL =
  "https://fun-talk-file.oss-cn-beijing.aliyuncs.com/demo/revise_bg.JPEG";

interface FoxAvatarVideoProps {
  sourceUri: string;
  isSpeaking: boolean;
}

function FoxAvatarVideo({ sourceUri, isSpeaking }: FoxAvatarVideoProps) {
  const player = useVideoPlayer({ uri: sourceUri }, (videoPlayer) => {
    videoPlayer.muted = true;
    videoPlayer.loop = isSpeaking;
    if (isSpeaking) {
      videoPlayer.play();
    }
  });

  useEffect(() => {
    player.muted = true;
    player.loop = isSpeaking;
    if (isSpeaking) {
      player.play();
    } else {
      player.pause();
      player.currentTime = 0;
    }
  }, [isSpeaking, player]);

  return (
    <VideoView
      player={player}
      style={styles.foxVideo}
      contentFit="contain"
      nativeControls={false}
    />
  );
}

interface StepMediaVideoProps {
  sourceUri: string;
  onFinished: () => void;
}

function StepMediaVideo({ sourceUri, onFinished }: StepMediaVideoProps) {
  const player = useVideoPlayer({ uri: sourceUri }, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.play();
  });

  useEffect(() => {
    const subscription = player.addListener("playToEnd", onFinished);
    player.loop = false;
    player.play();
    return () => {
      subscription.remove();
    };
  }, [onFinished, player]);

  return (
    <VideoView
      player={player}
      style={styles.stepMediaVideo}
      contentFit="contain"
      nativeControls={false}
    />
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function NativeLessonScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<LessonRouteParams>();
  const { auth, apiClient } = useAuth();

  // Resolve lesson params from route
  const lessonId = normalizeRouteParam(params.lesson_id)?.trim() || "";
  const from = normalizeRouteParam(params.from)?.trim();
  const autoStartOnMount = normalizeRouteParam(params.autostart)?.trim() === "1";

  // Load lesson definition via 6a hook
  const { lessonDefinition, error, isLoading } = useRealtimeLessonDefinition(
    apiClient,
    { lessonId: lessonId || undefined },
  );

  // Resolve background image
  const backgroundImageUrl = useMemo(() => {
    if (lessonDefinition?.metadata.coverImageUrl) {
      return lessonDefinition.metadata.coverImageUrl;
    }
    // Use first challenge background as fallback
    const firstChallenge = lessonDefinition?.challenges[0];
    if (firstChallenge?.backgroundImageUrl) {
      return firstChallenge.backgroundImageUrl;
    }
    return DEMO_BACKGROUND_IMAGE_URL;
  }, [lessonDefinition]);

  const handleExit = useCallback(() => {
    if (from) {
      router.replace(`/(app)/courses?from=${encodeURIComponent(from)}` as Href);
    } else {
      router.replace(COURSES_ROUTE);
    }
  }, [router, from]);

  // ------------------------------------------------------------------
  // Audio hooks (6d, 6e) — must be called before any early returns
  // ------------------------------------------------------------------

  const audioPlayback = useAudioPlayback();
  const audioRecording = useAudioRecording();

  // ------------------------------------------------------------------
  // Flow state machine (6f) — must be called before any early returns
  // ------------------------------------------------------------------

  const apiHost = getApiHost();
  const wsBaseUrl = apiHost.replace(/^http/, "ws");
  const mediaFinishedCueRef = useRef<string | null>(null);

  const {
    connectionStatus,
    demoPhase,
    isRecording,
    isBotSpeaking,
    messages,
    showTranscript,
    screenText,
    error: flowError,
    isFlowRunning,
    startFlow,
    stopFlow,
    toggleTranscript,
    clearMessages,
    currentMedia,
    notifyLessonMediaFinished,
  } = useLessonFlow({
    apiClient,
    lessonDefinition,
    audioPlayback,
    audioRecording,
    wsBaseUrl,
    accessToken: auth?.token,
    autoStartOnMount,
  });

  // ------------------------------------------------------------------
  // Auth gate
  // ------------------------------------------------------------------
  if (!auth?.token) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>登录状态已失效，请重新登录</Text>
        <Pressable
          style={styles.exitButton}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.exitButtonText}>返回登录</Text>
        </Pressable>
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------
  if (isLoading && !lessonDefinition) {
    return (
      <View style={styles.centered}>
        <StatusBar style="light" hidden />
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>正在加载课程...</Text>
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Error state
  // ------------------------------------------------------------------
  if (error) {
    return (
      <View style={styles.centered}>
        <StatusBar style="light" hidden />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.exitButton} onPress={handleExit}>
          <Text style={styles.exitButtonText}>返回课程</Text>
        </Pressable>
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Main lesson shell
  // ------------------------------------------------------------------

  const lessonTitle =
    lessonDefinition?.metadata.title || "Realtime Lesson";
  const foxVideos = lessonDefinition?.assets.foxVideos;
  const foxVideoUri =
    (isBotSpeaking ? foxVideos?.talking : foxVideos?.idle) ||
    foxVideos?.idle ||
    foxVideos?.talking ||
    "";

  // Status badge color
  const statusColor =
    connectionStatus === "connected"
      ? "#10b981"
      : connectionStatus === "connecting"
        ? "#f59e0b"
        : connectionStatus === "error"
          ? "#f43f5e"
          : "#94a3b8";

  const statusLabel =
    connectionStatus === "connected"
      ? "已连接"
      : connectionStatus === "connecting"
        ? "连接中"
        : connectionStatus === "error"
          ? "错误"
          : "未连接";

  const phaseLabel =
    demoPhase === "idle"
      ? "就绪"
      : demoPhase === "story_intro"
        ? "故事导入"
        : demoPhase === "story_chat"
          ? "故事聊天"
          : demoPhase === "teaching_intro"
            ? "教学导入"
            : demoPhase === "challenge"
              ? "闯关"
              : demoPhase === "free_chat_bridge"
                ? "自由聊天"
                : "就绪";

  // Determine screen text display
  const displayScreenText = screenText || (
    isFlowRunning
      ? "课程进行中..."
      : "课程已就绪 · 轻触下方按钮开始"
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden />

      {/* Background layer */}
      <Image
        source={{ uri: backgroundImageUrl }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.backgroundOverlay} />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {lessonTitle}
          </Text>
          <View style={styles.headerBadges}>
            {/* Connection status badge */}
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${statusColor}30` },
              ]}
            >
              <View
                style={[styles.statusDot, { backgroundColor: statusColor }]}
              />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>

            {/* Phase badge */}
            <View style={styles.phaseBadge}>
              <Text style={styles.phaseText}>{phaseLabel}</Text>
            </View>

            {/* Bot speaking indicator */}
            {isBotSpeaking && (
              <View style={styles.speakingBadge}>
                <Text style={styles.speakingText}>欧波说话中...</Text>
              </View>
            )}
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={handleExit}
          style={styles.exitButton}
        >
          <Text style={styles.exitButtonText}>返回课程</Text>
        </Pressable>
      </View>

      {/* Flow error banner */}
      {flowError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{flowError}</Text>
        </View>
      ) : null}

      {/* Main canvas */}
      <View style={styles.canvas}>
        {/* Fox Avatar area */}
        {foxVideoUri ? (
          <View style={styles.foxAvatarContainer}>
            <FoxAvatarVideo
              key={foxVideoUri}
              sourceUri={foxVideoUri}
              isSpeaking={isBotSpeaking}
            />
          </View>
        ) : null}

        {/* Media display area */}
        <View style={styles.mediaArea}>
          {currentMedia?.kind === "video" && currentMedia.url ? (
            <StepMediaVideo
              key={currentMedia.cueId || currentMedia.url}
              sourceUri={currentMedia.url}
              onFinished={() => {
                const cueKey =
                  currentMedia.cueId || currentMedia.url || "video";
                if (mediaFinishedCueRef.current === cueKey) {
                  return;
                }
                mediaFinishedCueRef.current = cueKey;
                notifyLessonMediaFinished(
                  currentMedia.description || "video_finished",
                );
              }}
            />
          ) : screenText ? (
            <View style={styles.mediaPlaceholder}>
              <Text style={styles.screenTextDisplay}>{screenText}</Text>
            </View>
          ) : (
            <View style={styles.mediaPlaceholder}>
              <Text style={styles.mediaPlaceholderText}>
                {isFlowRunning ? "课程进行中..." : "准备开始课程..."}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom text / interaction area */}
        <View style={styles.bottomArea}>
          {showTranscript ? (
            <ScrollView
              style={styles.transcriptScroll}
              contentContainerStyle={styles.transcriptContent}
            >
              {messages.length === 0 ? (
                <Text style={styles.bottomPlaceholderText}>
                  暂无对话记录
                </Text>
              ) : (
                messages.map((msg, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.messageBubble,
                      msg.role === "user"
                        ? styles.userBubble
                        : styles.assistantBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        msg.role === "user"
                          ? styles.userMessageText
                          : styles.assistantMessageText,
                      ]}
                    >
                      {msg.role === "user" ? "👤 " : "🦊 "}
                      {msg.text}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          ) : (
            <View style={styles.bottomPlaceholder}>
              <Text style={styles.bottomPlaceholderText}>
                {displayScreenText}
              </Text>
              {isRecording && (
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>正在收音...</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Bottom controls bar */}
      <View
        style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}
      >
        {!isFlowRunning ? (
          <Pressable style={styles.startButton} onPress={startFlow}>
            <Text style={styles.startButtonText}>开始课程</Text>
          </Pressable>
        ) : (
          <>
            {/* Transcript toggle */}
            <Pressable
              style={styles.controlButton}
              onPress={toggleTranscript}
            >
              <Text style={styles.controlButtonText}>
                {showTranscript ? "隐藏对话" : "查看对话"}
              </Text>
            </Pressable>

            {/* Clear messages */}
            <Pressable
              style={[styles.controlButton, styles.secondaryButton]}
              onPress={clearMessages}
            >
              <Text style={styles.secondaryButtonText}>清除</Text>
            </Pressable>

            {/* Stop flow */}
            <Pressable
              style={[styles.controlButton, styles.stopButton]}
              onPress={stopFlow}
            >
              <Text style={styles.stopButtonText}>停止</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#020617",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
    padding: 24,
    gap: 16,
  },
  loadingText: {
    color: "#38bdf8",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  errorText: {
    color: "#f87171",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  backgroundOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.35)",
  },

  // Header
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.2)",
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 2,
  },
  exitButton: {
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  exitButtonText: {
    color: "#f8fafc",
    fontWeight: "700",
    fontSize: 14,
  },

  // Canvas
  canvas: {
    flex: 1,
    position: "relative",
  },

  // Fox avatar
  foxAvatarContainer: {
    position: "absolute",
    top: "29%",
    left: "20%",
    width: "16%",
    aspectRatio: 516 / 446,
    zIndex: 20,
  },
  foxVideo: {
    width: "100%",
    height: "100%",
  },

  // Media area
  mediaArea: {
    position: "absolute",
    top: "3%",
    left: "38%",
    width: "39%",
    height: "56%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  stepMediaVideo: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  mediaPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  mediaPlaceholderText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },

  // Bottom text area
  bottomArea: {
    position: "absolute",
    bottom: "5%",
    left: "38%",
    width: "39%",
    height: "30%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  bottomPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  bottomPlaceholderText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },

  // Bottom controls bar
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  startButton: {
    borderRadius: 999,
    backgroundColor: "#2563eb",
    paddingHorizontal: 32,
    paddingVertical: 14,
    minWidth: 180,
    alignItems: "center",
  },
  startButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
  },

  // Control buttons (during flow)
  controlButton: {
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  controlButtonText: {
    color: "#f8fafc",
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  secondaryButtonText: {
    color: "#94a3b8",
    fontWeight: "600",
    fontSize: 14,
  },
  stopButton: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  stopButtonText: {
    color: "#f87171",
    fontWeight: "700",
    fontSize: 14,
  },

  // Header badges
  headerBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  phaseBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  phaseText: {
    color: "#fbbf24",
    fontSize: 10,
    fontWeight: "600",
  },
  speakingBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  speakingText: {
    color: "#34d399",
    fontSize: 10,
    fontWeight: "600",
  },

  // Error banner
  errorBanner: {
    position: "absolute",
    top: 72,
    left: 16,
    right: 16,
    zIndex: 51,
    borderRadius: 12,
    backgroundColor: "rgba(127, 29, 29, 0.92)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorBannerText: {
    color: "#fee2e2",
    fontSize: 13,
    textAlign: "center",
  },

  // Screen text
  screenTextDisplay: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 32,
  },

  // Transcript
  transcriptScroll: {
    flex: 1,
  },
  transcriptContent: {
    padding: 16,
    gap: 8,
  },
  messageBubble: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "90%",
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#2563eb",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#334155",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: "#ffffff",
  },
  assistantMessageText: {
    color: "#e2e8f0",
  },

  // Recording indicator
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ef4444",
  },
  recordingText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "600",
  },
});
