type AssistantPlaybackCompletionOptions = {
  shouldMarkPromptSpoken: boolean;
  onMarkPromptSpoken: () => void;
  onPlaybackFinished: () => void;
};

export function createAssistantPlaybackCompletionHandler({
  shouldMarkPromptSpoken,
  onMarkPromptSpoken,
  onPlaybackFinished,
}: AssistantPlaybackCompletionOptions) {
  return () => {
    if (shouldMarkPromptSpoken) {
      onMarkPromptSpoken();
      return;
    }
    onPlaybackFinished();
  };
}
