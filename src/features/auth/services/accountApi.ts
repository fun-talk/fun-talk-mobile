/**
 * Account v1 API layer — mirrors fun-talk-web/src/account/api.ts.
 *
 * All endpoints use the /account/v1/ prefix and align with the web PR#179
 * account module. The mobile apiClient already attaches Authorization and
 * deviceID, so we only need to pass the JSON body.
 */
import type { ApiClient } from '@/lib/api/client';

/* ================================================================
 *  Types — aligned with web api.ts
 * ================================================================ */

export type AccountType = 'teacher' | 'student' | 'home';

export type TeacherSession = {
  id: number;
  phone: string;
  email: string;
  display_name: string;
  role: 'admin' | 'teacher';
  school_id: number;
  school_name?: string | null;
  is_admin: boolean;
};

export type StudentSession = {
  id: number;
  digital_id: string;
  nickname: string | null;
  class_suffix: string;
};

export type HomeSession = {
  id: number;
  phone: string | null;
  wechat_openid: string | null;
  has_phone: boolean;
  has_wechat: boolean;
};

export type StudentProfile = {
  digital_id: string;
  nickname: string | null;
  nickname_label: string;
  phone: string | null;
  has_phone_bound: boolean;
  masked_phone: string | null;
  has_home_binding: boolean;
  school_data_authorized: boolean;
  home_data_authorized: boolean;
};

export type HomeBindingPreview = {
  digital_id: string;
  nickname_label: string;
  masked_digital_id: string;
  student_already_bound: boolean;
};

export type HomeProfileStudent = {
  binding_id?: number;
  digital_id: string;
  nickname_label: string;
  masked_digital_id: string;
  school_data_authorized: boolean;
  home_data_authorized: boolean;
  bound_at?: number;
};

export type HomeProfile = {
  phone: string | null;
  has_phone: boolean;
  masked_phone: string | null;
  has_binding: boolean;
  children: HomeProfileStudent[];
  /** @deprecated use children — kept for v1.0 client compatibility */
  student: HomeProfileStudent | null;
};

type ApiEnvelope<T> = T & { success: boolean };

export type AdminOverview = {
  admin_count: number;
  teacher_count: number;
  student_count: number;
};

export type AdminStudentRow = {
  id: number;
  digital_id: string;
  nickname: string | null;
  nickname_label: string;
  class_name: string;
  class_suffix: string;
  school_data_authorized: boolean;
  home_data_authorized: boolean;
  has_home_binding: boolean;
  status: string;
  pending_password_reset?: boolean;
  password?: string;
};

export type PasswordResetRequestRow = {
  id: number;
  student_id: number;
  digital_id: string;
  nickname_label: string;
  class_name: string;
  class_suffix: string;
  created_at: number;
  notified_teacher_count: number;
};

export type AdminTeacherRow = {
  id: number;
  display_name: string;
  role: 'admin' | 'teacher';
  role_label: string;
  phone: string;
  email: string;
  scope_type: string;
  scope_value: string;
  scope_label: string;
  view_permissions: string;
  edit_permissions: string;
  status: string;
};

export type CreatedStudentResult = StudentSession & {
  initial_password: string;
  remark: string;
  class_name?: string;
  school_name?: string;
};

export type AccountPrintCard = {
  title: string;
  digital_id: string;
  password: string;
  hint: string;
  login_url: string;
};

export type SchoolManagementClass = {
  id: number;
  name: string;
  student_count: number;
  teacher_names: string[];
  created_at: number;
};

export type SchoolManagementPendingClass = {
  source_class_id: number;
  source_class_name: string;
  target_class_id: number;
  target_class_name: string;
  student_count: number;
  created_at: number;
};

export type ClassMergePreview = {
  source_class_name: string;
  target_class_name: string;
  affected_student_count: number;
  affected_teacher_count: number;
  has_suffix_conflict: boolean;
  conflict_suffixes: string[];
};

export type SchoolManagementPendingSchool = {
  school_id: number;
  school_name: string;
  teacher_count: number;
  student_count: number;
  created_at: number;
};

export type SchoolMergeRecordRow = {
  id: number;
  merge_type: string;
  source_label: string;
  target_label: string;
  affected_teacher_count: number;
  affected_student_count: number;
  created_at: number;
};

export type MergeRequestRow = {
  id: number;
  requesting_admin_name?: string;
  requesting_admin_phone?: string;
  requesting_school_id?: number;
  requesting_school_name?: string;
  target_school_id?: number;
  target_school_name?: string;
  target_admin_phone?: string;
  status: string;
  created_at: number;
};

