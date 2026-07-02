import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseStudentCsv } from './studentCsv';

describe('parseStudentCsv', () => {
  it('parses web-compatible student import rows and normalizes suffixes', () => {
    const rows = parseStudentCsv('学校名,班级名,班级学号后2位,初始密码\n阳光小学,三年级 2 班,7,abc12345');

    assert.deepEqual(rows, [
      {
        school_name: '阳光小学',
        class_name: '三年级 2 班',
        class_suffix: '07',
        initial_password: 'abc12345',
      },
    ]);
  });

  it('returns no rows for an empty or header-only file', () => {
    assert.deepEqual(parseStudentCsv('学校名,班级名,班级学号后2位,初始密码\n'), []);
  });
});
