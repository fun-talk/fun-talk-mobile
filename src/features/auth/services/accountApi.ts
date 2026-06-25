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
 *  Session
 * ================================================================ */

export type AccountSession = {
  account_type: AccountType;
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
