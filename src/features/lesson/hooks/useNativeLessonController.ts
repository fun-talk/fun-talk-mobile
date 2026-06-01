import { useCallback, useEffect, useMemo, useReducer } from 'react';

import {
  createNativeLessonControllerState,
  getNativeLessonControllerView,
  reduceNativeLessonController,
} from '../nativeLessonController';
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

  return {
    state,
    view,
    next: useCallback(() => dispatch({ type: 'next' }), []),
    pause: useCallback(() => dispatch({ type: 'pause' }), []),
    resume: useCallback(() => dispatch({ type: 'resume' }), []),
    reset: useCallback(() => dispatch({ type: 'reset' }), []),
  };
}
