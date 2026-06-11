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

export type WebViewCourseProgressUpdate = {
  kind: 'course_progress_completed';
  courseNumber: number;
  totalCourses: number;
  currentCourseNumber: number;
  completedCourseNumbers: number[];
};

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

export function resolveWebViewCourseProgressUpdate(
  message: WebViewBridgeMessage,
): WebViewCourseProgressUpdate | null {
  if (message.messageType !== 21) {
    return null;
  }
  const payload = parsePayloadObject(message.payload);
  if (!payload) {
    return null;
  }

  const courseNumber = Number(payload.courseNumber);
  const totalCourses = Number(payload.totalCourses);
  const currentCourseNumber = Number(payload.currentCourseNumber);
  const completedCourseNumbers = Array.isArray(payload.completedCourseNumbers)
    ? payload.completedCourseNumbers
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 1)
    : [];

  if (
    !Number.isInteger(courseNumber) ||
    !Number.isInteger(totalCourses) ||
    !Number.isInteger(currentCourseNumber) ||
    courseNumber < 1 ||
    totalCourses < 1 ||
    currentCourseNumber < 1
  ) {
    return null;
  }

  return {
    kind: 'course_progress_completed',
    courseNumber,
    totalCourses,
    currentCourseNumber,
    completedCourseNumbers,
  };
}
