import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { createMemoryStorage } from '@/lib/storage/asyncStorage';

import {
  LEGAL_DOCS,
  LEGAL_DOC_TYPES,
  buildLegalDocUrl,
  isAllowedLegalNavigation,
  parseLegalDocType,
} from './legalDocs';
import { BUNDLED_LEGAL_DOCS } from './legalDocsBundled.generated';
import {
  PRIVACY_CONSENT_STORAGE_KEY,
  PRIVACY_CONSENT_VERSION,
  acceptPrivacyConsent,
  hasAcceptedPrivacyConsent,
} from './privacyConsent';

const WEB_BASE = 'https://ai-fun-talk.com';

describe('legal docs', () => {
  it('builds the same public URL that is submitted to app stores', () => {
    assert.equal(
      buildLegalDocUrl('privacy', WEB_BASE),
      'https://ai-fun-talk.com/legal/privacy-policy.html?embed=app',
    );
    assert.equal(
      buildLegalDocUrl('children', `${WEB_BASE}/`),
      'https://ai-fun-talk.com/legal/children-privacy.html?embed=app',
    );
  });

  it('parses only known doc types', () => {
    assert.equal(parseLegalDocType('privacy'), 'privacy');
    assert.equal(parseLegalDocType(['user']), 'user');
    assert.equal(parseLegalDocType('agreement'), null);
    assert.equal(parseLegalDocType(undefined), null);
  });

  it('keeps the viewer on legal pages of the same origin', () => {
    assert.ok(isAllowedLegalNavigation(`${WEB_BASE}/legal/privacy-policy.html?embed=app`, WEB_BASE));
    assert.ok(isAllowedLegalNavigation(`${WEB_BASE}/legal/privacy-policy.html#s2`, WEB_BASE));
    assert.ok(isAllowedLegalNavigation(`${WEB_BASE}/legal/children-privacy.html`, WEB_BASE));
    assert.ok(isAllowedLegalNavigation('about:blank', WEB_BASE));
    assert.equal(isAllowedLegalNavigation(`${WEB_BASE}/frontpage.html`, WEB_BASE), false);
    assert.equal(isAllowedLegalNavigation('https://evil.example/legal/x.html', WEB_BASE), false);
    assert.equal(isAllowedLegalNavigation('not a url', WEB_BASE), false);
  });

  it('bundles an offline copy for every doc', () => {
    for (const type of LEGAL_DOC_TYPES) {
      assert.match(BUNDLED_LEGAL_DOCS[type], /<!DOCTYPE html>/i, type);
    }
    assert.match(BUNDLED_LEGAL_DOCS.privacy, /《狐狸开心学隐私政策》/);
  });

  it('keeps the bundled copy identical to fun-talk-web when that repo is checked out next to this one', (t) => {
    const legalDir = resolve(
      process.env.FUN_TALK_WEB_DIR ?? resolve(process.cwd(), '../fun-talk-web'),
      'public/legal',
    );
    if (!existsSync(legalDir)) {
      t.skip(`fun-talk-web not found at ${legalDir}`);
      return;
    }
    for (const type of LEGAL_DOC_TYPES) {
      const file = LEGAL_DOCS[type].path.replace('/legal/', '');
      const web = readFileSync(resolve(legalDir, file), 'utf8');
      assert.equal(
        BUNDLED_LEGAL_DOCS[type],
        web,
        `${file} changed in fun-talk-web — run \`npm run sync:legal\``,
      );
    }
  });
});

describe('privacy consent', () => {
  it('is required until the user agrees', async () => {
    const storage = createMemoryStorage();
    assert.equal(await hasAcceptedPrivacyConsent(storage), false);

    await acceptPrivacyConsent(storage, 1_700_000_000_000);
    assert.equal(await hasAcceptedPrivacyConsent(storage), true);
    assert.deepEqual(JSON.parse((await storage.getItem(PRIVACY_CONSENT_STORAGE_KEY)) ?? ''), {
      version: PRIVACY_CONSENT_VERSION,
      acceptedAt: 1_700_000_000_000,
    });
  });

  it('asks again when the policy version changes', async () => {
    const storage = createMemoryStorage();
    await acceptPrivacyConsent(storage, 1, '2025-01-01');
    assert.equal(await hasAcceptedPrivacyConsent(storage), false);
    assert.equal(await hasAcceptedPrivacyConsent(storage, '2025-01-01'), true);
  });

  it('treats corrupted storage as not agreed', async () => {
    const storage = createMemoryStorage({ [PRIVACY_CONSENT_STORAGE_KEY]: '{oops' });
    assert.equal(await hasAcceptedPrivacyConsent(storage), false);
  });

  it('matches the update date printed on the web privacy policy', () => {
    const [year, month, day] = PRIVACY_CONSENT_VERSION.split('-').map(Number);
    assert.match(
      BUNDLED_LEGAL_DOCS.privacy,
      new RegExp(`最近更新时间：${year}年${month}月${day}日`),
      'Bump PRIVACY_CONSENT_VERSION when the privacy policy date changes',
    );
  });
});
