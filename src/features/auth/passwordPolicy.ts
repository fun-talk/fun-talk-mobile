export const PASSWORD_REQUIREMENT_MESSAGE = '密码至少 8 位，且必须包含字母和数字';

const PASSWORD_LETTER_RE = /[A-Za-z]/;
const PASSWORD_DIGIT_RE = /\d/;

export function validatePasswordStrength(password: string): string | null {
  const normalized = password.trim();
  if (
    normalized.length < 8
    || !PASSWORD_LETTER_RE.test(normalized)
    || !PASSWORD_DIGIT_RE.test(normalized)
  ) {
    return PASSWORD_REQUIREMENT_MESSAGE;
  }
  return null;
}

export function validatePasswordPair(password: string, confirmPassword: string): string | null {
  const strengthError = validatePasswordStrength(password);
  if (strengthError) return strengthError;
  if (password.trim() !== confirmPassword.trim()) return '两次输入的密码不一致';
  return null;
}
