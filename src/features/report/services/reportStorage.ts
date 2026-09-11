import { defaultAsyncStorage, type KeyValueStorage } from '@/lib/storage/asyncStorage';

import type { LocalReportRecord } from '../types';

const REPORTS_STORAGE_KEY = '@fun-talk/reports';

/**
 * Manage locally persisted report records.
 *
 * The storage keeps a JSON array of `LocalReportRecord`. Records are added when
 * a report is submitted, updated while polling, and removed once the backend
 * reports a terminal status (`resolved` or `rejected`).
 */
export class ReportStorage {
  constructor(private readonly storage: KeyValueStorage = defaultAsyncStorage) {}

  async getAll(): Promise<LocalReportRecord[]> {
    const raw = await this.storage.getItem(REPORTS_STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed as LocalReportRecord[];
      }
    } catch {
      // Corrupted storage; reset it.
    }
    await this.storage.setItem(REPORTS_STORAGE_KEY, JSON.stringify([]));
    return [];
  }

  async save(record: LocalReportRecord): Promise<void> {
    const reports = await this.getAll();
    const existingIndex = reports.findIndex((r) => r.report_id === record.report_id);
    if (existingIndex >= 0) {
      reports[existingIndex] = record;
    } else {
      reports.unshift(record);
    }
    await this.storage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
  }

  async update(
    reportId: string,
    updates: Partial<Omit<LocalReportRecord, 'report_id'>>,
  ): Promise<void> {
    const reports = await this.getAll();
    const index = reports.findIndex((r) => r.report_id === reportId);
    if (index === -1) return;
    reports[index] = { ...reports[index], ...updates };
    await this.storage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
  }

  async remove(reportId: string): Promise<void> {
    const reports = await this.getAll();
    const filtered = reports.filter((r) => r.report_id !== reportId);
    await this.storage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(filtered));
  }

  async clear(): Promise<void> {
    await this.storage.removeItem(REPORTS_STORAGE_KEY);
  }
}

export const reportStorage = new ReportStorage();
