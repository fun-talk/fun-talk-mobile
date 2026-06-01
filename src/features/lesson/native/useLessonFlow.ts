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
import { buildRealtimeLessonWsUrl } from "./realtimeWsUrl";
import {
  applyLessonRuntimeControlState,
  type LessonMediaCue,
} from "./lessonRuntimeControl";
import { playAssistantSpeech } from "./playAssistantSpeech";
import {
  buildAssistantPromptSpokenCommand,
  buildInitSessionCommand,
  buildMediaFinishedCommand,
  buildStartLessonCommand,
  type RealtimeControlEventData,
} from "./sessionProtocol";
import type { AudioPlaybackCallbacks } from "./useAudioPlayback";
import type { AudioRecordingCallbacks } from "./useAudioRecording";

// ---------------------------------------------------------------------------
// Constants (mirrors web realtimeConversationV2.types.ts)
// ---------------------------------------------------------------------------

const FOX_SPEAKER = "zh_male_taocheng_uranus_bigtts";
const FOX_TTS_SPEED = 0;

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
  /** Active lesson media cue from LessonRuntime */
  currentMedia: LessonMediaCue | null;
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
  /** Notify server that the current step media finished playing */
  notifyLessonMediaFinished: (summary?: string) => void;
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
    ) => Promise<import("expo-audio").AudioPlayer | null>;
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
  /** Optional Bearer token for `/ws/realtime` when cookies are unavailable. */
  accessToken?: string;
  /** Start lesson flow automatically once the definition is loaded. */
  autoStartOnMount?: boolean;
  /** Called when an error occurs */
  onError?: (error: string) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLessonFlow({
  apiClient,
  lessonDefinition,
  audioPlayback,
  audioRecording,
  wsBaseUrl,
  accessToken,
  autoStartOnMount = false,
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
  const [currentMedia, setCurrentMedia] = useState<LessonMediaCue | null>(null);

  // ------------------------------------------------------------------
  // Refs (kept across renders for event handlers)
  // ------------------------------------------------------------------

  const demoPhaseRef = useRef<DemoPhase>("idle");
  const sessionIdRef = useRef<string | null>(null);
  const flowRunningRef = useRef(false);
  const lessonRef = useRef<RealtimeLessonDefinition | null>(null);
  const sendJsonRef = useRef<(payload: object) => void>(() => {});
  const lessonRuntimeActiveRef = useRef(false);
  const currentLessonStepIdRef = useRef<number | null>(null);
  const currentMediaCueIdRef = useRef<string | null>(null);
  const assistantTextDraftRef = useRef("");
  const assistantSpeechBusyRef = useRef(false);

  // Keep refs in sync
  demoPhaseRef.current = demoPhase;
  sessionIdRef.current = sessionId;
  flowRunningRef.current = isFlowRunning;
  lessonRef.current = lessonDefinition;

  // ------------------------------------------------------------------
  // WebSocket session (6c)
  // ------------------------------------------------------------------

  const lessonRuntimeCtx = useMemo(
    () => ({
      currentStepIdRef: currentLessonStepIdRef,
      currentMediaCueIdRef,
      setScreenText,
      setMessageHint: setScreenText,
      setCurrentMedia,
    }),
    [],
  );

  const notifyAssistantPromptSpoken = useCallback((stepId: number) => {
    sendJsonRef.current(buildAssistantPromptSpokenCommand(stepId));
  }, []);

  const handleLessonChatEnded = useCallback(
    (finalText: string) => {
      const stepId = currentLessonStepIdRef.current;
      assistantTextDraftRef.current = "";
      if (!finalText) {
        setIsBotSpeaking(false);
        if (stepId != null) {
          notifyAssistantPromptSpoken(stepId);
        }
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: finalText },
      ]);
      setScreenText(finalText);

      if (assistantSpeechBusyRef.current) {
        return;
      }
      assistantSpeechBusyRef.current = true;
      void (async () => {
        try {
          setIsBotSpeaking(true);
          await playAssistantSpeech({
            apiClient,
            text: finalText,
            speaker: FOX_SPEAKER,
            speed: 1,
            audioPlayback,
          });
        } catch (speechError) {
          console.warn("assistant speech failed:", speechError);
        } finally {
          setIsBotSpeaking(false);
          assistantSpeechBusyRef.current = false;
          if (stepId != null) {
            notifyAssistantPromptSpoken(stepId);
          }
        }
      })();
    },
    [apiClient, audioPlayback, notifyAssistantPromptSpoken],
  );

  const applySessionReady = useCallback((event: RealtimeControlEventData) => {
    if (event.session_id) {
      setSessionId(event.session_id);
      sessionIdRef.current = event.session_id;
    }
    setConnectionStatus("connected");
    setError(null);

    lessonRuntimeActiveRef.current = event.use_lesson_runtime === true;
    if (event.use_lesson_runtime) {
      sendJsonRef.current(buildStartLessonCommand());
      setScreenText("正在加载课程内容...");
      setDemoPhase("challenge");
    }
  }, []);

  const handleControlEvent = useCallback(
    (event: RealtimeControlEventData) => {
      console.log("realtime control event:", event.event, event);

      switch (event.event) {
        case "session_ready":
        case "session_created":
          applySessionReady(event);
          break;

        case "phase_changed":
          if (event.phase === "challenge") {
            setDemoPhase("challenge");
          }
          break;

        case "lesson_state_snapshot":
        case "step_started":
        case "answer_evaluated":
        case "media_event":
        case "lesson_completed":
          applyLessonRuntimeControlState(event, lessonRuntimeCtx);
          if (event.event === "lesson_state_snapshot" || event.event === "step_started") {
            setDemoPhase("challenge");
          }
          break;

        case "lesson_started":
          setDemoPhase("teaching_intro");
          break;

        case "assistant_message":
          if (lessonRuntimeActiveRef.current && event.text) {
            setScreenText(event.text);
            setMessages((prev) => [
              ...prev,
              { role: "assistant", text: event.text! },
            ]);
          }
          break;

        case "chat":
          if (lessonRuntimeActiveRef.current && event.text) {
            assistantTextDraftRef.current += event.text;
            setScreenText(assistantTextDraftRef.current);
            setIsBotSpeaking(true);
          } else if (event.text) {
            setIsBotSpeaking(true);
            setMessages((prev) => [
              ...prev,
              { role: "assistant", text: event.text! },
            ]);
          }
          break;

        case "chat_ended":
          if (lessonRuntimeActiveRef.current) {
            const finalLessonText = String(
              event.text || assistantTextDraftRef.current || "",
            ).trim();
            handleLessonChatEnded(finalLessonText);
            break;
          }
          setIsBotSpeaking(false);
          break;

        case "tts_start":
          setIsBotSpeaking(true);
          break;

        case "tts_end":
          setIsBotSpeaking(false);
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
    [applySessionReady, handleLessonChatEnded, lessonRuntimeCtx, onError],
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

  sendJsonRef.current = sendJson;

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
      useFrontendTts: true,
      useLessonRuntime: true,
      lessonId: lessonDefinition.metadata.id,
    });

    void (async () => {
      try {
        const wsUrl = await buildRealtimeLessonWsUrl(wsBaseUrl, {
          speaker: FOX_SPEAKER,
          accessToken,
        });
        await wsConnect({ wsUrl, initCommand });
      } catch (connectError) {
        console.warn("realtime websocket connect failed:", connectError);
        setConnectionStatus("error");
        setError("WebSocket 连接失败");
        setIsFlowRunning(false);
        onError?.("WebSocket 连接失败");
      }
    })();
  }, [accessToken, lessonDefinition, onError, wsBaseUrl, wsConnect]);

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

  const notifyLessonMediaFinished = useCallback(
    (summary = "") => {
      if (!lessonRuntimeActiveRef.current) {
        return;
      }
      sendJson(
        buildMediaFinishedCommand({
          cueId: currentMediaCueIdRef.current ?? undefined,
          summary,
        }),
      );
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
    if (!autoStartOnMount || !lessonDefinition || hasAutoStarted.current) {
      return;
    }
    hasAutoStarted.current = true;
    startFlow();
  }, [autoStartOnMount, lessonDefinition, startFlow]);

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
      currentMedia,
      // Actions
      startFlow,
      stopFlow,
      toggleTranscript,
      clearMessages,
      sendCommand,
      restartRecording,
      notifyLessonMediaFinished,
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
      currentMedia,
      startFlow,
      stopFlow,
      toggleTranscript,
      clearMessages,
      sendCommand,
      restartRecording,
      notifyLessonMediaFinished,
      wsRef,
    ],
  );
}
