import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getDeviceID } from '@/lib/device/deviceId';

import { unpackRealtimeWireFrame } from '../nativeRealtimeAudio';
import {
  INITIAL_REALTIME_LESSON_PROJECTION_STATE,
  applyRealtimeLessonEvent,
  getRealtimeControllerView,
  type RealtimeLessonProjectionState,
} from '../nativeLessonRealtimeProjection';
import {
  buildAssistantPromptSpokenCommand,
  buildInitSessionCommand,
  buildMediaFinishedCommand,
  buildRealtimeLessonWsUrl,
  buildRequestDebugNextStepCommand,
  buildStartLessonCommand,
  buildSubmitChoiceCommand,
  buildSubmitUserTextCommand,
  decodeRealtimeLessonMessage,
  normalizeRealtimeLessonEvent,
} from '../nativeLessonSessionProtocol';
import type {
  NativeLessonControllerView,
  NativeLessonPhase,
} from '../nativeLessonController';
import { useNativeRealtimeAudioPlayback } from './useNativeRealtimeAudioPlayback';

type NativeLessonRealtimeSessionOptions = {
  enabled: boolean;
  apiBaseUrl: string;
  token: string;
  lessonId: string;
  sectionId?: string;
  title: string;
  backgroundImageUrl?: string;
};

type RealtimeSessionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY_MS = 800;
const MAX_RECONNECT_DELAY_MS = 8000;

function sendJson(socket: WebSocket | null, payload: unknown): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return false;
  }
  socket.send(JSON.stringify(payload));
  return true;
}

