import { getLessonRenderer } from "@/lib/env";
import { LessonWebViewScreen } from "./LessonWebViewScreen";
import { NativeLessonScreen } from "../native/NativeLessonScreen";

/**
 * Routes between Phase 5 WebView and Phase 6 native lesson renderers
 * based on the EXPO_PUBLIC_LESSON_RENDERER env var.
 *
 * - "native" (default): uses React Native components (Phase 6)
 * - "webview": uses WebView-backed lesson (Phase 5 compatibility fallback)
 */
export function LessonScreenRouter() {
  const renderer = getLessonRenderer();

  if (renderer === "native") {
    return <NativeLessonScreen />;
  }

  return <LessonWebViewScreen />;
}
