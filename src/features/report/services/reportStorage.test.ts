import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { createMemoryStorage } from '@/lib/storage/asyncStorage';

import { ReportStorage } from './reportStorage';
import type { LocalReportRecord } from '../types';

describe('reportStorage', () => {
  let storage: ReportStorage;

  beforeEach(() => {
    storage = new ReportStorage(createMemoryStorage());
  });

  it('returns an empty array when no reports are stored', async () => {
    const reports = await storage.getAll();
    assert.deepEqual(reports, []);
  });

  it('saves a new report and retrieves it', async () => {
    const report: LocalReportRecord = {
      report_id: 'report_1',
      report_type: 'inappropriate_content',
      content: 'Bad content',
      contact: '13800138000',
      submitted_at: '2026-07-04T10:00:00.000Z',
      status: 'pending',
    };

    await storage.save(report);
    const reports = await storage.getAll();

    assert.equal(reports.length, 1);
    assert.deepEqual(reports[0], report);
  });

  it('updates an existing report instead of duplicating it', async () => {
    const report: LocalReportRecord = {
      report_id: 'report_1',
      report_type: 'misconduct',
      content: 'Misconduct',
      contact: 'test@example.com',
      submitted_at: '2026-07-04T10:00:00.000Z',
      status: 'pending',
    };

    await storage.save(report);
    await storage.update('report_1', { status: 'processing' });

    const reports = await storage.getAll();
    assert.equal(reports.length, 1);
    assert.equal(reports[0].status, 'processing');
    assert.equal(reports[0].content, 'Misconduct');
  });

  it('removes a report by id', async () => {
    const report1: LocalReportRecord = {
      report_id: 'report_1',
      report_type: 'inappropriate_content',
      content: 'Bad content',
      contact: '13800138000',
      submitted_at: '2026-07-04T10:00:00.000Z',
      status: 'pending',
    };
    const report2: LocalReportRecord = {
      report_id: 'report_2',
      report_type: 'other',
      content: 'Other issue',
      contact: '13800138001',
      submitted_at: '2026-07-04T11:00:00.000Z',
      status: 'pending',
    };

    await storage.save(report1);
    await storage.save(report2);
    await storage.remove('report_1');

    const reports = await storage.getAll();
    assert.equal(reports.length, 1);
    assert.equal(reports[0].report_id, 'report_2');
  });

  it('clears all reports', async () => {
    const report: LocalReportRecord = {
      report_id: 'report_1',
      report_type: 'inappropriate_content',
      content: 'Bad content',
      contact: '13800138000',
      submitted_at: '2026-07-04T10:00:00.000Z',
      status: 'pending',
    };

    await storage.save(report);
    await storage.clear();

    const reports = await storage.getAll();
    assert.deepEqual(reports, []);
  });
});
