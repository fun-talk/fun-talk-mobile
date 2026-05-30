import { useEffect, useState } from "react";
import type { ApiClient } from "@/lib/api/client";
import {
  normalizeRealtimeLessonDefinition,
  type RealtimeLessonDefinition,
} from "./lessonDefinition";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FetchRealtimeLessonOptions {
  lessonId?: string;
  sectionId?: string;
}

export interface RealtimeLessonLoadState {
  lessonDefinition: RealtimeLessonDefinition | null;
  error: string;
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Fetch (standalone, usable without React)
// ---------------------------------------------------------------------------

export async function fetchRealtimeLessonDefinition(
  apiClient: ApiClient,
  options: FetchRealtimeLessonOptions = {},
): Promise<RealtimeLessonDefinition> {
  const params = new URLSearchParams();

  if (options.sectionId?.trim()) {
    params.set("section_id", options.sectionId.trim());
  } else {
    params.set("lesson_id", options.lessonId?.trim() || "413");
  }

  const response = await apiClient.get(
    `/api/v1/realtime_lesson?${params.toString()}`,
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `加载实时教学配置失败：${response.status} ${response.statusText} ${errorText}`,
    );
  }

  const payload = (await response.json()) as { lesson: unknown };
  return normalizeRealtimeLessonDefinition(payload.lesson);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRealtimeLessonDefinition(
  apiClient: ApiClient,
  options: FetchRealtimeLessonOptions,
): RealtimeLessonLoadState {
  const [state, setState] = useState<RealtimeLessonLoadState>({
    lessonDefinition: null,
    error: "",
    isLoading: true,
  });

  const lessonId = options.lessonId?.trim() || "";
  const sectionId = options.sectionId?.trim() || "";

  useEffect(() => {
    // If no lessonId or sectionId, stay in loading until we have params.
    if (!lessonId && !sectionId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setState({ lessonDefinition: null, error: "", isLoading: true });

      try {
        const lessonDefinition = await fetchRealtimeLessonDefinition(
          apiClient,
          { lessonId: lessonId || undefined, sectionId: sectionId || undefined },
        );
        if (!cancelled) {
          setState({ lessonDefinition, error: "", isLoading: false });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            lessonDefinition: null,
            error: error instanceof Error ? error.message : String(error),
            isLoading: false,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiClient, lessonId, sectionId]);

  return state;
}
