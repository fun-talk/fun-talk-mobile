export function shouldPlayChatEndedSpeech(params: {
  currentLifecycle: string | null;
}): boolean {
  return params.currentLifecycle !== 'assistant_turn';
}
