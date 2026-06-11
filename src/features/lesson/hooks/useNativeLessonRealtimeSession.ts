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
import { resolveStepPromptPlaybackPlan } from '../nativeLessonPromptPlayback';
import type {
  NativeLessonControllerView,
  NativeLessonPhase,
} from '../nativeLessonController';
import { fetchFoxTtsFileUri } from '../nativeFoxTts';
import { useNativeRealtimeAudioPlayback } from './useNativeRealtimeAudioPlayback';

type NativeLessonRealtimeSessionOptions = {
  enabled: boolean;
  apiBaseUrl: string;
  token: string;
  lessonId: string;
  sectionId?: string;
  title: string;
  backgroundImageUrl?: string;
  defaultSpeaker?: string;
  onCaptureTurnEnded?: () => void;
};

type RealtimeSessionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export type RealtimeConversationItem = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  source: 'voice_url' | 'assistant_event' | 'chat_event' | 'asr' | 'user_transcript';
};

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY_MS = 800;
const MAX_RECONNECT_DELAY_MS = 8000;
const MAX_CONVERSATION_ITEMS = 40;

function appendConversationItem(
  current: RealtimeConversationItem[],
  item: RealtimeConversationItem,
): RealtimeConversationItem[] {
  const normalized = item.text.trim();
  if (!normalized) {
    return current;
  }
  const last = current[current.length - 1];
  if (last && last.role === item.role && last.text.trim() === normalized) {
    return current;
  }
  const next = [...current, { ...item, text: normalized }];
  if (next.length <= MAX_CONVERSATION_ITEMS) {
    return next;
  }
  return next.slice(next.length - MAX_CONVERSATION_ITEMS);
}

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
  const currentStepVoiceUrlRef = useRef('');
  const currentAssistantPromptRef = useRef('');
  const ttsReceivedAudioRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const spokenStepIdsRef = useRef(new Set<number>());
  const pendingTranscriptRef = useRef('');
  const conversationSequenceRef = useRef(0);
  const [status, setStatus] = useState<RealtimeSessionStatus>('idle');
  const [projection, setProjection] = useState<RealtimeLessonProjectionState>(
    INITIAL_REALTIME_LESSON_PROJECTION_STATE,
  );
  const [conversationHistory, setConversationHistory] = useState<RealtimeConversationItem[]>([]);
  const [liveUserTranscript, setLiveUserTranscript] = useState('');
  const [errorText, setErrorText] = useState('');
  const [assistantPlaybackPending, setAssistantPlaybackPending] = useState(false);
  const pushConversationItem = useCallback(
    (role: RealtimeConversationItem['role'], text: string, source: RealtimeConversationItem['source']) => {
      const normalized = text.trim();
      if (!normalized) {
        return;
      }
      conversationSequenceRef.current += 1;
      const id = `realtime:${Date.now()}:${conversationSequenceRef.current}`;
      setConversationHistory((current) =>
        appendConversationItem(current, {
          id,
          role,
          text: normalized,
          source,
        }),
      );
    },
    [],
  );
  const markAssistantPromptSpoken = useCallback(() => {
    const stepId = currentStepIdRef.current;
    if (typeof stepId !== 'number' || spokenStepIdsRef.current.has(stepId)) {
      return;
    }
    spokenStepIdsRef.current.add(stepId);
    setAssistantPlaybackPending(false);
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
  const onCaptureTurnEndedRef = useRef(options.onCaptureTurnEnded);

  useEffect(() => {
    onCaptureTurnEndedRef.current = options.onCaptureTurnEnded;
  }, [options.onCaptureTurnEnded]);

  const playLessonAssistantSpeech = useCallback(
    async (text: string, shouldMarkPromptSpoken: boolean) => {
      const normalizedText = text.trim();
      if (!normalizedText) {
        if (shouldMarkPromptSpoken) {
          markAssistantPromptSpoken();
        }
        return;
      }

      const onComplete = shouldMarkPromptSpoken ? markAssistantPromptSpoken : undefined;
      try {
        const uri = await fetchFoxTtsFileUri(options.apiBaseUrl, options.token, normalizedText, {
          voiceType: options.defaultSpeaker,
        });
        await playRemoteUrl(uri, onComplete);
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : 'Fox TTS 合成失败。');
        if (shouldMarkPromptSpoken) {
          markAssistantPromptSpoken();
        }
      }
    },
    [
      markAssistantPromptSpoken,
      options.apiBaseUrl,
      options.defaultSpeaker,
      options.token,
      playRemoteUrl,
    ],
  );

  const playCurrentStepPrompt = useCallback(
    async (markPromptSpoken: boolean) => {
      const stepId = currentStepIdRef.current;
      const shouldMarkPromptSpoken =
        markPromptSpoken &&
        typeof stepId === 'number' &&
        !spokenStepIdsRef.current.has(stepId);
      const playbackPlan = resolveStepPromptPlaybackPlan({
        assistantPrompt: currentAssistantPromptRef.current,
        voiceUrl: currentStepVoiceUrlRef.current,
      });

      try {
        if (playbackPlan.kind === 'remote_url') {
          if (shouldMarkPromptSpoken) {
            setAssistantPlaybackPending(true);
          }
          await playRemoteUrl(
            playbackPlan.voiceUrl,
            shouldMarkPromptSpoken ? markAssistantPromptSpoken : undefined,
          );
          return;
        }

        if (playbackPlan.kind === 'tts') {
          if (shouldMarkPromptSpoken) {
            setAssistantPlaybackPending(true);
          }
          await playLessonAssistantSpeech(playbackPlan.text, shouldMarkPromptSpoken);
          return;
        }

        if (shouldMarkPromptSpoken) {
          markAssistantPromptSpoken();
        }
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : '课程提示音播放失败。');
        if (shouldMarkPromptSpoken) {
          markAssistantPromptSpoken();
        }
      }
    },
    [markAssistantPromptSpoken, playLessonAssistantSpeech, playRemoteUrl],
  );

  const clearSessionState = useCallback(() => {
    sessionIdRef.current = null;
    currentStepIdRef.current = null;
    currentStepPhaseRef.current = null;
    currentStepVoiceUrlRef.current = '';
    currentAssistantPromptRef.current = '';
    ttsReceivedAudioRef.current = false;
    reconnectAttemptRef.current = 0;
    spokenStepIdsRef.current.clear();
    pendingTranscriptRef.current = '';
    conversationSequenceRef.current = 0;
    setProjection(INITIAL_REALTIME_LESSON_PROJECTION_STATE);
    setConversationHistory([]);
    setLiveUserTranscript('');
    setErrorText('');
    setAssistantPlaybackPending(false);
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
            currentStepVoiceUrlRef.current = event.step.voiceUrl?.trim() || '';
            currentAssistantPromptRef.current = event.step.assistantPrompt;
            spokenStepIdsRef.current.delete(event.step.stepId);
            if (event.step.assistantPrompt.trim()) {
              pushConversationItem(
                'assistant',
                event.step.assistantPrompt,
                event.step.voiceUrl ? 'voice_url' : 'assistant_event',
              );
            }
            void playCurrentStepPrompt(true);
          }
          if (
            event.event === 'assistant_message' ||
            event.event === 'assistant_speech_start' ||
            event.event === 'chat' ||
            event.event === 'chat_ended'
          ) {
            if (event.text.trim()) {
              currentAssistantPromptRef.current = event.text.trim();
              pushConversationItem(
                'assistant',
                event.text,
                event.event === 'chat' || event.event === 'chat_ended'
                  ? 'chat_event'
                  : 'assistant_event',
              );
            }
          }
          if (event.event === 'chat_ended') {
            const finalLessonText =
              event.text.trim() || currentAssistantPromptRef.current.trim();
            const stepId = currentStepIdRef.current;
            if (finalLessonText && typeof stepId === 'number') {
              const shouldMarkPromptSpoken = !spokenStepIdsRef.current.has(stepId);
              if (shouldMarkPromptSpoken) {
                setAssistantPlaybackPending(true);
              }
              await playLessonAssistantSpeech(finalLessonText, shouldMarkPromptSpoken);
            }
          }
          if (event.event === 'asr' || event.event === 'user_transcript_partial') {
            const partial = event.text.trim();
            pendingTranscriptRef.current = partial;
            setLiveUserTranscript(partial);
          }
          if (event.event === 'user_transcript_final') {
            pendingTranscriptRef.current = '';
            setLiveUserTranscript('');
            pushConversationItem('user', event.text, 'user_transcript');
          }
          if (event.event === 'asr_ended') {
            const pending = pendingTranscriptRef.current.trim();
            setLiveUserTranscript('');
            if (pending) {
              pushConversationItem('user', pending, 'asr');
              pendingTranscriptRef.current = '';
            }
            onCaptureTurnEndedRef.current?.();
          }
          if (event.event === 'tts_start') {
            if (ttsFallbackTimerRef.current) {
              clearTimeout(ttsFallbackTimerRef.current);
              ttsFallbackTimerRef.current = null;
            }
            ttsReceivedAudioRef.current = false;
            if (currentStepPhaseRef.current === 'free_chat') {
              setAssistantPlaybackPending(true);
            }
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
    playCurrentStepPrompt,
    playLessonAssistantSpeech,
    pushConversationItem,
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
    const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
    socket.send(bytes);
    return true;
  }, []);

  const appendLocalUserTranscript = useCallback(
    (text: string) => {
      const normalized = text.trim();
      if (!normalized) {
        return;
      }
      pendingTranscriptRef.current = '';
      setLiveUserTranscript('');
      pushConversationItem('user', normalized, 'user_transcript');
    },
    [pushConversationItem],
  );

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

  const replayCurrentStepPrompt = useCallback(() => {
    void playCurrentStepPrompt(false);
  }, [playCurrentStepPrompt]);

  return {
    status,
    errorText: errorText || projection.errorText,
    audioStatus,
    assistantPlaybackPending,
    audioErrorText,
    projection,
    conversationHistory,
    liveUserTranscript,
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
    appendLocalUserTranscript,
    replayCurrentStepPrompt,
  };
}
