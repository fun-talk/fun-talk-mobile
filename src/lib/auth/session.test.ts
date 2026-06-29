import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildFtAuthFromAccountSession,
  buildFtAuthFromCheckResponse,
  buildFtAuthFromLoginResponse,
  buildFtAuthFromTeacherLogin,
} from './session';

describe('auth session mapping', () => {
  it('maps frontpage login response into FtAuthRecord', () => {
    const auth = buildFtAuthFromLoginResponse(
      {
        success: true,
        token: 'jwt-token',
        expires_in: 3600,
        user_info: {
          openid: 'openid-1',
          username: '小明',
          phone: '13800000000',
          avatar: 'https://example.com/a.png',
          auth_type: 'phone',
        },
      },
      true,
    );

    assert.equal(auth.userId, 'openid-1');
    assert.equal(auth.token, 'jwt-token');
    assert.equal(auth.username, '小明');
    assert.equal(auth.phone, '13800000000');
    assert.equal(auth.authType, 'phone');
    assert.equal(auth.persistent, true);
    assert.ok(auth.expiresAt && auth.expiresAt > Date.now());
  });

  it('maps check response and preserves remember-me preference', () => {
    const auth = buildFtAuthFromCheckResponse(
      {
        token: 'new-token',
        expires_in: 7200,
        user_info: {
          openid: 'openid-2',
          username: '小红',
          avatar: 'https://example.com/b.png',
        },
      },
      { persistent: false, token: 'old-token', userId: 'openid-2' },
    );

    assert.equal(auth.token, 'new-token');
    assert.equal(auth.username, '小红');
    assert.equal(auth.persistent, false);
  });

  it('maps teacher login response into FtAuthRecord with role metadata', () => {
    const auth = buildFtAuthFromTeacherLogin(
      'teacher-token',
      3600,
      {
        id: 7,
        phone: '13900000000',
        display_name: '李老师',
        role: 'admin',
        school_name: '阳光小学',
        is_admin: true,
      },
      true,
    );

    assert.equal(auth.userId, '7');
    assert.equal(auth.token, 'teacher-token');
    assert.equal(auth.username, '李老师');
    assert.equal(auth.authType, 'teacher');
    assert.equal(auth.accountType, 'teacher_account');
    assert.equal(auth.teacherRole, 'admin');
    assert.equal(auth.isAdmin, true);
    assert.equal(auth.schoolName, '阳光小学');
  });

  it('restores teacher account session without dropping the existing token', () => {
    const auth = buildFtAuthFromAccountSession(
      'teacher',
      undefined,
      undefined,
      { token: 'stored-token', persistent: true },
      {
        id: 8,
        phone: '13800000000',
        display_name: '王老师',
        role: 'teacher',
        school_name: '未来学校',
        is_admin: false,
      },
    );

    assert.equal(auth.userId, '8');
    assert.equal(auth.token, 'stored-token');
    assert.equal(auth.authType, 'teacher');
    assert.equal(auth.teacherRole, 'teacher');
    assert.equal(auth.isAdmin, false);
    assert.equal(auth.schoolName, '未来学校');
  });
});
