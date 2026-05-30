/**
 * Realtime lesson flow state machine skeleton.
 * Ported from fun-talk-web: useRealtimeConversationV2Flow.ts (6861 lines).
 *
 * This is the orchestrator that wires together:
 * - 6a: Lesson definition loading
 * - 6b: Shell UI rendering
 * - 6c: WebSocket connection
 * - 6d: Audio playback
 * - 6e: Audio recording
 *
 * Phase 6 delivers the skeleton first. Individual teaching step types
 * (challenge, duolingo, story intro, etc.) are added incrementally.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ApiClient } from "@/lib/api/client";
import {
  type RealtimeLessonDefinition,
} from "./lessonDefinition";
import { useRealtimeSession } from "./useRealtimeSession";
import type { DemoPhase } from "./useRealtimeSession";
import {
  buildInitSessionCommand,
  type RealtimeControlEventData,
} from "./sessionProtocol";
import type { AudioPlaybackCallbacks } from "./useAudioPlayback";
import type { AudioRecordingCallbacks } from "./useAudioRecording";

// ---------------------------------------------------------------------------
// Constants (mirrors web realtimeConversationV2.types.ts)
// ---------------------------------------------------------------------------

const FOX_SPEAKER = "zh_male_taocheng_uranus_bigtts";
const FOX_TTS_SPEED = 1.0;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface Message {
  role: "user" | "assistant" | "system";
  text: string;
}

export interface LessonFlowState {
  /** WebSocket connection status */
  connectionStatus: ConnectionStatus;
  /** Current phase of the lesson */
  demoPhase: DemoPhase;
  /** Whether audio recording is active */
  isRecording: boolean;
  /** Whether the bot is currently speaking (TTS playing) */
  isBotSpeaking: boolean;
  /** Chat transcript messages */
  messages: Message[];
  /** Whether transcript panel is visible */
  showTranscript: boolean;
  /** Current screen text (step prompt, instruction, etc.) */
  screenText: string;
  /** Error message if something went wrong */
  error: string | null;
  /** Whether the lesson flow is actively running */
  isFlowRunning: boolean;
  /** Current challenge template key */
  currentChallengeKey: string | null;
  /** Session ID from server (for resume) */
  sessionId: string | null;
}

export interface LessonFlowActions {
  /** Start the lesson flow (connect + init) */
  startFlow: () => void;
  /** Stop the lesson flow (disconnect) */
  stopFlow: () => void;
  /** Toggle transcript visibility */
  toggleTranscript: () => void;
  /** Clear messages */
  clearMessages: () => void;
  /** Send a JSON command through the WebSocket */
  sendCommand: (payload: object) => void;
  /** Restart recording (for manual speech control) */
  restartRecording: () => void;
}

export interface LessonFlowRefs {
  wsRef: React.RefObject<WebSocket | null>;
  sessionIdRef: React.RefObject<string | null>;
}

