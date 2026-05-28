import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildLessonWebDestination,
  buildLessonWebUrl,
  isCourseHomeWebUrl,
} from './buildLessonWebUrl.ts';
import {
  parseWebViewBridgeMessage,
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
        from: 'course_home',
        course_number: '7',
        total_courses: '10',
        autostart: '1',
        skip_opening: '0',
      }),
      '/app/lesson?lesson_id=7&from=course_home&course_number=7&total_courses=10&autostart=1&skip_opening=0',
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
});
