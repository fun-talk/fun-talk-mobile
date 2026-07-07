export type FtAuthRecord = {
  userId?: string;
  token?: string;
  hasUsername?: boolean;
  username?: string;
  name?: string;
  phone?: string;
  logo?: string;
  authType?: string;
  /** New account system type: 'school_student' | 'home_account' */
  accountType?: string;
  teacherId?: number;
  teacherRole?: 'admin' | 'teacher';
  isAdmin?: boolean;
  teacherProfileRequired?: boolean;
  schoolName?: string;
  persistent?: boolean;
  expiresAt?: number;
};

export type FtAuthProfile = Omit<FtAuthRecord, 'token'>;

export function isAuthExpired(auth: FtAuthRecord | null): boolean {
  if (!auth?.expiresAt) {
    return false;
  }
  return Date.now() > auth.expiresAt;
}

export function parseFtAuthProfile(raw: string | null): FtAuthProfile | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as FtAuthProfile;
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
