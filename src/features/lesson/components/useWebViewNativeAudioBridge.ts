import { useCallback } from 'react';
import type { RefObject } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import type { WebView } from 'react-native-webview';

import { useAudioRecording } from '../native/useAudioRecording';

const NATIVE_AUDIO_MESSAGE_TYPE = 20;

type NativeAudioAction = 'start' | 'stop' | 'cancel';

type NativeAudioPayload = {
  kind?: 'native_audio';
  action?: NativeAudioAction;
  requestId?: string;
};

type NativeAudioEvent =
  | { kind: 'native_audio'; event: 'started'; requestId: string }
  | {
      kind: 'native_audio';
      event: 'stopped';
      requestId: string;
      uri: string;
      audioBase64: string;
    }
  | { kind: 'native_audio'; event: 'cancelled'; requestId: string }
  | { kind: 'native_audio'; event: 'error'; requestId: string; error: string };

function parsePayload(payload: string | null | undefined): NativeAudioPayload | null {
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as NativeAudioPayload;
    return parsed && parsed.kind === 'native_audio' ? parsed : null;
  } catch {
    return null;
  }
}

function buildDispatchScript(event: NativeAudioEvent): string {
  const payload = JSON.stringify(event).replace(/</g, '\\u003c');
  return `
(function () {
  try {
    window.dispatchEvent(new CustomEvent('funtalk:native-audio', {
      detail: ${payload}
    }));
  } catch (error) {
    console.warn('native audio dispatch failed', error);
  }
})();
true;
`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isNativeAudioBridgeMessage(message: {
  messageType: number;
  payload?: string | null;
}): boolean {
  if (message.messageType !== NATIVE_AUDIO_MESSAGE_TYPE) {
    return false;
  }
  return parsePayload(message.payload) !== null;
}

export function useWebViewNativeAudioBridge(webViewRef: RefObject<WebView | null>) {
  const audioRecording = useAudioRecording();

  const postNativeAudioEvent = useCallback(
    (event: NativeAudioEvent) => {
      webViewRef.current?.injectJavaScript(buildDispatchScript(event));
    },
    [webViewRef],
  );

  const handleNativeAudioMessage = useCallback(
    async (message: { messageType: number; payload?: string | null }) => {
      const payload = parsePayload(message.payload);
      if (!payload?.action || !payload.requestId) {
        return false;
      }

      const requestId = payload.requestId;
      try {
        if (payload.action === 'start') {
          const started = await audioRecording.startRecording({
            onError: (error) => {
              postNativeAudioEvent({
                kind: 'native_audio',
                event: 'error',
                requestId,
                error,
              });
            },
          });

          if (started) {
            postNativeAudioEvent({
              kind: 'native_audio',
              event: 'started',
              requestId,
            });
          }
          return true;
        }

        if (payload.action === 'stop') {
          const uri = await audioRecording.stopRecording();
          if (!uri) {
            postNativeAudioEvent({
              kind: 'native_audio',
              event: 'error',
              requestId,
              error: '没有录到音频，请再试一次',
            });
            return true;
          }

          const audioBase64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          postNativeAudioEvent({
            kind: 'native_audio',
            event: 'stopped',
            requestId,
            uri,
            audioBase64,
          });
          void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
          return true;
        }

        if (payload.action === 'cancel') {
          await audioRecording.stopAndUnload();
          postNativeAudioEvent({
            kind: 'native_audio',
            event: 'cancelled',
            requestId,
          });
          return true;
        }
      } catch (error) {
        postNativeAudioEvent({
          kind: 'native_audio',
          event: 'error',
          requestId,
          error: getErrorMessage(error),
        });
        return true;
      }

      return false;
    },
    [audioRecording, postNativeAudioEvent],
  );

  return { handleNativeAudioMessage };
}
