const NATIVE_CAPTURE_SAMPLE_RATE = 16000;

export function buildNativeMicGetUserMediaPolyfill(): string {
  return `
(function () {
  if (!window.FunTalkNativeMic) {
    return;
  }
  window.__FUNTALK_NATIVE_MIC__ = true;

  var ctx = null;
  var dest = null;
  var silent = null;
  var pumpTimer = null;
  var nextStart = 0;
  var nativeRate = ${NATIVE_CAPTURE_SAMPLE_RATE};

  function decodeBase64Pcm(b64) {
    if (!b64) return null;
    var binary = atob(b64);
    var len = binary.length;
    if (len < 2) return null;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    var sampleCount = (len / 2) | 0;
    var int16 = new Int16Array(bytes.buffer, 0, sampleCount);
    var f32 = new Float32Array(sampleCount);
    for (var j = 0; j < sampleCount; j++) f32[j] = int16[j] / 32768;
    return f32;
  }

  function resampleToContext(f32) {
    var targetRate = (ctx && ctx.sampleRate) || nativeRate;
    if (Math.abs(targetRate - nativeRate) < 1) return f32;
    var outLen = Math.max(1, Math.round(f32.length * targetRate / nativeRate));
    var out = new Float32Array(outLen);
    var ratio = f32.length / outLen;
    for (var i = 0; i < outLen; i++) {
      var srcPos = i * ratio;
      var i0 = srcPos | 0;
      var frac = srcPos - i0;
      var s0 = f32[i0] || 0;
      var s1 = f32[i0 + 1] || s0;
      out[i] = s0 + (s1 - s0) * frac;
    }
    return out;
  }

  function stopNative() {
    if (pumpTimer) {
      clearInterval(pumpTimer);
      pumpTimer = null;
    }
    try { window.FunTalkNativeMic.stop(); } catch (e) {}
    nextStart = 0;
    dest = null;
    silent = null;
    if (ctx && ctx.state !== 'closed') {
      try { ctx.close(); } catch (e) {}
    }
    ctx = null;
  }

  function pumpNativePcm() {
    if (!ctx || !dest) return;
    var f32 = null;
    try { f32 = decodeBase64Pcm(window.FunTalkNativeMic.readPcm()); } catch (e) { return; }
    if (!f32 || !f32.length) return;
    f32 = resampleToContext(f32);
    var buffer = ctx.createBuffer(1, f32.length, ctx.sampleRate);
    buffer.getChannelData(0).set(f32);
    var src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(dest);
    if (silent) src.connect(silent);
    var when = Math.max(ctx.currentTime + 0.015, nextStart);
    try {
      src.start(when);
      nextStart = when + buffer.duration;
    } catch (e) {}
  }

  function createStream() {
    stopNative();
    var ok = false;
    try { ok = window.FunTalkNativeMic.start(nativeRate); } catch (e) { ok = false; }
    if (!ok) {
      return Promise.reject(new Error('native_mic_start_failed'));
    }
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    try {
      ctx = new AudioCtx({ sampleRate: nativeRate });
    } catch (e) {
      ctx = new AudioCtx();
    }
    if (ctx.state === 'suspended' && ctx.resume) {
      ctx.resume();
    }
    dest = ctx.createMediaStreamDestination();
    silent = ctx.createGain();
    silent.gain.value = 0;
    silent.connect(ctx.destination);
    nextStart = ctx.currentTime;
    pumpTimer = setInterval(pumpNativePcm, 20);
    var stream = dest.stream;
    var track = stream.getAudioTracks && stream.getAudioTracks()[0];
    if (track && track.stop) {
      var origStop = track.stop.bind(track);
      track.stop = function () {
        stopNative();
        origStop();
      };
    }
    return Promise.resolve(stream);
  }

  function wrap(constraints) {
    var wantsVideo = !!(constraints && constraints.video);
    var wantsAudio = !constraints || constraints.audio === true || (constraints && typeof constraints.audio === 'object');
    if (wantsAudio && !wantsVideo) {
      return createStream();
    }
    if (navigator.mediaDevices && navigator.mediaDevices.__funtalkOrigGum) {
      return navigator.mediaDevices.__funtalkOrigGum.call(navigator.mediaDevices, constraints);
    }
    return Promise.reject(new Error('getUserMedia unsupported'));
  }

  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {};
  }
  if (!navigator.mediaDevices.__funtalkOrigGum && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.__funtalkOrigGum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  }
  navigator.mediaDevices.getUserMedia = wrap;
  navigator.getUserMedia = function (c, success, fail) {
    wrap(c).then(success, fail);
  };
  navigator.webkitGetUserMedia = navigator.getUserMedia;
})();
`;
}
