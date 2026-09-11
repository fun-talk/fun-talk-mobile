import { useCallback, useEffect, useState } from 'react';

import type { LocalReportRecord } from '../types';
import { reportStorage } from '../services/reportStorage';

export function useLocalReports(refreshKey?: number) {
  const [reports, setReports] = useState<LocalReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await reportStorage.getAll();
      setReports(all);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeReport = useCallback(async (reportId: string) => {
    await reportStorage.remove(reportId);
    setReports((prev) => prev.filter((r) => r.report_id !== reportId));
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return { reports, isLoading, refresh: load, removeReport };
}
