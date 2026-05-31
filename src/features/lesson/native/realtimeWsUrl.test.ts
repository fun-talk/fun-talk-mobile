import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRealtimeLessonWsUrl } from './realtimeWsUrl';

test('buildRealtimeLessonWsUrl targets /ws/realtime with deviceID and speaker', async () => {
  const url = await buildRealtimeLessonWsUrl('http://localhost:9000', {
    speaker: 'zh_male_taocheng_uranus_bigtts',
    deviceId: 'device-abc',
  });

  assert.equal(
    url,
    'ws://localhost:9000/ws/realtime?deviceID=device-abc&speaker=zh_male_taocheng_uranus_bigtts',
  );
});

test('buildRealtimeLessonWsUrl appends bearer token when provided', async () => {
  const url = await buildRealtimeLessonWsUrl('http://localhost:9000', {
    speaker: 'fox',
    deviceId: 'x',
    accessToken: 'jwt-token',
  });

  assert.match(url, /[?&]token=jwt-token/);
});

test('buildRealtimeLessonWsUrl accepts ws origins', async () => {
  const url = await buildRealtimeLessonWsUrl('ws://10.0.2.2:9000/', {
    speaker: 'fox',
    deviceId: 'x',
  });

  assert.equal(url, 'ws://10.0.2.2:9000/ws/realtime?deviceID=x&speaker=fox');
});