export type NotificationRow = {
  id: number;
  type: string;
  title: string;
  message: string;
  ref_id: number;
  is_read: boolean;
  created_at: number;
};

export type SchoolManagement = {
  school: {
    id: number;
    name: string;
    created_at: number;
    admin_count: number;
    teacher_count: number;
    student_count: number;
  };
  classes: SchoolManagementClass[];
  pending_schools: SchoolManagementPendingSchool[];
  pending_classes: SchoolManagementPendingClass[];
  merge_records: SchoolMergeRecordRow[];
  pending_merge_requests_count: number;
};

export type AccountExportFile = {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
};

/* ================================================================
 *  Helpers
 * ================================================================ */

async function readError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data.detail === 'string') return data.detail;
  } catch {
    // ignore parse errors
  }
  return '请求失败';
}

function parseDownloadFilename(contentDisposition: string | null): string {
  if (!contentDisposition) return 'student_accounts.xlsx';
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const quotedMatch = /filename="([^"]+)"/i.exec(contentDisposition);
  if (quotedMatch?.[1]) return quotedMatch[1];
  const bareMatch = /filename=([^;]+)/i.exec(contentDisposition);
  return bareMatch?.[1]?.trim() || 'student_accounts.xlsx';
}

async function downloadAccountExport(
  apiClient: ApiClient,
  path: string,
  init?: RequestInit,
): Promise<AccountExportFile> {
  const response = await apiClient.request(path, init);
  if (!response.ok) throw new Error(await readError(response));
  return {
    filename: parseDownloadFilename(response.headers.get('Content-Disposition')),
    mimeType: response.headers.get('Content-Type') || 'application/octet-stream',
    bytes: new Uint8Array(await response.arrayBuffer()),
  };
}

/* ================================================================
 *  SMS
 * ================================================================ */

export async function sendAccountSmsCode(
  apiClient: ApiClient,
  phone: string,
): Promise<{ phone: string; expires_in: number; debug_code?: string }> {
  const response = await apiClient.post('/account/v1/sms/send', { phone });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

/* ================================================================
 *  Teacher auth
 * ================================================================ */

export type TeacherAuthResult = {
  token: string;
  expires_in: number;
  account_type: 'teacher';
  teacher: TeacherSession;
  entry_label: string;
  is_first_admin?: boolean;
};

export async function registerTeacher(
  apiClient: ApiClient,
  payload: {
    phone: string;
    sms_code: string;
    password: string;
    confirm_password: string;
    email: string;
    school_name: string;
  },
): Promise<TeacherAuthResult> {
  const response = await apiClient.post('/account/v1/teacher/register', payload);
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<TeacherAuthResult>;
}

export async function loginTeacher(
  apiClient: ApiClient,
  payload: {
    phone: string;
    login_method: 'sms' | 'password';
    password?: string;
    sms_code?: string;
  },
): Promise<TeacherAuthResult> {
  const response = await apiClient.post('/account/v1/teacher/login', payload);
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<TeacherAuthResult>;
}

/* ================================================================
 *  Session
 * ================================================================ */

export type AccountSession = {
  account_type: AccountType;
  teacher?: TeacherSession;
  student?: StudentSession;
  home?: HomeSession;
  entry_label?: string;
};

export async function fetchAccountSession(
  apiClient: ApiClient,
): Promise<AccountSession> {
  const response = await apiClient.get('/account/v1/session');
  if (!response.ok) throw new Error(await readError(response));
  const data = await response.json();
  return data as AccountSession;
}

/* ================================================================
 *  Teacher / admin console
 * ================================================================ */

export async function fetchAdminOverview(
  apiClient: ApiClient,
): Promise<{ school_name: string; overview: AdminOverview }> {
  const response = await apiClient.get('/account/v1/admin/overview');
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ school_name: string; overview: AdminOverview }>;
}

export async function fetchAdminStudents(
  apiClient: ApiClient,
): Promise<{ students: AdminStudentRow[] }> {
  const response = await apiClient.get('/account/v1/admin/students');
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ students: AdminStudentRow[] }>;
}

export async function fetchAdminTeachers(
  apiClient: ApiClient,
): Promise<{ teachers: AdminTeacherRow[] }> {
  const response = await apiClient.get('/account/v1/admin/teachers');
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ teachers: AdminTeacherRow[] }>;
}

