import { loadNativeExpoFileSystem } from './nativeExpoModules';

/** Matches web `FOX_SPEAKER` — Volcano V3 compatible voice. */
export const FOX_TTS_SPEAKER = 'zh_male_taocheng_uranus_bigtts';

export const FOX_TTS_PITCH = 1;

type FoxTtsRequestOptions = {
  voiceType?: string;
  speed?: number;
  useCot?: boolean;
  pitch?: number;
};

type FoxTtsResponse = {
  success?: boolean;
  message?: string;
  audio_base64?: string;
};

/** Jupiter realtime voices are not supported by `/admin/v1/generate_audio_v3`. */
export function resolveFoxTtsVoiceType(configured?: string): string {
  const voice = (configured || FOX_TTS_SPEAKER).trim() || FOX_TTS_SPEAKER;
  if (voice.includes('jupiter_bigtts')) {
    return FOX_TTS_SPEAKER;
  }
  return voice;
}

function decodeBase64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function fetchFoxTtsFileUri(
  apiBaseUrl: string,
  token: string,
  text: string,
  options: FoxTtsRequestOptions = {},
): Promise<string> {
  const normalizedText = text.trim();
  if (!normalizedText) {
    throw new Error('TTS 文本为空。');
  }

  const voiceType = resolveFoxTtsVoiceType(options.voiceType);
  const useCot = options.useCot ?? /<cot\s+text=/i.test(normalizedText);
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/admin/v1/generate_audio_v3`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: normalizedText,
      voice_type: voiceType,
      use_cot: useCot,
      context_texts: [],
      speed: options.speed ?? 0,
      pitch: options.pitch ?? FOX_TTS_PITCH,
      disable_markdown_filter: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Fox TTS 请求失败 (${response.status})`);
  }

  const payload = (await response.json()) as FoxTtsResponse;
  if (!payload.success || !payload.audio_base64) {
    throw new Error(payload.message || 'Fox TTS 返回空音频');
  }

  const { File, Paths } = await loadNativeExpoFileSystem();
  const file = new File(Paths.cache, `funtalk-fox-tts-${Date.now()}.mp3`);
  file.write(decodeBase64ToBytes(payload.audio_base64));
  return file.uri;
}