export interface UseLessonFlowOptions {
  apiClient: ApiClient;
  lessonDefinition: RealtimeLessonDefinition | null;
  /** Audio playback hook result (from useAudioPlayback) */
  audioPlayback: {
    playAudio: (
      source: { uri: string } | number,
      callbacks?: AudioPlaybackCallbacks,
    ) => Promise<void>;
    stopPlayback: () => Promise<void>;
    preloadAudio: (
      source: { uri: string } | number,
    ) => Promise<import("expo-av").Audio.Sound | null>;
  };
  /** Audio recording hook result (from useAudioRecording) */
  audioRecording: {
    startRecording: (
      callbacks?: AudioRecordingCallbacks,
    ) => Promise<boolean>;
    stopRecording: () => Promise<string | null>;
    stopAndUnload: () => Promise<void>;
    isRecording: boolean;
  };
  /** WebSocket server base URL */
  wsBaseUrl: string;
  /** Called when an error occurs */
  onError?: (error: string) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLessonFlow({
  apiClient: _apiClient,
  lessonDefinition,
  audioPlayback,
  audioRecording,
  wsBaseUrl,
  onError,
}: UseLessonFlowOptions): LessonFlowState & LessonFlowActions & LessonFlowRefs {
  // ------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [demoPhase, setDemoPhase] = useState<DemoPhase>("idle");
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [screenText, setScreenText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isFlowRunning, setIsFlowRunning] = useState(false);
  const [currentChallengeKey, setCurrentChallengeKey] = useState<
    string | null
  >(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // ------------------------------------------------------------------
  // Refs (kept across renders for event handlers)
  // ------------------------------------------------------------------

  const demoPhaseRef = useRef<DemoPhase>("idle");
  const sessionIdRef = useRef<string | null>(null);
  const flowRunningRef = useRef(false);
  const lessonRef = useRef<RealtimeLessonDefinition | null>(null);

  // Keep refs in sync
  demoPhaseRef.current = demoPhase;
  sessionIdRef.current = sessionId;
  flowRunningRef.current = isFlowRunning;
  lessonRef.current = lessonDefinition;

  // ------------------------------------------------------------------
  // WebSocket session (6c)
  // ------------------------------------------------------------------

  const handleControlEvent = useCallback(
    (event: RealtimeControlEventData) => {
      console.log("realtime control event:", event.event, event);

      switch (event.event) {
        case "session_created":
          if (event.session_id) {
            setSessionId(event.session_id);
            sessionIdRef.current = event.session_id;
          }
          setConnectionStatus("connected");
          break;

        case "lesson_started":
          setDemoPhase("teaching_intro");
          // TODO: Transition to first teaching segment
          break;

        case "assistant_text":
          if (event.text) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", text: event.text! },
            ]);
          }
          break;

        case "step_transition":
          if (event.step_payload) {
            const payload = event.step_payload;
            if (payload.protocol === "duolingo") {
              setDemoPhase("challenge");
              setCurrentChallengeKey("template_duolingo");
            } else if (payload.step !== undefined) {
              setDemoPhase("challenge");
            }
            if (typeof payload.screen_text === "string") {
              setScreenText(payload.screen_text);
            }
          }
          break;

        case "user_transcript":
          if (event.text) {
            setMessages((prev) => [
              ...prev,
              { role: "user", text: event.text! },
            ]);
          }
          break;

        case "bot_speaking_start":
          setIsBotSpeaking(true);
          break;

        case "bot_speaking_end":
          setIsBotSpeaking(false);
          break;

        case "error":
          setError(event.message || "未知错误");
          setConnectionStatus("error");
          onError?.(event.message || "服务器错误");
          break;

        case "lesson_complete":
          setDemoPhase("idle");
          setScreenText("课程完成！");
          break;

        default:
          // Pass through unknown events for incremental support
          console.log("realtime: unhandled event type", event.event);
      }
    },
    [onError],
  );

  const handleWsError = useCallback(
    (_error: Event) => {
      setConnectionStatus("error");
      setError("WebSocket 连接失败");
      onError?.("WebSocket 连接失败");
    },
    [onError],
  );

  const handleWsClose = useCallback(() => {
    setConnectionStatus("disconnected");
    setIsFlowRunning(false);
  }, []);

  const {
    connect: wsConnect,
    disconnect: wsDisconnect,
    sendJson,
    wsRef,
  } = useRealtimeSession({
    getDemoPhase: () => demoPhaseRef.current,
    onControlEvent: handleControlEvent,
    onError: handleWsError,
    onClose: handleWsClose,
  });

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  const startFlow = useCallback(() => {
    if (!lessonDefinition) {
      setError("课程定义未加载");
      return;
    }

    setError(null);
    setConnectionStatus("connecting");
    setIsFlowRunning(true);

    const initCommand = buildInitSessionCommand({
      systemRole: "你是一只叫欧波的聪明小狐狸，用活泼温暖的语气和小朋友对话。",
      agentPromptTemplate: "template_2",
      botName: lessonDefinition.metadata.botName || "欧波",
      speaker: FOX_SPEAKER,
      ttsSpeed: FOX_TTS_SPEED,
      useFrontendTts: false,
      useLessonRuntime: true,
      lessonId: lessonDefinition.metadata.id,
    });

    // Build WebSocket URL from lesson definition or default
    const wsUrl = wsBaseUrl.replace(/\/$/, "");

    wsConnect({ wsUrl, initCommand });
  }, [lessonDefinition, wsBaseUrl, wsConnect]);

  const stopFlow = useCallback(() => {
    wsDisconnect(true);
    setIsFlowRunning(false);
    setIsBotSpeaking(false);
    setDemoPhase("idle");
    audioPlayback.stopPlayback().catch(() => {});
    audioRecording.stopAndUnload().catch(() => {});
  }, [wsDisconnect, audioPlayback, audioRecording]);

  const toggleTranscript = useCallback(() => {
    setShowTranscript((prev) => !prev);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const sendCommand = useCallback(
    (payload: object) => {
      sendJson(payload);
    },
    [sendJson],
  );

  const restartRecording = useCallback(() => {
    audioRecording
      .startRecording({
        onError: (msg) => setError(msg),
      })
      .catch(() => {});
  }, [audioRecording]);

  // ------------------------------------------------------------------
  // Auto-start (optional: when lessonDefinition becomes available)
  // ------------------------------------------------------------------

  const hasAutoStarted = useRef(false);

  useEffect(() => {
    if (
      lessonDefinition &&
      !hasAutoStarted.current &&
      !isFlowRunning
    ) {
      // Don't auto-start; wait for user to tap "开始课程"
      hasAutoStarted.current = true;
    }
  }, [lessonDefinition, isFlowRunning]);

  // Reset auto-start when lesson changes
  useEffect(() => {
    hasAutoStarted.current = false;
  }, [lessonDefinition?.metadata.id]);

  // ------------------------------------------------------------------
  // Return
  // ------------------------------------------------------------------

  return useMemo(
    () => ({
      // State
      connectionStatus,
      demoPhase,
      isRecording: audioRecording.isRecording,
      isBotSpeaking,
      messages,
      showTranscript,
      screenText,
      error,
      isFlowRunning,
      currentChallengeKey,
      sessionId,
      // Actions
      startFlow,
      stopFlow,
      toggleTranscript,
      clearMessages,
      sendCommand,
      restartRecording,
      // Refs
      wsRef,
      sessionIdRef,
    }),
    [
      connectionStatus,
      demoPhase,
      audioRecording.isRecording,
      isBotSpeaking,
      messages,
      showTranscript,
      screenText,
      error,
      isFlowRunning,
      currentChallengeKey,
      sessionId,
      startFlow,
      stopFlow,
      toggleTranscript,
      clearMessages,
      sendCommand,
      restartRecording,
      wsRef,
    ],
  );
}