export function useNativeLessonRealtimeSession(options: NativeLessonRealtimeSessionOptions) {
  const socketRef = useRef<WebSocket | null>(null);
  const closedByUserRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ttsFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const forceFreshSessionRef = useRef(false);
  const currentStepIdRef = useRef<number | null>(null);
  const currentStepPhaseRef = useRef<NativeLessonPhase | null>(null);
  const currentAssistantPromptRef = useRef('');
  const ttsReceivedAudioRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const spokenStepIdsRef = useRef(new Set<number>());
  const [status, setStatus] = useState<RealtimeSessionStatus>('idle');
  const [projection, setProjection] = useState<RealtimeLessonProjectionState>(
    INITIAL_REALTIME_LESSON_PROJECTION_STATE,
  );
  const [errorText, setErrorText] = useState('');
  const markAssistantPromptSpoken = useCallback(() => {
    const stepId = currentStepIdRef.current;
    if (typeof stepId !== 'number' || spokenStepIdsRef.current.has(stepId)) {
      return;
    }
    spokenStepIdsRef.current.add(stepId);
    sendJson(socketRef.current, buildAssistantPromptSpokenCommand(stepId));
  }, []);
  const audioPlayback = useNativeRealtimeAudioPlayback(() => {
    markAssistantPromptSpoken();
  });
  const {
    pushPcmChunk,
    playBufferedPcm,
    playRemoteUrl,
    resetBuffer,
    status: audioStatus,
    errorText: audioErrorText,
  } = audioPlayback;

  const clearSessionState = useCallback(() => {
    sessionIdRef.current = null;
    currentStepIdRef.current = null;
    currentStepPhaseRef.current = null;
    currentAssistantPromptRef.current = '';
    ttsReceivedAudioRef.current = false;
    reconnectAttemptRef.current = 0;
    spokenStepIdsRef.current.clear();
    setProjection(INITIAL_REALTIME_LESSON_PROJECTION_STATE);
    setErrorText('');
    setStatus('idle');
    resetBuffer();
  }, [resetBuffer]);

  const realtimeView = useMemo<NativeLessonControllerView | null>(
    () =>
      getRealtimeControllerView(projection, {
        title: options.title,
        backgroundImageUrl: options.backgroundImageUrl,
      }),
    [options.backgroundImageUrl, options.title, projection],
  );

  const closeSocket = useCallback(() => {
    closedByUserRef.current = true;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (ttsFallbackTimerRef.current) {
      clearTimeout(ttsFallbackTimerRef.current);
      ttsFallbackTimerRef.current = null;
    }
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  const connect = useCallback(async () => {
    if (!options.enabled || !options.token) {
      return;
    }
    closedByUserRef.current = false;
    setStatus('connecting');
    setErrorText('');

    try {
      const deviceId = await getDeviceID();
      const socket = new WebSocket(
        buildRealtimeLessonWsUrl(options.apiBaseUrl, deviceId, options.token),
      );
      socket.binaryType = 'arraybuffer';
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptRef.current = 0;
        setStatus('connected');
        sendJson(
          socket,
          buildInitSessionCommand({
            lessonId: options.lessonId,
            sectionId: options.sectionId,
            token: options.token,
            resumeSessionId: forceFreshSessionRef.current ? null : sessionIdRef.current,
            allowOwnerResume: forceFreshSessionRef.current ? false : true,
          }),
        );
        forceFreshSessionRef.current = false;
        sendJson(socket, buildStartLessonCommand());
      };

      socket.onmessage = (message) => {
        void (async () => {
          const wireFrame = unpackRealtimeWireFrame(message.data);
          if (wireFrame?.kind === 'audio') {
            ttsReceivedAudioRef.current = true;
            pushPcmChunk(wireFrame.payload);
            return;
          }
          const decoded =
            wireFrame?.kind === 'json'
              ? wireFrame.payload
              : await decodeRealtimeLessonMessage(message.data);
          const event = normalizeRealtimeLessonEvent(decoded);
          if (!event) {
            return;
          }
          if (event.event === 'session_ready' && event.sessionId) {
            sessionIdRef.current = event.sessionId;
          }
          if (event.event === 'lesson_state_snapshot' && event.currentStepId) {
            currentStepIdRef.current = event.currentStepId;
            currentStepPhaseRef.current =
              event.phase === 'story' ||
              event.phase === 'teaching' ||
              event.phase === 'challenge' ||
              event.phase === 'free_chat'
                ? event.phase
                : currentStepPhaseRef.current;
          }
          if (event.event === 'step_started') {
            currentStepIdRef.current = event.step.stepId;
            currentStepPhaseRef.current =
              event.step.phase === 'story' ||
              event.step.phase === 'teaching' ||
              event.step.phase === 'challenge' ||
              event.step.phase === 'free_chat'
                ? event.step.phase
                : null;
            currentAssistantPromptRef.current = event.step.assistantPrompt;
            spokenStepIdsRef.current.delete(event.step.stepId);
            if (event.step.voiceUrl) {
              void playRemoteUrl(event.step.voiceUrl);
            }
          }
          if (event.event === 'assistant_message' || event.event === 'assistant_speech_start') {
            if (event.text.trim()) {
              currentAssistantPromptRef.current = event.text.trim();
            }
          }
          if (event.event === 'tts_start') {
            if (ttsFallbackTimerRef.current) {
              clearTimeout(ttsFallbackTimerRef.current);
            }
            ttsReceivedAudioRef.current = false;
            ttsFallbackTimerRef.current = setTimeout(() => {
              ttsFallbackTimerRef.current = null;
              markAssistantPromptSpoken();
            }, 20000);
            resetBuffer();
            return;
          }
          if (event.event === 'tts_end') {
            if (ttsFallbackTimerRef.current) {
              clearTimeout(ttsFallbackTimerRef.current);
              ttsFallbackTimerRef.current = null;
            }
            if (ttsReceivedAudioRef.current) {
              await playBufferedPcm();
            } else {
              setErrorText('Server TTS 未返回音频，请重试。');
              markAssistantPromptSpoken();
            }
            return;
          }
          setProjection((current) => applyRealtimeLessonEvent(current, event));
        })();
      };

      socket.onerror = () => {
        setStatus('error');
        setErrorText('Realtime session 连接失败。');
      };

      socket.onclose = () => {
        setStatus((current) => (current === 'error' ? 'error' : 'disconnected'));
        socketRef.current = null;
        if (!closedByUserRef.current && options.enabled) {
          if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
            setStatus('error');
            setErrorText('Realtime session 多次重连失败，请重试或切换到 WebView。');
            return;
          }
          const delay = Math.min(
            INITIAL_RECONNECT_DELAY_MS * 2 ** reconnectAttemptRef.current,
            MAX_RECONNECT_DELAY_MS,
          );
          reconnectAttemptRef.current += 1;
          reconnectTimerRef.current = setTimeout(() => {
            void connect();
          }, delay);
        }
      };
    } catch (error) {
      setStatus('error');
      setErrorText(error instanceof Error ? error.message : 'Realtime session 启动失败。');
    }
  }, [
    options.apiBaseUrl,
    options.enabled,
    options.lessonId,
    options.sectionId,
    options.token,
    markAssistantPromptSpoken,
    playBufferedPcm,
    playRemoteUrl,
    pushPcmChunk,
    resetBuffer,
  ]);

  useEffect(() => {
    clearSessionState();
    if (options.enabled) {
      void connect();
    }
    return closeSocket;
  }, [clearSessionState, closeSocket, connect, options.enabled]);

  const sendText = useCallback((text: string, stepId?: number) => {
    return sendJson(socketRef.current, buildSubmitUserTextCommand(text, stepId));
  }, []);

  const sendChoice = useCallback((stepId: number, optionId: string) => {
    return sendJson(socketRef.current, buildSubmitChoiceCommand(stepId, optionId));
  }, []);

  const sendMediaFinished = useCallback((cueId?: string, summary?: string) => {
    return sendJson(socketRef.current, buildMediaFinishedCommand({ cueId, summary }));
  }, []);

  const sendAssistantPromptSpoken = useCallback((stepId: number) => {
    return sendJson(socketRef.current, buildAssistantPromptSpokenCommand(stepId));
  }, []);

  const requestDebugNextStep = useCallback(() => {
    return sendJson(socketRef.current, buildRequestDebugNextStepCommand());
  }, []);

  const sendAudioChunk = useCallback((chunk: ArrayBuffer | Uint8Array) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    socket.send(chunk);
    return true;
  }, []);

  const reset = useCallback(() => {
    closeSocket();
    clearSessionState();
    if (options.enabled) {
      forceFreshSessionRef.current = true;
      closedByUserRef.current = false;
      setStatus('connecting');
      setTimeout(() => {
        void connect();
      }, 0);
    }
  }, [clearSessionState, closeSocket, connect, options.enabled]);

  return {
    status,
    errorText: errorText || projection.errorText,
    audioStatus,
    audioErrorText,
    projection,
    realtimeView,
    isConnected: status === 'connected',
    connect,
    close: closeSocket,
    reset,
    sendText,
    sendChoice,
    sendMediaFinished,
    sendAssistantPromptSpoken,
    requestDebugNextStep,
    sendAudioChunk,
  };
}
