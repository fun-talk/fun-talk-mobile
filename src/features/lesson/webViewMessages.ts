import type { FtAuthRecord } from '@/lib/auth/types';

export type WebViewBridgeMessage = {
  version?: number;
  messageType: number;
  payload?: string | null;
};

export type WebViewAuthUpdate =
  | { kind: 'login'; auth: FtAuthRecord }
  | { kind: 'logout' }
  | { kind: 'update_user'; patch: Partial<FtAuthRecord> };

export function parseWebViewBridgeMessage(raw: string): WebViewBridgeMessage | null {
  try {
    const parsed = JSON.parse(raw) as WebViewBridgeMessage;
    if (typeof parsed.messageType !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parsePayloadObject(payload: string | null | undefined): Record<string, unknown> | null {
  if (!payload) {
    return null;
  }
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function resolveWebViewAuthUpdate(
  message: WebViewBridgeMessage,
  currentAuth: FtAuthRecord | null,
): WebViewAuthUpdate | null {
  switch (message.messageType) {
    case 1: {
      const payload = parsePayloadObject(message.payload);
      if (!payload?.token || typeof payload.token !== 'string') {
        return null;
      }
      const username =
        (typeof payload.username === 'string' && payload.username) ||
        (typeof payload.name === 'string' && payload.name) ||
        '';
      return {
        kind: 'login',
        auth: {
          userId:
            typeof payload.userId === 'string'
              ? payload.userId
              : payload.userId != null
                ? String(payload.userId)
                : currentAuth?.userId || '',
          token: payload.token,
          hasUsername: Boolean(username),
          username,
          name: username,
          phone: typeof payload.phone === 'string' ? payload.phone : currentAuth?.phone || '',
          logo: typeof payload.logo === 'string' ? payload.logo : currentAuth?.logo || '',
          persistent: currentAuth?.persistent ?? true,
          expiresAt: currentAuth?.expiresAt,
          authType: currentAuth?.authType,
        },
      };
    }
    case 3:
      return { kind: 'logout' };
    case 5: {
      const payload = parsePayloadObject(message.payload);
      const username = typeof payload?.username === 'string' ? payload.username : '';
      return {
        kind: 'update_user',
        patch: {
          username,
          name: username,
          hasUsername: Boolean(username.trim()),
        },
      };
    }
    default:
      return null;
  }
}
