import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import Constants from 'expo-constants';

import type { ApiClient } from '@/lib/api/client';

import { reportStorage } from '../services/reportStorage';
import { submitReport } from '../services/reportApi';
import type {
  ReportFormData,
  ReportImage,
  ReportScreenshotPayload,
  ReportType,
} from '../types';

const MAX_SCREENSHOTS = 3;

const isValidPhone = (value: string) => /^1[3-9]\d{9}$/.test(value.trim());
const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export function useReportForm(apiClient: ApiClient) {
  const [form, setForm] = useState<ReportFormData>({
    reportType: null,
    content: '',
    contact: '',
    target: '',
    screenshots: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setReportType = useCallback((reportType: ReportType) => {
    setForm((prev) => ({ ...prev, reportType }));
  }, []);

  const setContent = useCallback((content: string) => {
    setForm((prev) => ({ ...prev, content }));
  }, []);

  const setContact = useCallback((contact: string) => {
    setForm((prev) => ({ ...prev, contact }));
  }, []);

  const setTarget = useCallback((target: string) => {
    setForm((prev) => ({ ...prev, target }));
  }, []);

  const addScreenshot = useCallback((image: ReportImage) => {
    setForm((prev) => {
      if (prev.screenshots.length >= MAX_SCREENSHOTS) return prev;
      return { ...prev, screenshots: [...prev.screenshots, image] };
    });
  }, []);

  const removeScreenshot = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, i) => i !== index),
    }));
  }, []);

  const validate = useCallback((): string | null => {
    if (!form.reportType) {
      return '请选择举报类型';
    }
    if (!form.content.trim()) {
      return '请填写举报内容';
    }
    if (form.content.trim().length < 10) {
      return '举报内容至少需要10个字';
    }
    const contact = form.contact.trim();
    if (!contact) {
      return '请填写联系方式，便于反馈处理结果';
    }
    if (!isValidPhone(contact) && !isValidEmail(contact)) {
      return '联系方式需为有效手机号或邮箱';
    }
    return null;
  }, [form]);

  const submit = useCallback(async () => {
    setResultMessage(null);
    setErrorMessage(null);

    const error = validate();
    if (error) {
      setErrorMessage(error);
      return { success: false, message: error };
    }

    setIsSubmitting(true);
    try {
      const payload = {
        report_type: form.reportType as ReportType,
        content: form.content.trim(),
        contact: form.contact.trim(),
        ...(form.target.trim() ? { target: form.target.trim() } : {}),
        ...(form.screenshots.length > 0
          ? {
              screenshots: form.screenshots.map(
                (img): ReportScreenshotPayload => ({
                  base64: img.base64,
                  mime_type: img.type,
                  file_name: img.name,
                  width: img.width,
                  height: img.height,
                }),
              ),
            }
          : {}),
        submitted_at: new Date().toISOString(),
        client_info: {
          platform: Platform.OS as 'ios' | 'android' | 'web',
          app_version: Constants.expoConfig?.version,
        },
      };

      const result = await submitReport(apiClient, payload);
      if (result.success && result.report_id) {
        // Persist the report locally so the app can poll for its outcome.
        await reportStorage.save({
          report_id: result.report_id,
          report_type: payload.report_type,
          content: payload.content,
          contact: payload.contact,
          target: payload.target,
          submitted_at: payload.submitted_at,
          status: 'pending',
        });
        setResultMessage(result.message);
        setForm({
          reportType: null,
          content: '',
          contact: '',
          target: '',
          screenshots: [],
        });
      } else if (result.success) {
        setResultMessage(result.message);
      } else {
        setErrorMessage(result.message || '提交失败，请稍后重试');
      }
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '提交失败，请稍后重试';
      setErrorMessage(message);
      return { success: false, message };
    } finally {
      setIsSubmitting(false);
    }
  }, [form, validate]);

  const resetMessages = useCallback(() => {
    setResultMessage(null);
    setErrorMessage(null);
  }, []);

  return {
    form,
    isSubmitting,
    resultMessage,
    errorMessage,
    canAddScreenshot: form.screenshots.length < MAX_SCREENSHOTS,
    setReportType,
    setContent,
    setContact,
    setTarget,
    addScreenshot,
    removeScreenshot,
    submit,
    resetMessages,
  };
}
