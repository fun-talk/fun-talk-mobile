import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseFrame,
  constructWSRequest,
  encodeBase64,
  MSG_TYPE_JSON,
} from "./parseFrame";

describe("parseFrame", () => {
  it("parses a valid binary frame", () => {
    const payload = new TextEncoder().encode("hello");
    const buffer = new ArrayBuffer(5 + payload.length);
    const view = new DataView(buffer);
    view.setUint8(0, MSG_TYPE_JSON); // type
    view.setUint32(1, payload.length, false); // length (big-endian)
    new Uint8Array(buffer).set(payload, 5);

    const frame = parseFrame(buffer);
    assert.notEqual(frame, null);
    assert.equal(frame!.type, MSG_TYPE_JSON);
    assert.equal(frame!.payload.byteLength, payload.length);
    assert.equal(
      new TextDecoder().decode(frame!.payload),
      "hello",
    );
  });

  it("returns null for buffer shorter than 5 bytes", () => {
    const buffer = new ArrayBuffer(3);
    assert.equal(parseFrame(buffer), null);
  });

  it("returns null when payload would exceed buffer", () => {
    const buffer = new ArrayBuffer(10);
    const view = new DataView(buffer);
    view.setUint8(0, MSG_TYPE_JSON);
    view.setUint32(1, 100, false); // claim 100 bytes, but buffer is only 10
    assert.equal(parseFrame(buffer), null);
  });

  it("handles zero-length payload", () => {
    const buffer = new ArrayBuffer(5);
    const view = new DataView(buffer);
    view.setUint8(0, MSG_TYPE_JSON);
    view.setUint32(1, 0, false);

    const frame = parseFrame(buffer);
    assert.notEqual(frame, null);
    assert.equal(frame!.payload.byteLength, 0);
  });

  it("handles non-JSON message types", () => {
    const payload = new TextEncoder().encode("binary data");
    const buffer = new ArrayBuffer(5 + payload.length);
    const view = new DataView(buffer);
    view.setUint8(0, 42); // custom type
    view.setUint32(1, payload.length, false);
    new Uint8Array(buffer).set(payload, 5);

    const frame = parseFrame(buffer);
    assert.notEqual(frame, null);
    assert.equal(frame!.type, 42);
  });
});

describe("constructWSRequest", () => {
  it("builds a well-formed binary request", () => {
    const payload = JSON.stringify({ type: "init", bot_name: "欧波" });
    const buffer = constructWSRequest(payload, 1, MSG_TYPE_JSON);

    // Total size: 10 header + payload
    assert.equal(buffer.length, 10 + new TextEncoder().encode(payload).length);

    const view = new DataView(buffer.buffer);
    assert.equal(view.getUint8(0), 1); // version
    assert.equal(view.getUint8(1), MSG_TYPE_JSON); // message type
    assert.equal(view.getUint32(2, false), 1); // sequence
    assert.equal(
      view.getUint32(6, false),
      new TextEncoder().encode(payload).length,
    ); // payload length

    // Verify payload
    const payloadBytes = buffer.slice(10);
    const decoded = new TextDecoder().decode(payloadBytes);
    assert.equal(decoded, payload);
  });

  it("handles different message types", () => {
    const buffer = constructWSRequest("test", 5, 3);
    const view = new DataView(buffer.buffer);
    assert.equal(view.getUint8(1), 3); // message type
    assert.equal(view.getUint32(2, false), 5); // sequence
  });

  it("handles empty payload", () => {
    const buffer = constructWSRequest("", 0, MSG_TYPE_JSON);
    assert.equal(buffer.length, 10); // just header
    const view = new DataView(buffer.buffer);
    assert.equal(view.getUint32(6, false), 0); // zero length
  });

  it("handles UTF-8 multi-byte characters in payload", () => {
    const payload = "你好世界 🌍";
    const buffer = constructWSRequest(payload, 42, MSG_TYPE_JSON);
    const payloadBytes = buffer.slice(10);
    const decoded = new TextDecoder().decode(payloadBytes);
    assert.equal(decoded, payload);
  });

  it("round-trips through parseFrame", () => {
    const original = JSON.stringify({
      type: "init",
      lesson_id: "413",
      bot_name: "欧波",
    });
    const request = constructWSRequest(original, 7, MSG_TYPE_JSON);

    // parseFrame expects type at offset 0, length at offset 1
    // constructWSRequest puts: version(1) + type(1) + seq(4) + len(4) + payload(N)
    // So we need to extract: skip version byte, use type, skip seq, use len
    const view = new DataView(request.buffer);
    const msgType = view.getUint8(1);
    const msgLen = view.getUint32(6, false);

    // Build a frame in parseFrame's expected format: type(1) + len(4) + payload(N)
    const frameBuffer = new ArrayBuffer(5 + msgLen);
    const frameView = new DataView(frameBuffer);
    frameView.setUint8(0, msgType);
    frameView.setUint32(1, msgLen, false);
    new Uint8Array(frameBuffer).set(new Uint8Array(request.buffer, 10, msgLen), 5);

    const parsed = parseFrame(frameBuffer);
    assert.notEqual(parsed, null);
    assert.equal(parsed!.type, MSG_TYPE_JSON);
    assert.equal(new TextDecoder().decode(parsed!.payload), original);
  });
});

describe("encodeBase64", () => {
  it("encodes an ArrayBuffer to base64", () => {
    const text = "Hello, World!";
    const buffer = new TextEncoder().encode(text).buffer;
    const encoded = encodeBase64(buffer);
    // Verify by decoding back
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    assert.equal(decoded, text);
  });

  it("handles empty buffer", () => {
    const buffer = new ArrayBuffer(0);
    const encoded = encodeBase64(buffer);
    assert.equal(encoded, "");
  });

  it("handles binary data", () => {
    const bytes = new Uint8Array([0x00, 0xFF, 0x42, 0x7F, 0x80]);
    const encoded = encodeBase64(bytes.buffer);
    const decoded = Buffer.from(encoded, "base64");
    assert.deepEqual(new Uint8Array(decoded), bytes);
  });
});
