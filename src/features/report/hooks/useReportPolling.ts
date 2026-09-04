import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import type { ApiClient } from '@/lib/api/client';
import { showSuccessToast } from '@/lib/toast';

import type { ReportStatus } from '../types';
import { queryReportStatus } from '../services/reportApi';
import { reportStorage } from '../services/reportStorage';

const TERMINAL_STATUSES: ReportStatus[] = ['resolved', 'rejected'];

/**
 * Poll the backend for status updates on locally stored reports.
 *
 * When a report reaches a terminal status (`resolved` or `rejected`), the
 * record is kept in local storage and its status/result fields are updated so
 * the user can review handled reports in the dedicated results screen.
 *
 * @param apiClient - Authenticated API client used to query statuses.
 * @param intervalMs - Polling interval in milliseconds. Defaults to 60s.
 * @param enabled - Whether polling should be active. Defaults to true.
 */
export function useReportPolling(
  apiClient: ApiClient,
  intervalMs = 60_000,
  enabled = true,
) {
  const isRunningRef = useRef(false);

  const pollOnce = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    try {
      const reports = await reportStorage.getAll();
      const activeReports = reports.filter(
        (r) => !TERMINAL_STATUSES.includes(r.status),
      );
      if (activeReports.length === 0) return;

      await Promise.all(
        activeReports.map(async (report) => {
          try {
            const statusResult = await queryReportStatus(apiClient, report.report_id);
            if (TERMINAL_STATUSES.includes(statusResult.status)) {
              await reportStorage.update(report.report_id, {
                status: statusResult.status,
                result_message: statusResult.message,
                resolved_at: statusResult.resolved_at ?? new Date().toISOString(),
              });
              showSuccessToast(
                statusResult.message || '您的举报已有处理结果，请留意反馈',
              );
            } else {
              await reportStorage.update(report.report_id, {
                status: statusResult.status,
                result_message: statusResult.message,
              });
            }
          } catch (err) {
            // Swallow per-report errors so one failed query does not block others.
            // eslint-disable-next-line no-console
            console.warn(
              `[useReportPolling] failed to query ${report.report_id}:`,
              err,
            );
          }
        }),
      );
    } finally {
      isRunningRef.current = false;
    }
  }, [apiClient]);

  useEffect(() => {
    if (!enabled) return;

    void pollOnce();
    const intervalId = setInterval(pollOnce, intervalMs);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void pollOnce();
      }
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [enabled, intervalMs, pollOnce]);
}
