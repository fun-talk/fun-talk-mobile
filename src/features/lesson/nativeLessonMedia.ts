import type { NativeLessonControllerView } from './nativeLessonController';

export type NativeLessonMediaView =
  | {
      kind: 'empty';
      playbackKey: string;
      shouldPlay: false;
      uri: '';
    }
  | {
      kind: 'image' | 'video';
      playbackKey: string;
      shouldPlay: boolean;
      uri: string;
    };

function normalizeMediaType(type: string | undefined): 'image' | 'video' {
  return type === 'image' ? 'image' : 'video';
}

export function buildNativeLessonMediaView(
  view: NativeLessonControllerView,
): NativeLessonMediaView {
  const uri = view.media?.url.trim() ?? '';
  if (!uri) {
    return {
      kind: 'empty',
      playbackKey: `${view.id}:empty`,
      shouldPlay: false,
      uri: '',
    };
  }

  const kind = normalizeMediaType(view.media?.type);
  return {
    kind,
    playbackKey: `${view.id}:${uri}`,
    shouldPlay: kind === 'video' && view.lifecycle === 'waiting_media' && !view.isPaused,
    uri,
  };
}

export function shouldAcceptMediaCompletion(
  completedPlaybackKeys: Set<string>,
  playbackKey: string,
): boolean {
  if (!playbackKey || completedPlaybackKeys.has(playbackKey)) {
    return false;
  }
  completedPlaybackKeys.add(playbackKey);
  return true;
}

export function getNativeLessonMediaPreloadUris(
  views: { media: { url: string } | null }[],
  currentIndex: number,
  lookahead = 2,
): string[] {
  const endIndex = Math.min(views.length, currentIndex + lookahead);
  const urls = new Set<string>();

  for (let index = Math.max(0, currentIndex); index < endIndex; index += 1) {
    const uri = views[index]?.media?.url.trim();
    if (uri) {
      urls.add(uri);
    }
  }

  return [...urls];
}
