import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ensureWebViewMicrophonePermission } from './ensureWebViewMicrophonePermission.ts';

describe('ensureWebViewMicrophonePermission', () => {
  it('requests the OS microphone permission on Android before WebView recording', async () => {
    let requested = 0;
    const result = await ensureWebViewMicrophonePermission('android', async () => {
      requested += 1;
      return { granted: true, canAskAgain: true };
    });

    assert.equal(requested, 1);
    assert.deepEqual(result, { granted: true, canAskAgain: true });
  });

  it('returns the denied Android result so the lesson can still load', async () => {
    const result = await ensureWebViewMicrophonePermission('android', async () => ({
      granted: false,
      canAskAgain: false,
    }));

    assert.deepEqual(result, { granted: false, canAskAgain: false });
  });

  it('does not request OS microphone permission on iOS or web', async () => {
    let requested = 0;
    const request = async () => {
      requested += 1;
      return { granted: false, canAskAgain: true };
    };

    assert.deepEqual(await ensureWebViewMicrophonePermission('ios', request), {
      granted: true,
    });
    assert.deepEqual(await ensureWebViewMicrophonePermission('web', request), {
      granted: true,
    });
    assert.equal(requested, 0);
  });
});
