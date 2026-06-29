import { File } from 'expo-file-system';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { useAuth } from '@/features/auth';
import { LoginColors, LoginWeights } from '@/features/auth/components/LoginConstants';
import { validatePasswordStrength } from '@/features/auth/passwordPolicy';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

import { AccountConsoleShell, Panel, PrimaryButton, SecondaryButton } from './AccountConsoleShell';
import { getAccountLoginUrl, printOrShareAccountCards, shareExportFile } from './accountFiles';
import { parseStudentCsv } from './studentCsv';
import {
  batchCreateStudents,
  createStudentAccount,
  exportStudentsByIds,
  fetchPrintCardsByStudentIds,
  type CreatedStudentResult,
} from '@/features/auth/services/accountApi';

type StudentCreateScreenProps = {
  role: 'admin' | 'teacher';
};

type DocumentPickerModule = typeof import('expo-document-picker');

async function loadDocumentPickerModule(): Promise<DocumentPickerModule> {
  try {
    return await import('expo-document-picker');
  } catch (error) {
    throw new Error(
      '当前 Android 客户端未包含文件选择模块，请重新构建开发包后再使用 CSV 导入功能。',
      { cause: error },
    );
  }
}

export function StudentCreateScreen({ role }: StudentCreateScreenProps) {
  const router = useRouter();
  const { apiClient, auth } = useAuth();
  const [className, setClassName] = useState('');
  const [classSuffix, setClassSuffix] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [result, setResult] = useState<CreatedStudentResult | null>(null);

  const active = role === 'admin' ? 'admin-students' : 'teacher-students';
  const listRoute =
    role === 'admin' ? '/(app)/account/admin/students' : '/(app)/account/teacher/students';

  const handleCreate = async () => {
    const suffix = classSuffix.replace(/\D/g, '').padStart(2, '0').slice(-2);
    if (!className.trim() || !suffix || !initialPassword.trim()) {
      showErrorToast('请填写班级名、班级学号后 2 位和初始密码');
      return;
    }
    const passwordError = validatePasswordStrength(initialPassword);
    if (passwordError) {
      showErrorToast(passwordError);
      return;
    }

    setCreating(true);
    try {
      const response = await createStudentAccount(apiClient, {
        school_name: auth?.schoolName || '',
        class_name: className.trim(),
        class_suffix: suffix,
        initial_password: initialPassword,
      });
      setResult({
        ...response.student,
        school_name: auth?.schoolName || '',
        class_name: className.trim(),
      });
      showSuccessToast('学生数字编号已生成');
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleImportCsv = async () => {
    setImporting(true);
    try {
      const DocumentPicker = await loadDocumentPickerModule();
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets[0]) return;
      const file = new File(picked.assets[0].uri);
      const rows = parseStudentCsv(await file.text());
      if (rows.length === 0) {
        showErrorToast('CSV 文件为空或格式不正确');
        return;
      }
      const invalidIndex = rows.findIndex((row) => validatePasswordStrength(row.initial_password));
      if (invalidIndex >= 0) {
        showErrorToast(`第 ${invalidIndex + 2} 行：${validatePasswordStrength(rows[invalidIndex].initial_password)}`);
        return;
      }
      const response = await batchCreateStudents(apiClient, rows);
      if (response.created[0]) {
        setResult(response.created[0]);
      }
      showSuccessToast(`批量导入完成：成功 ${response.created_count} 条，失败 ${response.errors.length} 条`);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : '导入失败');
    } finally {
      setImporting(false);
    }
  };

  const handleExportResult = async () => {
    if (!result) return;
    setExporting(true);
    try {
      await shareExportFile(await exportStudentsByIds(apiClient, [result.id]));
      showSuccessToast('Excel 文件已准备分享');
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const handlePrintResult = async () => {
    if (!result) return;
    setPrinting(true);
    try {
      const response = await fetchPrintCardsByStudentIds(apiClient, [result.id], getAccountLoginUrl());
      await printOrShareAccountCards(response.cards);
      showSuccessToast('账号卡已准备打印或分享');
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : '打印失败');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <AccountConsoleShell title="注册学生编号信息" active={active}>
      <View style={styles.grid}>
        <Panel>
          <Text style={styles.panelTitle}>注册学生编号信息</Text>
          <Field label="学校名">
            <TextInput style={[styles.input, styles.readonly]} value={auth?.schoolName || ''} editable={false} />
          </Field>
          <Field label="班级名">
            <TextInput
              style={styles.input}
              value={className}
              onChangeText={setClassName}
              placeholder="例如：三年级 2 班"
              placeholderTextColor={LoginColors.inputPlaceholder}
            />
          </Field>
          <Field label="班级学号的后 2 位">
            <TextInput
              style={styles.input}
              value={classSuffix}
              onChangeText={(value) => setClassSuffix(value.replace(/\D/g, '').slice(0, 2))}
              placeholder="例如：25"
              placeholderTextColor={LoginColors.inputPlaceholder}
              keyboardType="number-pad"
            />
          </Field>
          <Field label="学生初始密码">
            <TextInput
              style={styles.input}
              value={initialPassword}
              onChangeText={setInitialPassword}
              placeholder="至少 8 位，包含字母和数字"
              placeholderTextColor={LoginColors.inputPlaceholder}
              secureTextEntry
            />
          </Field>
          <PrimaryButton label={creating ? '生成中...' : '下一步，生成学生ID'} onPress={handleCreate} disabled={creating} />
        </Panel>

        <Panel>
          <Text style={styles.panelTitle}>Excel 批量导入</Text>
          <Text style={styles.subtitle}>模板字段：学校名、班级名、班级学号的后 2 位、学生初始密码。</Text>
          <SecondaryButton
            label={importing ? '导入中...' : '选择 CSV 文件并导入'}
            onPress={handleImportCsv}
            disabled={importing}
          />
        </Panel>
      </View>

      {result ? (
        <Panel>
          <Text style={styles.panelTitle}>已生成的学生数字编号和密码</Text>
          <Text style={styles.subtitle}>请将以下信息交给学生，数字 ID 用于登录。</Text>
          <View style={styles.stats}>
            <Stat label="学校" value={result.school_name || auth?.schoolName || '—'} />
            <Stat label="班级" value={result.class_name || className || '—'} />
            <Stat label="学生数字编号" value={result.digital_id} />
          </View>
          <ScrollView horizontal>
            <View style={styles.resultTable}>
              <View style={[styles.row, styles.headerRow]}>
                {['数字 ID', '班级学号后 2 位', '初始密码', '备注'].map((label) => (
                  <Text key={label} style={[styles.cell, styles.headerCell]}>{label}</Text>
                ))}
              </View>
              <View style={styles.row}>
                <Text selectable style={styles.cell}>{result.digital_id}</Text>
                <Text selectable style={styles.cell}>{result.class_suffix}</Text>
                <Text selectable style={styles.cell}>{result.initial_password}</Text>
                <Text style={styles.cell}>{result.remark || '未设置'}</Text>
              </View>
            </View>
          </ScrollView>
          <View style={styles.actions}>
            <SecondaryButton label={exporting ? '导出中...' : '导出 Excel'} onPress={handleExportResult} disabled={exporting} />
            <SecondaryButton label={printing ? '准备中...' : '打印账号卡'} onPress={handlePrintResult} disabled={printing} />
            <PrimaryButton label="返回学生列表" onPress={() => router.replace(listRoute as Href)} />
          </View>
        </Panel>
      ) : null}
    </AccountConsoleShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text selectable style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
  },
  subtitle: {
    color: LoginColors.textMuted,
    fontSize: 14,
    fontWeight: LoginWeights.medium,
    lineHeight: 20,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: LoginWeights.bold,
    color: LoginColors.textLabel,
  },
  input: {
    minWidth: 300,
    height: 46,
    borderWidth: 1.5,
    borderColor: LoginColors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: LoginColors.inputBg,
    color: LoginColors.inputText,
  },
  readonly: {
    color: LoginColors.inputReadonlyText,
  },
  stats: {
    flexDirection: 'row',
    gap: 14,
  },
  stat: {
    flex: 1,
    minWidth: 180,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#f0f9ff',
    padding: 14,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: LoginWeights.bold,
    color: '#0369a1',
  },
  statValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: LoginWeights.extraBold,
    color: '#0369a1',
  },
  resultTable: {
    borderWidth: 1,
    borderColor: LoginColors.line,
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    backgroundColor: LoginColors.white,
  },
  headerRow: {
    backgroundColor: '#f8fafc',
  },
  cell: {
    width: 180,
    padding: 12,
    color: LoginColors.text,
    fontWeight: LoginWeights.medium,
  },
  headerCell: {
    fontWeight: LoginWeights.extraBold,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-end',
  },
});
