import type { ApiClient } from '@/lib/api/client';

import type {
  ReportStatusResult,
  ReportSubmitPayload,
  ReportSubmitResult,
} from '../types';

/**
 * Submit a user report to the backend.
 *
 * TODO: Replace this placeholder with a real API call once the backend endpoint
 * is ready. The function currently validates the payload shape and simulates a
 * successful submission so the UI flow can be tested end-to-end.
 *
 * Expected backend contract:
 *   POST /api/v1/reports
 *   Content-Type: application/json
 *   Body: ReportSubmitPayload
 *
 * Image data is transmitted as Base64 strings inside `screenshots[].base64`,
 * alongside `mime_type` / `file_name` metadata. The backend can reconstruct the
 * files from the Base64 payload.
 *
 * Expected response:
 *   {
 *     "success": true,
 *     "report_id": "uuid-or-serial",
 *     "message": "举报已提交，我们将在3个工作日内处理。"
 *   }
 */
export async function submitReport(
  payload: ReportSubmitPayload,
): Promise<ReportSubmitResult> {
  // Placeholder implementation. Replace with real fetch call.
  // eslint-disable-next-line no-console
  console.log('[submitReport] payload:', {
    ...payload,
    screenshots: payload.screenshots?.map((s) => ({
      ...s,
      // Truncate Base64 data in logs to avoid huge output.
      base64: s.base64 ? `${s.base64.slice(0, 64)}...` : undefined,
    })),
  });

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        report_id: `report_${Date.now()}`,
        message: '举报已提交，我们将在3个工作日内处理。',
      });
    }, 600);
  });
}

/**
 * Query the current status of a previously submitted report.
 *
 * TODO: Replace this placeholder with a real API call.
 *
 * Expected backend contract:
 *   GET /api/v1/reports/:report_id/status
 *
 * Expected response:
 *   {
 *     "report_id": "uuid-or-serial",
 *     "status": "pending" | "processing" | "resolved" | "rejected",
 *     "message": "处理结果说明（可选）",
 *     "resolved_at": "2026-07-04T16:00:00.000Z"
 *   }
 *
 * @param reportId - The report identifier returned by `submitReport`.
 * @param _apiClient - Authenticated API client; will be used in the real implementation.
 */
export async function queryReportStatus(
  reportId: string,
  _apiClient?: ApiClient,
): Promise<ReportStatusResult> {
  // Placeholder implementation. In a real app this would use the apiClient to
  // fetch the backend.
  // eslint-disable-next-line no-console
  console.log('[queryReportStatus] reportId:', reportId);

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        report_id: reportId,
        status: 'pending',
      });
    }, 300);
  });
}
