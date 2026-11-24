import type { KeyValueStorage } from '@/lib/storage/asyncStorage';

export const PRIVACY_CONSENT_STORAGE_KEY = 'ft:privacy-consent';

/**
 * Version of the privacy policy the user agreed to. Keep it equal to the
 * “最近更新时间” of fun-talk-web/public/legal/privacy-policy.html; bumping it
 * shows the first-launch consent popup again to every user.
 */
export const PRIVACY_CONSENT_VERSION = '2026-06-01';

type StoredConsent = {
  version: string;
  acceptedAt: number;
};

function parseStoredConsent(raw: string | null): StoredConsent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredConsent>;
    if (typeof value.version !== 'string' || typeof value.acceptedAt !== 'number') return null;
    return { version: value.version, acceptedAt: value.acceptedAt };
  } catch {
    return null;
  }
}

export async function hasAcceptedPrivacyConsent(
  storage: KeyValueStorage,
  version: string = PRIVACY_CONSENT_VERSION,
): Promise<boolean> {
  const stored = parseStoredConsent(await storage.getItem(PRIVACY_CONSENT_STORAGE_KEY));
  return stored?.version === version;
}

export async function acceptPrivacyConsent(
  storage: KeyValueStorage,
  now: number = Date.now(),
  version: string = PRIVACY_CONSENT_VERSION,
): Promise<void> {
  const value: StoredConsent = { version, acceptedAt: now };
  await storage.setItem(PRIVACY_CONSENT_STORAGE_KEY, JSON.stringify(value));
}
