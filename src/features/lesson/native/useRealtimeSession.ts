/**
 * WebSocket session hook for realtime lessons.
 * Adapted for React Native from fun-talk-web: useRealtimeSession.ts
 *
 * Key differences from web:
 * - Uses RN's built-in WebSocket (global.WebSocket)
 * - binaryType = "arraybuffer" instead of "blob"
 * - Parses ArrayBuffer directly (no Blob.arrayBuffer() needed)
 */

import { useCallback, useRef } from "react";
import { parseFrame, MSG_TYPE_JSON } from "./parseFrame";
import {
  normalizeRealtimeControlEvent,
  type RealtimeControlEventData,
} from "./sessionProtocol";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DemoPhase =
  | "idle"
  | "story_intro"
  | "story_chat"
  | "free_chat_bridge"
  | "teaching_intro"
  | "challenge";

interface ConnectRealtimeSessionOptions {
  wsUrl: string;
  initCommand: Record<string, unknown>;
}

interface UseRealtimeSessionOptions {
  getDemoPhase: () => DemoPhase;
  onControlEvent: (event: RealtimeControlEventData) => void;
  onError: (error: Event) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Connection gate (ported from realtimeConversationV2ConnectionGate.ts)
// ---------------------------------------------------------------------------

function shouldProcessRealtimeEvent(params: {
  activeConnectionSerial: number;
  eventConnectionSerial: number;
}): boolean {
  return params.activeConnectionSerial === params.eventConnectionSerial;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRealtimeSession({
  getDemoPhase,
  onControlEvent,
  onError,
  onClose,
}: UseRealtimeSessionOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const connectionSerialRef = useRef(0);

  const shouldAcceptConnectionEvent = useCallback(
    (eventConnectionSerial: number) =>
      shouldProcessRealtimeEvent({
        activeConnectionSerial: connectionSerialRef.current,
        eventConnectionSerial,
      }),
    [],
  );

  const sendJson = useCallback((payload: object) => {
    if (
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN
    )
      return;
    wsRef.current.send(JSON.stringify(payload));
  }, []);

  const connect = useCallback(
    async ({ wsUrl, initCommand }: ConnectRealtimeSessionOptions) => {
      if (wsRef.current) return;

      const connectionSerial = connectionSerialRef.current + 1;
      connectionSerialRef.current = connectionSerial;

      const ws = new WebSocket(wsUrl);
      // RN WebSocket supports "arraybuffer" binaryType
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        if (!shouldAcceptConnectionEvent(connectionSerial)) return;
        ws.send(JSON.stringify(initCommand));
      };

      ws.onmessage = (event: WebSocketMessageEvent) => {
        if (!shouldAcceptConnectionEvent(connectionSerial)) return;

        // In RN with binaryType="arraybuffer", binary data arrives as ArrayBuffer
        if (event.data instanceof ArrayBuffer) {
          const frame = parseFrame(event.data);
          if (!frame || frame.type !== MSG_TYPE_JSON) return;

          const text = new TextDecoder().decode(frame.payload);
          try {
            const payload = JSON.parse(text);
            const normalized = normalizeRealtimeControlEvent(payload);
            if (normalized) {
              onControlEvent(normalized);
            } else {
              console.warn(
                "realtime: unsupported control event",
                payload,
              );
            }
          } catch {
            console.warn("realtime: malformed JSON", text);
          }
          return;
        }

        // Handle plain text messages (uncommon but possible)
        if (typeof event.data === "string") {
          try {
            const payload = JSON.parse(event.data);
            const normalized = normalizeRealtimeControlEvent(payload);
            if (normalized) {
              onControlEvent(normalized);
            }
          } catch {
            console.warn(
              "realtime: unhandled text message",
              event.data,
            );
          }
        }
      };

      ws.onerror = (error: Event) => {
        if (!shouldAcceptConnectionEvent(connectionSerial)) return;
        onError(error);
      };

      ws.onclose = () => {
        if (!shouldAcceptConnectionEvent(connectionSerial)) return;
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        onClose();
      };
    },
    [onClose, onControlEvent, onError, shouldAcceptConnectionEvent],
  );

  const disconnect = useCallback(
    (invalidateConnection = true) => {
      if (invalidateConnection) {
        connectionSerialRef.current += 1;
      }
      wsRef.current?.close();
      wsRef.current = null;
    },
    [],
  );

  return {
    connect,
    connectionSerialRef,
    disconnect,
    sendJson,
    wsRef,
  };
}
