import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeNativeLessonLayout } from './nativeLessonLayout.ts';

describe('nativeLessonScale', () => {
  it('fits the web canvas inside a landscape tablet viewport', () => {
    const layout = computeNativeLessonLayout({ width: 1366, height: 1024 });

    assert.equal(layout.isLandscapeTablet, true);
    assert.equal(layout.canvasWidth <= 1366, true);
    assert.equal(layout.canvasHeight <= 1024, true);
    assert.equal(layout.scale > 0.3, true);
  });

  it('uses a compact stacked shell for portrait phones', () => {
    const layout = computeNativeLessonLayout({ width: 390, height: 844 });

    assert.equal(layout.isLandscapeTablet, false);
    assert.equal(layout.canvasWidth, 390);
    assert.equal(layout.canvasHeight, 844);
    assert.equal(layout.scale < 0.3, true);
  });
});
