export type RealtimeWireFrame =
  | { kind: 'json'; payload: Record<string, unknown> }
  | { kind: 'audio'; payload: Uint8Array };

export const MSG_TYPE_JSON = 0;
export const MSG_TYPE_AUDIO = 1;

function toUint8Array(data: unknown): Uint8Array | null {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  return null;
}

export function unpackRealtimeWireFrame(data: unknown): RealtimeWireFrame | null {
  const bytes = toUint8Array(data);
  if (!bytes || bytes.byteLength < 5) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const type = view.getUint8(0);
  const length = view.getUint32(1, false);
  if (length < 0 || bytes.byteLength < 5 + length) {
    return null;
  }
  const payload = bytes.slice(5, 5 + length);

  if (type === MSG_TYPE_JSON) {
    try {
      const parsed = JSON.parse(new TextDecoder().decode(payload)) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { kind: 'json', payload: parsed as Record<string, unknown> };
      }
    } catch {
      return null;
    }
  }
  if (type === MSG_TYPE_AUDIO) {
    return { kind: 'audio', payload };
  }
  return null;
}

export function packRealtimeWireFrame(type: number, payload: Uint8Array): ArrayBuffer {
  const frame = new Uint8Array(5 + payload.length);
  const view = new DataView(frame.buffer);
  view.setUint8(0, type);
  view.setUint32(1, payload.length, false);
  frame.set(payload, 5);
  return frame.buffer;
}

export function packRealtimeJsonFrame(payload: Record<string, unknown>): ArrayBuffer {
  return packRealtimeWireFrame(
    MSG_TYPE_JSON,
    new TextEncoder().encode(JSON.stringify(payload)),
  );
}

export function packRealtimeAudioFrame(payload: Uint8Array): ArrayBuffer {
  return packRealtimeWireFrame(MSG_TYPE_AUDIO, payload);
}

export function concatAudioChunks(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function writeAscii(bytes: Uint8Array, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    bytes[offset + index] = value.charCodeAt(index);
  }
}

export function createPcm16WavBytes(
  pcm: Uint8Array,
  options: { sampleRate: number; channels: number },
): Uint8Array {
  const headerLength = 44;
  const bytes = new Uint8Array(headerLength + pcm.byteLength);
  const view = new DataView(bytes.buffer);
  const byteRate = options.sampleRate * options.channels * 2;
  const blockAlign = options.channels * 2;

  writeAscii(bytes, 0, 'RIFF');
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeAscii(bytes, 8, 'WAVE');
  writeAscii(bytes, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, options.channels, true);
  view.setUint32(24, options.sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(bytes, 36, 'data');
  view.setUint32(40, pcm.byteLength, true);
  bytes.set(pcm, headerLength);

  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1] ?? 0;
    const c = bytes[index + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;
    output += alphabet[(triple >> 18) & 63];
    output += alphabet[(triple >> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(triple >> 6) & 63] : '=';
    output += index + 2 < bytes.length ? alphabet[triple & 63] : '=';
  }
  return output;
}
