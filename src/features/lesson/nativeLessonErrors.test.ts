import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  NativeLessonUnsupportedError,
  buildNativeLessonFallbackReason,
  classifyNativeLessonError,
} from './nativeLessonErrors.ts';

describe('nativeLessonErrors', () => {
  it('classifies unsupported lesson shape errors with stable fallback reason', () => {
    const error = classifyNativeLessonError(
      'loader',
      new NativeLessonUnsupportedError('empty lesson content'),
    );

    assert.equal(error.category, 'unsupported_lesson_shape');
    assert.equal(error.title, '当前课程暂不支持 Native 渲染');
    assert.equal(error.fallbackReason, 'unsupported_lesson_shape:empty_lesson_content');
  });

  it('keeps fallback reasons compact and url-safe', () => {
    assert.equal(
      buildNativeLessonFallbackReason('session', 'Realtime session 连接失败。'),
      'session:realtime_session',
    );
  });
});

