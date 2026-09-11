export type ReportType =
  | 'inappropriate_content'
  | 'misconduct'
  | 'privacy_breach'
  | '诱导消费'
  | 'other';

export const REPORT_TYPE_OPTIONS: { value: ReportType; label: string }[] = [
  { value: 'inappropriate_content', label: '不良内容' },
  { value: 'misconduct', label: '不当行为' },
  { value: 'privacy_breach', label: '隐私泄露' },
  { value: '诱导消费', label: '诱导消费' },
  { value: 'other', label: '其他' },
];

/**
 * In-app representation of a selected screenshot. The local `uri` is used for
 * preview thumbnails; the `base64` string is what is transmitted to the server.
 */
export type ReportImage = {
  /** Local file URI used for preview thumbnails. */
  uri: string;
  /** Raw Base64-encoded image bytes (without a `data:` prefix). */
  base64: string;
  name?: string;
  type?: string;
  width?: number;
  height?: number;
};

export type ReportFormData = {
  reportType: ReportType | null;
  content: string;
  contact: string;
  target: string;
  screenshots: ReportImage[];
};

/**
 * Screenshot entry embedded in the JSON payload submitted to the backend.
 * The image data is transmitted as Base64 to avoid a separate upload step.
 */
export type ReportScreenshotPayload = {
  base64: string;
  mime_type?: string;
  file_name?: string;
  width?: number;
  height?: number;
};

export type ReportSubmitPayload = {
  report_type: ReportType;
  content: string;
  contact: string;
  target?: string;
  screenshots?: ReportScreenshotPayload[];
  /** ISO timestamp of submission */
  submitted_at: string;
  /** Client-side metadata */
  client_info: {
    platform: 'ios' | 'android' | 'web';
    app_version?: string;
  };
};

export type ReportSubmitResult = {
  success: boolean;
  report_id?: string;
  message: string;
};

/**
 * Lifecycle status of a report as returned by the backend.
 *
 * - `pending`    - 已提交，等待受理
 * - `processing` - 正在处理中
 * - `resolved`   - 已处理完成
 * - `rejected`   - 被驳回或无需处理
 */
export type ReportStatus = 'pending' | 'processing' | 'resolved' | 'rejected';

export type ReportStatusResult = {
  report_id: string;
  status: ReportStatus;
  message?: string;
  /** ISO timestamp when the report was marked as resolved/rejected. */
  resolved_at?: string;
};

/**
 * A report record persisted locally so the app can poll for its outcome.
 * Once the backend marks the report as `resolved` or `rejected`, the record
 * is removed from local storage.
 */
export type LocalReportRecord = {
  report_id: string;
  report_type: ReportType;
  content: string;
  contact: string;
  target?: string;
  submitted_at: string;
  status: ReportStatus;
  result_message?: string;
  resolved_at?: string;
};
