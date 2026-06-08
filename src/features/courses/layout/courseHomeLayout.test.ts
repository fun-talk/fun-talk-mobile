import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  computeBackgroundTileCount,
  computeBackgroundTileHeight,
  computeMapPixelHeight,
} from './courseHomeLayout';

describe('courseHomeLayout', () => {
  it('keeps each repeated background tile at the base map segment aspect ratio', () => {
    assert.equal(computeBackgroundTileHeight(3325), 2155);
  });

  it('adds more background tiles as the course map grows taller', () => {
    const viewportWidth = 665;
    const tileHeight = computeBackgroundTileHeight(viewportWidth);

    assert.equal(computeBackgroundTileCount(viewportWidth, tileHeight), 1);
    assert.equal(computeBackgroundTileCount(viewportWidth, tileHeight * 4.1), 5);
  });

  it('lets tall maps extend beyond the viewport so long course lists can scroll', () => {
    const viewportWidth = 665;
    const viewportHeight = 900;
    const tallMapHeight = 2155 * 5;

    assert.equal(computeMapPixelHeight(viewportWidth, viewportHeight, tallMapHeight), 2155);
  });
});
