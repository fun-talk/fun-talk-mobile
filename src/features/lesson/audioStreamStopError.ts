const IGNORABLE_AUDIO_STREAM_STOP_PATTERNS = [
  'cannot use shared object that was already released',
  'cannot be cast to type class expo.modules.audio.audiostream',
];

export function isIgnorableAudioStreamStopError(error: unknown): boolean {
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : String(error ?? '');

  const normalizedMessage = message.trim().toLowerCase();
  if (!normalizedMessage) {
    return false;
  }

  return IGNORABLE_AUDIO_STREAM_STOP_PATTERNS.some((pattern) =>
    normalizedMessage.includes(pattern),
  );
}
