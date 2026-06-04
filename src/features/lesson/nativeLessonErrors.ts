export type NativeLessonErrorCategory =
  | 'unsupported_lesson_shape'
  | 'loader'
  | 'session'
  | 'media'
  | 'audio'
  | 'permission'
  | 'progress';

export type NativeLessonErrorView = {
  category: NativeLessonErrorCategory;
  title: string;
  message: string;
  fallbackReason: string;
  retryLabel: string;
};

const ERROR_COPY: Record<NativeLessonErrorCategory, { title: string; retryLabel: string }> = {
  unsupported_lesson_shape: {
    title: '当前课程暂不支持 Native 渲染',
    retryLabel: '重新加载',
  },
  loader: {
    title: '课程加载失败',
    retryLabel: '重试加载',
  },
  session: {
    title: 'Realtime 连接异常',
    retryLabel: '重连',
  },
  media: {
    title: '课程媒体播放异常',
    retryLabel: '重试媒体',
  },
  audio: {
    title: '语音播放异常',
    retryLabel: '重试语音',
  },
  permission: {
    title: '麦克风权限异常',
    retryLabel: '重新授权',
  },
  progress: {
    title: '课程进度保存失败',
    retryLabel: '重试保存',
  },
};

export class NativeLessonUnsupportedError extends Error {
  readonly category = 'unsupported_lesson_shape' as const;

  readonly reason: string;

  constructor(reason: string, message?: string) {
    super(message || reason);
    this.name = 'NativeLessonUnsupportedError';
    this.reason = reason;
  }
}

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }
  return fallback;
}

function safeReasonPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

export function buildNativeLessonFallbackReason(
  category: NativeLessonErrorCategory,
  detail = '',
): string {
  const safeDetail = safeReasonPart(detail);
  return safeDetail ? `${category}:${safeDetail}` : category;
}

export function classifyNativeLessonError(
  category: NativeLessonErrorCategory,
  error: unknown,
): NativeLessonErrorView {
  const resolvedCategory =
    error instanceof NativeLessonUnsupportedError ? error.category : category;
  const detail = error instanceof NativeLessonUnsupportedError ? error.reason : '';
  const copy = ERROR_COPY[resolvedCategory];
  const fallbackMessage =
    resolvedCategory === 'unsupported_lesson_shape'
      ? '这节课的数据结构超出了当前 Native renderer 的支持范围，请切换 WebView 继续上课。'
      : 'Native 课程运行遇到问题，可以重试或切换到 WebView 继续上课。';

  return {
    category: resolvedCategory,
    title: copy.title,
    message: messageFromError(error, fallbackMessage),
    fallbackReason: buildNativeLessonFallbackReason(resolvedCategory, detail),
    retryLabel: copy.retryLabel,
  };
}

