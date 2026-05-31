import type { ApiClient } from '@/lib/api/client';

import type { AudioPlaybackCallbacks } from './useAudioPlayback';

type PlayAssistantSpeechOptions = {
  apiClient: ApiClient;
  text: string;
  speaker: string;
  speed?: number;
  audioPlayback: {
    playAudio: (
      source: { uri: string },
      callbacks?: AudioPlaybackCallbacks,
    ) => Promise<void>;
    stopPlayback: () => Promise<void>;
  };
};

function base64ToDataUri(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Fetches TTS audio from the same endpoint as fun-talk-web and plays it locally.
 */
export async function playAssistantSpeech(
  options: PlayAssistantSpeechOptions,
): Promise<void> {
  const normalizedText = options.text.trim();
  if (!normalizedText) {
    return;
  }

  const response = await options.apiClient.post(
    '/admin/v1/generate_audio_v3',
    {
      text: normalizedText,
      voice_type: options.speaker,
      use_cot: false,
      context_texts: [],
      speed: options.speed ?? 1,
      pitch: 0,
      disable_markdown_filter: true,
    },
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );

  if (!response.ok) {
    throw new Error(`TTS 请求失败 (${response.status})`);
  }

  const data = (await response.json()) as {
    success?: boolean;
    message?: string;
    audio_base64?: string;
  };

  if (!data.success || !data.audio_base64) {
    throw new Error(data.message || 'TTS 返回空音频');
  }

  await options.audioPlayback.playAudio(
    { uri: base64ToDataUri(data.audio_base64, 'audio/mpeg') },
    {},
  );
}
