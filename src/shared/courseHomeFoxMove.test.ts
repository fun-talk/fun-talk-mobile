import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { createMemoryStorage } from '@/lib/storage/asyncStorage';

import {
  consumeCourseHomeFoxMove,
  COURSE_HOME_FOX_MOVE_KEY,
  parseStoredCourseHomeFoxMove,
  writeCourseHomeFoxMove,
} from './courseHomeFoxMove';

describe('course home fox move', () => {
  const storage = createMemoryStorage();

  beforeEach(async () => {
    await storage.removeItem(COURSE_HOME_FOX_MOVE_KEY);
  });

  it('parses a valid pending fox move', () => {
    assert.deepEqual(
      parseStoredCourseHomeFoxMove(
        JSON.stringify({
          fromCourseNumber: 2,
          toCourseNumber: 3,
        }),
        23,
      ),
      {
        fromCourseNumber: 2,
        toCourseNumber: 3,
      },
    );
  });

  it('rejects invalid or non-advancing fox moves', () => {
    assert.equal(
      parseStoredCourseHomeFoxMove(
        JSON.stringify({
          fromCourseNumber: 3,
          toCourseNumber: 3,
        }),
        23,
      ),
      null,
    );
    assert.equal(
      parseStoredCourseHomeFoxMove(
        JSON.stringify({
          fromCourseNumber: 0,
          toCourseNumber: 1,
        }),
        23,
      ),
      null,
    );
  });

  it('writes and consumes a pending fox move once', async () => {
    await writeCourseHomeFoxMove(
      {
        fromCourseNumber: 4,
        toCourseNumber: 5,
      },
      23,
      storage,
    );

    assert.deepEqual(await consumeCourseHomeFoxMove(23, storage), {
      fromCourseNumber: 4,
      toCourseNumber: 5,
    });
    assert.equal(await consumeCourseHomeFoxMove(23, storage), null);
  });
});
