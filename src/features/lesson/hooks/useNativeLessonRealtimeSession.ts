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
  buildStartLessonCommand,
  buildSubmitChoiceCommand,
  buildSubmitUserTextCommand,
  decodeRealtimeLessonMessage,
  normalizeRealtimeLessonEvent,
} from '../nativeLessonSessionProtocol';
import type { NativeLessonControllerView } from '../nativeLessonController';
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
  const currentStepIdRef = useRef<number | null>(null);
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
    resetBuffer,
    status: audioStatus,
    errorText: audioErrorText,
  } = audioPlayback;

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
        setStatus('connected');
        sendJson(
          socket,
          buildInitSessionCommand({
            lessonId: options.lessonId,
            sectionId: options.sectionId,
            token: options.token,
            resumeSessionId: sessionIdRef.current,
          }),
        );
        sendJson(socket, buildStartLessonCommand());
      };

      socket.onmessage = (message) => {
        void (async () => {
          const wireFrame = unpackRealtimeWireFrame(message.data);
          if (wireFrame?.kind === 'audio') {
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
          }
          if (event.event === 'step_started') {
            currentStepIdRef.current = event.step.stepId;
            spokenStepIdsRef.current.delete(event.step.stepId);
          }
          if (event.event === 'tts_start') {
            if (ttsFallbackTimerRef.current) {
              clearTimeout(ttsFallbackTimerRef.current);
            }
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
            await playBufferedPcm();
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
          reconnectTimerRef.current = setTimeout(() => {
            void connect();
          }, 800);
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
    pushPcmChunk,
    resetBuffer,
  ]);

  useEffect(() => {
    setProjection(INITIAL_REALTIME_LESSON_PROJECTION_STATE);
    if (options.enabled) {
      void connect();
    }
    return closeSocket;
  }, [closeSocket, connect, options.enabled]);

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

  const sendAudioChunk = useCallback((chunk: ArrayBuffer | Uint8Array) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    socket.send(chunk);
    return true;
  }, []);

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
    sendText,
    sendChoice,
    sendMediaFinished,
    sendAssistantPromptSpoken,
    sendAudioChunk,
  };
}
