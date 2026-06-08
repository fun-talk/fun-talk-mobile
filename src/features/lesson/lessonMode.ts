import {
  normalizeRouteParam,
  type LessonRouteParams,
} from './buildLessonWebUrl';

export type LessonRenderMode = 'native' | 'webview';

export type LessonModeRouteParams = LessonRouteParams & {
  native?: string | string[];
  fallback?: string | string[];
  mode?: string | string[];
  native_fallback_reason?: string | string[];
  native_error_category?: string | string[];
};

const FALLBACK_PRESERVED_PARAM_KEYS = [
  'lesson_id',
  'section_id',
  'from',
  'course_number',
  'total_courses',
  'autostart',
  'skip_opening',
  'web_destination',
  'web_base_url',
] as const;

function normalizedFlag(value: string | string[] | undefined): string {
  return normalizeRouteParam(value)?.trim().toLowerCase() ?? '';
}

export function isNativeLessonEnabled(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized !== '0' && normalized !== 'false' && normalized !== 'webview';
}

export function resolveLessonRenderMode(
  params: LessonModeRouteParams,
  nativeEnabled = true,
): LessonRenderMode {
  const fallback = normalizedFlag(params.fallback);
  if (fallback === 'webview' || fallback === '1' || fallback === 'true') {
    return 'webview';
  }

  const explicitMode = normalizedFlag(params.mode);
  if (explicitMode === 'webview') {
    return 'webview';
  }
  if (explicitMode === 'native') {
    return nativeEnabled ? 'native' : 'webview';
  }

  const native = normalizedFlag(params.native);
  if (native === '0' || native === 'false' || native === 'webview') {
    return 'webview';
  }
  if (native === '1' || native === 'true' || native === 'native') {
    return nativeEnabled ? 'native' : 'webview';
  }

  return nativeEnabled ? 'native' : 'webview';
}

export function buildNativeLessonFallbackPath(
  params: LessonModeRouteParams,
  fallback?: { reason?: string; category?: string },
): string {
  const search = new URLSearchParams();

  for (const key of FALLBACK_PRESERVED_PARAM_KEYS) {
    const value = normalizeRouteParam(params[key])?.trim();
    if (value) {
      search.set(key, value);
    }
  }

  search.set('fallback', 'webview');
  search.set('native', '0');
  if (fallback?.reason?.trim()) {
    search.set('native_fallback_reason', fallback.reason.trim());
  }
  if (fallback?.category?.trim()) {
    search.set('native_error_category', fallback.category.trim());
  }
  return `/(app)/lesson?${search.toString()}`;
}
