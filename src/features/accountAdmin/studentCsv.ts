export type StudentCsvRow = {
  school_name: string;
  class_name: string;
  class_suffix: string;
  initial_password: string;
};

export function parseStudentCsv(text: string): StudentCsvRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) return [];

  return lines.slice(1).map((line) => {
    const [school_name = '', class_name = '', class_suffix = '', initial_password = ''] = line.split(',');
    return {
      school_name: school_name.trim(),
      class_name: class_name.trim(),
      class_suffix: class_suffix.trim().replace(/\D/g, '').padStart(2, '0').slice(-2),
      initial_password: initial_password.trim(),
    };
  });
}
