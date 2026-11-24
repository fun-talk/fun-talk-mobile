/**
 * Legal documents (用户协议 / 隐私政策 / 儿童隐私政策).
 *
 * The single source of truth is the HTML under fun-talk-web/public/legal/,
 * served at `${EXPO_PUBLIC_WEB_BASE_URL}/legal/*.html` — the same URL that is
 * submitted to app stores. The app never keeps its own copy of the text:
 * it loads that URL, and falls back to a build-time copy of the same file
 * (legalDocsBundled.generated.ts) only when the network request fails.
 */

export type LegalDocType = 'user' | 'privacy' | 'children';

export type LegalDoc = {
  type: LegalDocType;
  /** Screen title shown in the app header. */
  title: string;
  /** Inline link text used in consent copy, e.g. 《隐私政策》. */
  linkLabel: string;
  /** Path under the web origin. */
  path: string;
};

export const LEGAL_DOCS: Record<LegalDocType, LegalDoc> = {
  user: {
    type: 'user',
    title: '用户服务协议',
    linkLabel: '《用户协议》',
    path: '/legal/user-agreement.html',
  },
  privacy: {
    type: 'privacy',
    title: '隐私政策',
    linkLabel: '《隐私政策》',
    path: '/legal/privacy-policy.html',
  },
  children: {
    type: 'children',
    title: '儿童隐私政策',
    linkLabel: '《儿童隐私政策》',
    path: '/legal/children-privacy.html',
  },
};

export const LEGAL_DOC_TYPES: readonly LegalDocType[] = ['user', 'privacy', 'children'];

/** Query flag that tells the web page it is embedded in the app (hides its own top bar). */
export const LEGAL_EMBED_QUERY = 'embed=app';

export function parseLegalDocType(value: unknown): LegalDocType | null {
  if (Array.isArray(value)) return parseLegalDocType(value[0]);
  if (typeof value !== 'string') return null;
  return (LEGAL_DOC_TYPES as readonly string[]).includes(value) ? (value as LegalDocType) : null;
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export function buildLegalDocUrl(type: LegalDocType, webBaseUrl: string): string {
  return `${trimTrailingSlash(webBaseUrl)}${LEGAL_DOCS[type].path}?${LEGAL_EMBED_QUERY}`;
}

/**
 * Whether the in-app viewer may navigate to `url`. Only pages under
 * `${webBaseUrl}/legal/` (and in-page anchors of them) stay inside the viewer,
 * so links such as “返回登录” in the web page cannot replace the document.
 */
export function isAllowedLegalNavigation(url: string, webBaseUrl: string): boolean {
  if (url === 'about:blank' || url.startsWith('about:srcdoc')) return true;
  let target: URL;
  let base: URL;
  try {
    target = new URL(url);
    base = new URL(trimTrailingSlash(webBaseUrl));
  } catch {
    return false;
  }
  return target.origin === base.origin && target.pathname.startsWith('/legal/');
}
