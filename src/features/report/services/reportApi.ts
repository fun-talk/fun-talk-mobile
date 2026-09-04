import type { ApiClient } from '@/lib/api/client';

import type {
  ReportStatusResult,
  ReportSubmitPayload,
  ReportSubmitResult,
} from '../types';

type BackendReportSubmitResponse = {
  success: boolean;
  report_id?: string;
  message?: string;
};

type BackendReportResultResponse = {
  status: 'processing' | 'ok';
  result: string;
};

type BackendReportErrorResponse = {
  detail?: string;
};

function getBackendErrorMessage(response: Response, body: BackendReportErrorResponse): string {
  if (body.detail) return body.detail;
  return `请求失败（${response.status}）`;
}

/**
 * Submit a user report to the backend.
 *
 * Endpoint: POST /api/v1/reports
 * The payload includes Base64-encoded screenshots and client metadata.
 */
export async function submitReport(
  apiClient: ApiClient,
  payload: ReportSubmitPayload,
): Promise<ReportSubmitResult> {
  const response = await apiClient.post('/api/v1/reports', payload);

  const body = (await response.json()) as BackendReportSubmitResponse | BackendReportErrorResponse;

  if (!response.ok) {
    throw new Error(getBackendErrorMessage(response, body as BackendReportErrorResponse));
  }

  const success = (body as BackendReportSubmitResponse).success ?? true;
  const message =
    (body as BackendReportSubmitResponse).message ?? '举报已提交，我们将在3个工作日内处理。';

  return {
    success,
    report_id: (body as BackendReportSubmitResponse).report_id,
    message,
  };
}

/**
 * Query the processing result of a previously submitted report.
 *
 * Endpoint: GET /api/v1/reports/{report_id}/result
 *
 * The backend returns `status: "processing" | "ok"` and a `result` string.
 * We map the backend status to the frontend lifecycle status:
 *   - "processing" -> "processing"
 *   - "ok"         -> "resolved"
 */
export async function queryReportStatus(
  apiClient: ApiClient,
  reportId: string,
): Promise<ReportStatusResult> {
  const response = await apiClient.get(`/api/v1/reports/${reportId}/result`);

  const body = (await response.json()) as BackendReportResultResponse | BackendReportErrorResponse;

  if (!response.ok) {
    throw new Error(getBackendErrorMessage(response, body as BackendReportErrorResponse));
  }

  const result = body as BackendReportResultResponse;
  const status = result.status === 'ok' ? 'resolved' : 'processing';

  return {
    report_id: reportId,
    status,
    message: result.result || undefined,
  };
}

