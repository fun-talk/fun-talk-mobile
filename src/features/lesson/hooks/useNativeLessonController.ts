import { useCallback, useEffect, useMemo, useReducer } from 'react';

import {
  buildNativeLessonControllerItems,
  createNativeLessonControllerState,
  getNativeLessonControllerView,
  reduceNativeLessonController,
} from '../nativeLessonController';
import { getNativeLessonMediaPreloadUris } from '../nativeLessonMedia';
import type { NativeLessonDefinition } from '../nativeLessonTypes';

export function useNativeLessonController(lesson: NativeLessonDefinition) {
  const [state, dispatch] = useReducer(
    (current: ReturnType<typeof createNativeLessonControllerState>, action: Parameters<typeof reduceNativeLessonController>[2]) =>
      reduceNativeLessonController(lesson, current, action),
    lesson,
    createNativeLessonControllerState,
  );

  useEffect(() => {
    dispatch({ type: 'reset' });
  }, [lesson]);

  const view = useMemo(
    () => getNativeLessonControllerView(lesson, state),
    [lesson, state],
  );
  const preloadUris = useMemo(
    () =>
      getNativeLessonMediaPreloadUris(
        buildNativeLessonControllerItems(lesson),
        state.snapshot.currentIndex,
      ),
    [lesson, state.snapshot.currentIndex],
  );

  return {
    state,
    view,
    preloadUris,
    next: useCallback(() => dispatch({ type: 'next' }), []),
    submitChoice: useCallback(
      (optionId: string) => dispatch({ type: 'submit_choice', optionId }),
      [],
    ),
    submitText: useCallback(
      (text: string) => dispatch({ type: 'submit_text', text }),
      [],
    ),
    pause: useCallback(() => dispatch({ type: 'pause' }), []),
    resume: useCallback(() => dispatch({ type: 'resume' }), []),
    reset: useCallback(() => dispatch({ type: 'reset' }), []),
  };
}
