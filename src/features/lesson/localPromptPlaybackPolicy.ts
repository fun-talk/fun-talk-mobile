type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

type LocalPromptPlaybackPolicyOptions = {
  realtimeEnabled: boolean;
  realtimeStatus: RealtimeStatus;
  hasRealtimeView: boolean;
};

export function shouldAutoPlayLocalPrompt({
  realtimeEnabled,
  realtimeStatus,
  hasRealtimeView,
}: LocalPromptPlaybackPolicyOptions): boolean {
  // Native lesson rendering is runtime-driven. When realtime is enabled, the
  // placeholder controller view must stay silent so the first prompt only plays
  // once from the realtime step that actually owns progression.
  if (realtimeEnabled) {
    return false;
  }
  if (hasRealtimeView) {
    return false;
  }
  return realtimeStatus === 'idle';
}
