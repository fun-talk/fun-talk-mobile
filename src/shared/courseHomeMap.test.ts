import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCourseMapNodes,
  getCourseButtonImage,
  getCourseMapHeight,
  getCoursePosition,
  getPublishedLessons,
  MAP_SEGMENT_HEIGHT,
} from './courseHomeMap';

describe('courseHomeMap', () => {
  it('keeps only published lessons sorted by id', () => {
    assert.deepEqual(
      getPublishedLessons([
        { id: 3, status: 1, title: 'Lesson 3' },
        { id: 1, status: 0, title: 'Draft' },
        { id: 2, status: 1, title: 'Lesson 2' },
      ]),
      [
        { id: 2, status: 1, title: 'Lesson 2' },
        { id: 3, status: 1, title: 'Lesson 3' },
      ],
    );
  });

  it('extends the map vertically after the base path is full', () => {
    assert.deepEqual(getCoursePosition(22), { x: 2575, y: 1940 });
    assert.deepEqual(getCoursePosition(23), { x: 925, y: 700 + MAP_SEGMENT_HEIGHT });
    assert.equal(getCourseMapHeight(23), MAP_SEGMENT_HEIGHT);
    assert.equal(getCourseMapHeight(24), MAP_SEGMENT_HEIGHT * 2);
  });

  it('builds sequential course nodes while preserving backend lesson ids', () => {
    assert.deepEqual(
      buildCourseMapNodes(
        [
          { id: 1, status: 1, title: '第一课' },
          { id: 4, status: 1, title: '第二课' },
        ],
        2,
      ).map((node) => ({
        number: node.number,
        lessonId: node.lessonId,
        title: node.title,
      })),
      [
        { number: 1, lessonId: '1', title: '第一课' },
        { number: 2, lessonId: '4', title: '第二课' },
      ],
    );
  });

  it('uses green for completed courses and grey for incomplete ones', () => {
    assert.equal(getCourseButtonImage(true), '/images/home/button-green.png');
    assert.equal(getCourseButtonImage(false), '/images/home/button-grey.png');
  });
});
