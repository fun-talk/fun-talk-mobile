import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildAccountCardsHtml } from './printCards';

describe('buildAccountCardsHtml', () => {
  it('renders account card fields and escapes html', () => {
    const html = buildAccountCardsHtml([
      {
        title: '欧波开心学学生账号',
        digital_id: '83920475',
        password: 'abc<12345',
        hint: '请首次登录后设置昵称并修改密码',
        login_url: 'https://example.com/account/login',
      },
    ]);

    assert.match(html, /83920475/);
    assert.match(html, /abc&lt;12345/);
    assert.match(html, /https:\/\/example.com\/account\/login/);
  });
});