export async function createTeacherAccount(
  apiClient: ApiClient,
  payload: {
    phone: string;
    password: string;
    confirm_password: string;
    email: string;
    display_name?: string;
    scope_type?: string;
    scope_value?: string;
  },
): Promise<{ teacher: TeacherSession }> {
  const response = await apiClient.post('/account/v1/admin/teachers', payload);
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ teacher: TeacherSession }>;
}

export async function updateTeacherAccount(
  apiClient: ApiClient,
  teacherId: number,
  payload: Partial<{
    phone: string;
    email: string;
    display_name: string;
    scope_type: string;
    scope_value: string;
    view_permissions: string;
    edit_permissions: string;
  }>,
): Promise<{ teacher: AdminTeacherRow }> {
  const response = await apiClient.request(`/account/v1/admin/teachers/${teacherId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ teacher: AdminTeacherRow }>;
}

export async function mergeAdminTeachers(
  apiClient: ApiClient,
  sourceTeacherId: number,
  targetTeacherId: number,
): Promise<{ record: { id: number; target_label: string } }> {
  const response = await apiClient.post('/account/v1/admin/teachers/merge', {
    source_teacher_id: sourceTeacherId,
    target_teacher_id: targetTeacherId,
    confirm: true,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ record: { id: number; target_label: string } }>;
}

export async function fetchTeacherStudents(
  apiClient: ApiClient,
): Promise<{ students: AdminStudentRow[] }> {
  const response = await apiClient.get('/account/v1/teacher/students');
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ students: AdminStudentRow[] }>;
}

export async function fetchPasswordResetRequests(
  apiClient: ApiClient,
): Promise<{ requests: PasswordResetRequestRow[] }> {
  const response = await apiClient.get('/account/v1/teacher/password-reset-requests');
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ requests: PasswordResetRequestRow[] }>;
}

export async function resetStudentPassword(
  apiClient: ApiClient,
  studentId: number,
  newPassword = '',
): Promise<{ student: StudentSession; temporary_password: string }> {
  const response = await apiClient.post(`/account/v1/students/${studentId}/reset-password`, {
    new_password: newPassword,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ student: StudentSession; temporary_password: string }>;
}

export async function createStudentAccount(
  apiClient: ApiClient,
  payload: {
    school_name?: string;
    class_name: string;
    class_suffix: string;
    initial_password: string;
  },
): Promise<{ student: CreatedStudentResult }> {
  const response = await apiClient.post('/account/v1/students', payload);
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ student: CreatedStudentResult }>;
}

export async function batchCreateStudents(
  apiClient: ApiClient,
  rows: Array<{
    school_name?: string;
    class_name: string;
    class_suffix: string;
    initial_password: string;
  }>,
): Promise<{
  created: CreatedStudentResult[];
  errors: Array<{ row: number; detail: string }>;
  created_count: number;
}> {
  const response = await apiClient.post('/account/v1/students/batch', { rows });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{
    created: CreatedStudentResult[];
    errors: Array<{ row: number; detail: string }>;
    created_count: number;
  }>;
}

export async function exportAdminStudents(
  apiClient: ApiClient,
  className?: string,
): Promise<AccountExportFile> {
  const query = className && className !== 'all' ? `?class_name=${encodeURIComponent(className)}` : '';
  return downloadAccountExport(apiClient, `/account/v1/admin/students/export${query}`);
}

export async function exportTeacherStudents(
  apiClient: ApiClient,
  className?: string,
): Promise<AccountExportFile> {
  const query = className && className !== 'all' ? `?class_name=${encodeURIComponent(className)}` : '';
  return downloadAccountExport(apiClient, `/account/v1/teacher/students/export${query}`);
}

export async function exportStudentsByIds(
  apiClient: ApiClient,
  studentIds: number[],
): Promise<AccountExportFile> {
  return downloadAccountExport(apiClient, '/account/v1/students/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_ids: studentIds, class_name: '' }),
  });
}

export async function fetchAdminPrintCards(
  apiClient: ApiClient,
  loginUrl: string,
  className?: string,
): Promise<{ cards: AccountPrintCard[] }> {
  const params = new URLSearchParams({ login_url: loginUrl });
  if (className && className !== 'all') params.set('class_name', className);
  const response = await apiClient.get(`/account/v1/admin/students/print?${params.toString()}`);
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ cards: AccountPrintCard[] }>;
}

export async function fetchTeacherPrintCards(
  apiClient: ApiClient,
  loginUrl: string,
  className?: string,
): Promise<{ cards: AccountPrintCard[] }> {
  const params = new URLSearchParams({ login_url: loginUrl });
  if (className && className !== 'all') params.set('class_name', className);
  const response = await apiClient.get(`/account/v1/teacher/students/print?${params.toString()}`);
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ cards: AccountPrintCard[] }>;
}

export async function fetchPrintCardsByStudentIds(
  apiClient: ApiClient,
  studentIds: number[],
  loginUrl: string,
): Promise<{ cards: AccountPrintCard[] }> {
  const response = await apiClient.post('/account/v1/students/print', {
    student_ids: studentIds,
    class_name: '',
    login_url: loginUrl,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ cards: AccountPrintCard[] }>;
}

export async function fetchSchoolManagement(
  apiClient: ApiClient,
): Promise<{ management: SchoolManagement }> {
  const response = await apiClient.get('/account/v1/admin/schools/management');
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ management: SchoolManagement }>;
}

export async function previewAdminClassMerge(
  apiClient: ApiClient,
  sourceClassId: number,
  targetClassId: number,
): Promise<{ preview: ClassMergePreview }> {
  const response = await apiClient.post('/account/v1/admin/schools/merge-classes/preview', {
    source_class_id: sourceClassId,
    target_class_id: targetClassId,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ preview: ClassMergePreview }>;
}

export async function mergeAdminClasses(
  apiClient: ApiClient,
  sourceClassId: number,
  targetClassId: number,
): Promise<{ record: { id: number; target_label: string } }> {
  const response = await apiClient.post('/account/v1/admin/schools/merge-classes', {
    source_class_id: sourceClassId,
    target_class_id: targetClassId,
    confirm: true,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ record: { id: number; target_label: string } }>;
}

/* -- Merge requests (PRD v1.2) --------------------------------------- */

export async function createMergeRequest(
  apiClient: ApiClient,
  targetAdminPhone: string,
): Promise<{ request: { id: number; status: string; created_at: number } }> {
  const response = await apiClient.post('/account/v1/admin/schools/merge-requests', {
    target_admin_phone: targetAdminPhone,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ request: { id: number; status: string; created_at: number } }>;
}

export async function fetchIncomingMergeRequests(
  apiClient: ApiClient,
): Promise<{ requests: MergeRequestRow[] }> {
  const response = await apiClient.get('/account/v1/admin/schools/merge-requests/incoming');
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ requests: MergeRequestRow[] }>;
}

export async function fetchOutgoingMergeRequests(
  apiClient: ApiClient,
): Promise<{ requests: MergeRequestRow[] }> {
  const response = await apiClient.get('/account/v1/admin/schools/merge-requests/outgoing');
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ requests: MergeRequestRow[] }>;
}

export async function approveMergeRequest(
  apiClient: ApiClient,
  requestId: number,
): Promise<{ record: { record_id: number; target_label: string } }> {
  const response = await apiClient.post('/account/v1/admin/schools/merge-requests/approve', {
    request_id: requestId,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ record: { record_id: number; target_label: string } }>;
}

export async function rejectMergeRequest(
  apiClient: ApiClient,
  requestId: number,
): Promise<{ request: { id: number; status: string } }> {
  const response = await apiClient.post('/account/v1/admin/schools/merge-requests/reject', {
    request_id: requestId,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ request: { id: number; status: string } }>;
}

export async function cancelMergeRequest(
  apiClient: ApiClient,
  requestId: number,
): Promise<{ request: { id: number; status: string } }> {
  const response = await apiClient.post('/account/v1/admin/schools/merge-requests/cancel', {
    request_id: requestId,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ request: { id: number; status: string } }>;
}

/* -- Notifications (PRD v1.2) ---------------------------------------- */

export async function fetchNotifications(
  apiClient: ApiClient,
  unreadOnly = false,
): Promise<{ notifications: NotificationRow[]; unread_count: number }> {
  const params = unreadOnly ? '?unread_only=true' : '';
  const response = await apiClient.get(`/account/v1/admin/notifications${params}`);
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ notifications: NotificationRow[]; unread_count: number }>;
}

export async function markNotificationRead(
  apiClient: ApiClient,
  notificationId: number,
): Promise<void> {
  const response = await apiClient.post('/account/v1/admin/notifications/read', {
    notification_id: notificationId,
  });
  if (!response.ok) throw new Error(await readError(response));
}

/* ================================================================
 *  Student login
 * ================================================================ */

export type StudentLoginResult = {
  token: string;
  expires_in: number;
  account_type: 'student';
  student: StudentSession;
};

export async function loginStudent(
  apiClient: ApiClient,
  payload: { digital_id: string; password: string },
): Promise<StudentLoginResult> {
  const response = await apiClient.post('/account/v1/student/login', payload);
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<StudentLoginResult>;
}

export async function requestStudentPasswordReset(
  apiClient: ApiClient,
  digital_id: string,
): Promise<{ digital_id: string; notified_teacher_count: number; message: string }> {
  const response = await apiClient.post('/account/v1/student/forgot-password', {
    digital_id,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

/* ================================================================
 *  Home / Family login
 * ================================================================ */

export type HomePhoneLoginMethod = 'sms' | 'password';

export type HomeLoginResult = {
  token: string;
  expires_in: number;
  account_type: 'home';
  home: HomeSession;
  created?: boolean;
};

export async function loginHomePhone(
  apiClient: ApiClient,
  payload: {
    phone: string;
    login_method: HomePhoneLoginMethod;
    sms_code?: string;
    password?: string;
  },
): Promise<HomeLoginResult> {
  const response = await apiClient.post('/account/v1/home/phone/login', payload);
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<HomeLoginResult>;
}

export async function loginHomeWechat(
  apiClient: ApiClient,
  payload: { wechat_openid: string },
): Promise<HomeLoginResult> {
  const response = await apiClient.post('/account/v1/home/wechat/login', payload);
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<HomeLoginResult>;
}

/* ================================================================
 *  Student profile
 * ================================================================ */

export async function fetchStudentProfile(
  apiClient: ApiClient,
): Promise<{ profile: StudentProfile }> {
  const response = await apiClient.get('/account/v1/student/profile');
  if (!response.ok) throw new Error(await readError(response));
  const data = await response.json();
  return data as { profile: StudentProfile };
}

export async function updateStudentNickname(
  apiClient: ApiClient,
  nickname: string,
): Promise<{ profile: StudentProfile }> {
  const response = await apiClient.request('/account/v1/student/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ profile: StudentProfile }>;
}

export async function changeStudentPassword(
  apiClient: ApiClient,
  newPassword: string,
  confirmPassword: string,
): Promise<ApiEnvelope<{ success: boolean }>> {
  const response = await apiClient.post('/account/v1/student/password', {
    new_password: newPassword,
    confirm_password: confirmPassword,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function bindStudentPhone(
  apiClient: ApiClient,
  phone: string,
  smsCode: string,
): Promise<{ profile: StudentProfile }> {
  const response = await apiClient.post('/account/v1/student/phone/bind', {
    phone,
    sms_code: smsCode,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ profile: StudentProfile }>;
}

/* ================================================================
 *  Home profile
 * ================================================================ */

export async function fetchHomeProfile(
  apiClient: ApiClient,
): Promise<{ profile: HomeProfile }> {
  const response = await apiClient.get('/account/v1/home/profile');
  if (!response.ok) throw new Error(await readError(response));
  const data = await response.json();
  return data as { profile: HomeProfile };
}

export async function changeHomePassword(
  apiClient: ApiClient,
  newPassword: string,
  confirmPassword: string,
): Promise<ApiEnvelope<{ success: boolean }>> {
  const response = await apiClient.post('/account/v1/home/password', {
    new_password: newPassword,
    confirm_password: confirmPassword,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function bindHomePhone(
  apiClient: ApiClient,
  phone: string,
  smsCode: string,
): Promise<{ profile: HomeProfile }> {
  const response = await apiClient.post('/account/v1/home/phone/bind', {
    phone,
    sms_code: smsCode,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ profile: HomeProfile }>;
}

/* ================================================================
 *  Home ↔ Student binding
 * ================================================================ */

export async function previewHomeBinding(
  apiClient: ApiClient,
  digitalId: string,
): Promise<{ preview: HomeBindingPreview }> {
  const response = await apiClient.post('/account/v1/home/bindings/preview', {
    digital_id: digitalId,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ preview: HomeBindingPreview }>;
}

export async function bindHomeStudent(
  apiClient: ApiClient,
  digitalId: string,
  phone: string,
  smsCode: string,
): Promise<{ binding: HomeProfileStudent }> {
  const response = await apiClient.post('/account/v1/home/bindings', {
    digital_id: digitalId,
    phone,
    sms_code: smsCode,
    confirm: true,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<{ binding: HomeProfileStudent }>;
}

export async function unbindHomeStudent(
  apiClient: ApiClient,
  digitalId: string,
): Promise<void> {
  const response = await apiClient.post('/account/v1/home/bindings/remove', {
    digital_id: digitalId,
  });
  if (!response.ok) throw new Error(await readError(response));
}
