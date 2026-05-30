/**
 * Binary WebSocket frame parsing.
 * Ported from fun-talk-web: realtimeConversationV2Utils.ts
 *
 * Frame format:
 * - 1 byte: message type
 * - 4 bytes: payload length (big-endian)
 * - N bytes: payload
 */

export const MSG_TYPE_JSON = 0;

export interface ParsedFrame {
  type: number;
  payload: ArrayBuffer;
}

export function parseFrame(buffer: ArrayBuffer): ParsedFrame | null {
  if (buffer.byteLength < 5) return null;
  const view = new DataView(buffer);
  const type = view.getUint8(0);
  const length = view.getUint32(1, false); // big-endian
  if (buffer.byteLength < 5 + length) return null;
  return { type, payload: buffer.slice(5, 5 + length) };
}

/**
 * Construct a binary WebSocket request with:
 * - 1 byte version (always 1)
 * - 1 byte message type
 * - 4 bytes sequence number (big-endian)
 * - 4 bytes message length (big-endian)
 * - N bytes payload
 */
export function constructWSRequest(
  payload: string,
  sequence: number,
  messageType: number,
): Uint8Array {
  const headerBuffer = new Uint8Array(10);
  const view = new DataView(headerBuffer.buffer);

  view.setUint8(0, 1); // version
  view.setUint8(1, messageType);
  view.setUint32(2, sequence, false); // big-endian
  const payloadBuffer = new TextEncoder().encode(payload);
  view.setUint32(6, payloadBuffer.length, false); // big-endian

  const buffer = new Uint8Array(10 + payloadBuffer.length);
  buffer.set(headerBuffer, 0);
  buffer.set(payloadBuffer, 10);
  return buffer;
}

/**
 * Encode ArrayBuffer to base64 string.
 * React Native compatible (no FileReader dependency).
 */
export function encodeBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 0x8000; // 32KB chunks
  const chunks: string[] = [];

  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    // Use String.fromCharCode with apply for the chunk
    const str = String.fromCharCode.apply(
      null,
      chunk as unknown as number[],
    );
    chunks.push(str);
  }

  const binary = chunks.join("");
  return btoa(binary);
}
