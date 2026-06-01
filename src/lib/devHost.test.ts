import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { rewriteHostForRuntime } from './devHost';

describe('rewriteHostForRuntime', () => {
  it('keeps 10.0.2.2 on Android emulators', () => {
    const host = rewriteHostForRuntime('http://10.0.2.2:9000', 'android', false);
    assert.equal(host, 'http://10.0.2.2:9000');
  });

  it('rewrites 10.0.2.2 to localhost on iOS simulators', () => {
    const host = rewriteHostForRuntime('http://10.0.2.2:9000', 'ios', false);
    assert.equal(host, 'http://localhost:9000');
  });

  it('rewrites Bonjour local hosts to localhost on iOS simulators', () => {
    const host = rewriteHostForRuntime('http://MACdeMacBook-Pro.local:9000', 'ios', false);
    assert.equal(host, 'http://localhost:9000');
  });

  it('keeps Bonjour local hosts on physical devices', () => {
    const host = rewriteHostForRuntime('http://MACdeMacBook-Pro.local:9000', 'ios', true);
    assert.equal(host, 'http://MACdeMacBook-Pro.local:9000');
  });

  it('rewrites 10.0.2.2 to localhost on web and physical devices', () => {
    assert.equal(
      rewriteHostForRuntime('http://10.0.2.2:9000', 'web', false),
      'http://localhost:9000',
    );
    assert.equal(
      rewriteHostForRuntime('http://10.0.2.2:9000', 'android', true),
      'http://localhost:9000',
    );
  });

  it('leaves custom LAN hosts unchanged', () => {
    const host = rewriteHostForRuntime('http://192.168.1.108:9000', 'ios', true);
    assert.equal(host, 'http://192.168.1.108:9000');
  });
});
