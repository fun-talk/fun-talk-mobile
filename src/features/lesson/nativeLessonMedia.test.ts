import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildNativeLessonMediaView,
  getNativeLessonMediaPreloadUris,
  shouldAcceptMediaCompletion,
} from './nativeLessonMedia.ts';
import type { NativeLessonControllerView } from './nativeLessonController.ts';

function createView(
  overrides: Partial<NativeLessonControllerView>,
): NativeLessonControllerView {
  return {
    id: 'challenge:club:1',
    phase: 'challenge',
    title: '入队宣誓',
    text: '看这段视频。',
    screenText: '',
    backgroundImageUrl: 'https://example.com/bg.jpg',
    media: null,
    lifecycle: 'assistant_turn',
    isPaused: false,
    index: 0,
    total: 3,
    canGoNext: true,
    ...overrides,
  };
}

describe('nativeLessonMedia', () => {
  it('builds a video playback view that auto plays only in waiting media lifecycle', () => {
    const media = buildNativeLessonMediaView(
      createView({
        media: { type: 'video', url: 'https://example.com/opening.mp4' },
        lifecycle: 'waiting_media',
      }),
    );

    assert.equal(media.kind, 'video');
    assert.equal(media.playbackKey, 'challenge:club:1:https://example.com/opening.mp4');
    assert.equal(media.shouldPlay, true);
  });

  it('pauses video autoplay when the lesson is paused', () => {
    const media = buildNativeLessonMediaView(
      createView({
        media: { type: 'video', url: 'https://example.com/opening.mp4' },
        lifecycle: 'waiting_media',
        isPaused: true,
      }),
    );

    assert.equal(media.kind, 'video');
    assert.equal(media.shouldPlay, false);
  });

  it('uses image rendering for image media', () => {
    const media = buildNativeLessonMediaView(
      createView({
        media: { type: 'image', url: 'https://example.com/seal.png' },
        lifecycle: 'assistant_turn',
      }),
    );

    assert.equal(media.kind, 'image');
    assert.equal(media.uri, 'https://example.com/seal.png');
  });

  it('accepts each media completion key only once', () => {
    const seen = new Set<string>();

    assert.equal(shouldAcceptMediaCompletion(seen, 'a'), true);
    assert.equal(shouldAcceptMediaCompletion(seen, 'a'), false);
    assert.equal(shouldAcceptMediaCompletion(seen, 'b'), true);
  });

  it('selects current and next media urls for preload without duplicates', () => {
    const uris = getNativeLessonMediaPreloadUris(
      [
        createView({ id: 'a', media: { type: 'image', url: 'https://example.com/a.png' } }),
        createView({ id: 'b', media: { type: 'video', url: 'https://example.com/b.mp4' } }),
        createView({ id: 'c', media: { type: 'image', url: 'https://example.com/b.mp4' } }),
        createView({ id: 'd', media: null }),
      ],
      0,
      3,
    );

    assert.deepEqual(uris, ['https://example.com/a.png', 'https://example.com/b.mp4']);
  });
});
