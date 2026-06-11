import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildLessonWebDestination,
  buildLessonWebUrl,
  isCourseHomeWebUrl,
} from './buildLessonWebUrl.ts';
import {
  buildNativeLessonFallbackPath,
  isNativeLessonEnabled,
  resolveLessonRenderMode,
} from './lessonMode.ts';
import {
  parseWebViewBridgeMessage,
  resolveWebViewCourseProgressUpdate,
  resolveWebViewAuthUpdate,
} from './webViewMessages.ts';

describe('buildLessonWebUrl', () => {
  it('prefers explicit web destination from course home', () => {
    assert.equal(
      buildLessonWebDestination({
        web_destination: '/demos/openingScene?lesson_id=12&return_to=%2Fapp%2Flesson%3Flesson_id%3D12',
        lesson_id: '99',
      }),
      '/demos/openingScene?lesson_id=12&return_to=%2Fapp%2Flesson%3Flesson_id%3D12',
    );
  });

  it('builds lesson query when destination is absent', () => {
    assert.equal(
      buildLessonWebDestination({
        lesson_id: '7',
        section_id: 'abc-section',
        from: 'course_home',
        course_number: '7',
        total_courses: '10',
        autostart: '1',
        skip_opening: '0',
      }),
      '/app/lesson?lesson_id=7&section_id=abc-section&from=course_home&course_number=7&total_courses=10&autostart=1&skip_opening=0',
    );
  });

  it('joins web base url with internal destination path', () => {
    assert.equal(
      buildLessonWebUrl('http://localhost:19001', '/app/lesson?lesson_id=3'),
      'http://localhost:19001/app/lesson?lesson_id=3',
    );
  });

  it('detects course home navigation', () => {
    assert.equal(isCourseHomeWebUrl('http://localhost:19001/app/courses'), true);
    assert.equal(isCourseHomeWebUrl('http://localhost:19001/app/lesson?lesson_id=1'), false);
  });
});

describe('lessonMode', () => {
  it('defaults to native when native lessons are enabled', () => {
    assert.equal(resolveLessonRenderMode({}, true), 'native');
  });

  it('uses webview when explicit fallback or native opt-out is present', () => {
    assert.equal(resolveLessonRenderMode({ fallback: 'webview' }, true), 'webview');
    assert.equal(resolveLessonRenderMode({ native: '0' }, true), 'webview');
  });

  it('uses webview when the native feature flag is disabled', () => {
    assert.equal(resolveLessonRenderMode({}, false), 'webview');
    assert.equal(isNativeLessonEnabled('0'), false);
    assert.equal(isNativeLessonEnabled('false'), false);
    assert.equal(isNativeLessonEnabled(undefined), true);
  });

  it('builds a WebView fallback route while preserving lesson params', () => {
    assert.equal(
      buildNativeLessonFallbackPath({
        lesson_id: '413',
        section_id: 'section-a',
        from: 'course_home',
        course_number: '3',
        total_courses: '23',
        autostart: '1',
        skip_opening: '1',
        web_destination: '/app/lesson?lesson_id=413&section_id=section-a',
        web_base_url: 'http://localhost:19001',
      }),
      '/(app)/lesson?lesson_id=413&section_id=section-a&from=course_home&course_number=3&total_courses=23&autostart=1&skip_opening=1&web_destination=%2Fapp%2Flesson%3Flesson_id%3D413%26section_id%3Dsection-a&web_base_url=http%3A%2F%2Flocalhost%3A19001&fallback=webview&native=0',
    );
  });

  it('adds fallback reason and category when native fails', () => {
    assert.equal(
      buildNativeLessonFallbackPath(
        { lesson_id: '414' },
        {
          reason: 'session:reconnect_failed',
          category: 'session',
        },
      ),
      '/(app)/lesson?lesson_id=414&fallback=webview&native=0&native_fallback_reason=session%3Areconnect_failed&native_error_category=session',
    );
  });
});

describe('webViewMessages', () => {
  it('parses logout bridge message', () => {
    const message = parseWebViewBridgeMessage(
      JSON.stringify({ version: 1, messageType: 3, payload: null }),
    );
    assert.ok(message);
    assert.equal(resolveWebViewAuthUpdate(message!, null)?.kind, 'logout');
  });

  it('maps update user payload into auth patch', () => {
    const message = parseWebViewBridgeMessage(
      JSON.stringify({
        version: 1,
        messageType: 5,
        payload: JSON.stringify({ username: '小明' }),
      }),
    );
    assert.ok(message);
    const update = resolveWebViewAuthUpdate(message!, {
      token: 'abc',
      username: '',
      name: '',
    });
    assert.equal(update?.kind, 'update_user');
    if (update?.kind === 'update_user') {
      assert.equal(update.patch.username, '小明');
      assert.equal(update.patch.hasUsername, true);
    }
  });

  it('maps course completion progress into a native bridge update', () => {
    const message = parseWebViewBridgeMessage(
      JSON.stringify({
        version: 1,
        messageType: 21,
        payload: JSON.stringify({
          courseNumber: 4,
          totalCourses: 23,
          currentCourseNumber: 5,
          completedCourseNumbers: [1, 2, 4],
        }),
      }),
    );
    assert.ok(message);
    assert.deepEqual(resolveWebViewCourseProgressUpdate(message!), {
      kind: 'course_progress_completed',
      courseNumber: 4,
      totalCourses: 23,
      currentCourseNumber: 5,
      completedCourseNumbers: [1, 2, 4],
    });
  });
});
