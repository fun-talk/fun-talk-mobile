import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { useAuth } from '@/features/auth';
import { LoginColors, LoginWeights } from '@/features/auth/components/LoginConstants';
import { validatePasswordStrength } from '@/features/auth/passwordPolicy';
import { ADMIN_STUDENT_CREATE_ROUTE, TEACHER_STUDENT_CREATE_ROUTE } from '@/lib/auth/accountRoutes';
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast';

import { AccountConsoleShell, Panel, PrimaryButton, SecondaryButton, StatusTag } from './AccountConsoleShell';
import { getAccountLoginUrl, printOrShareAccountCards, shareExportFile } from './accountFiles';
import {
  exportAdminStudents,
  exportTeacherStudents,
  fetchAdminStudents,
  fetchAdminPrintCards,
  fetchPasswordResetRequests,
  fetchTeacherPrintCards,
  fetchTeacherStudents,
  resetStudentPassword,
  type AdminStudentRow,
  type PasswordResetRequestRow,
} from '@/features/auth/services/accountApi';

type StudentManagementScreenProps = {
  role: 'admin' | 'teacher';
};

export function StudentManagementScreen({ role }: StudentManagementScreenProps) {
  const router = useRouter();
  const { apiClient } = useAuth();
  const [students, setStudents] = useState<AdminStudentRow[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequestRow[]>([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [loading, setLoading] = useState(true);
  const [resetPasswords, setResetPasswords] = useState<Record<number, string>>({});
  const [resetTarget, setResetTarget] = useState<AdminStudentRow | null>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentData, requestData] = await Promise.all([
        role === 'admin' ? fetchAdminStudents(apiClient) : fetchTeacherStudents(apiClient),
        fetchPasswordResetRequests(apiClient),
      ]);
      setStudents(studentData.students);
      setResetRequests(requestData.requests);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : '加载学生账号失败');
    } finally {
      setLoading(false);
    }
  }, [apiClient, role]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const classNames = useMemo(
    () => Array.from(new Set(students.map((student) => student.class_name))).filter(Boolean),
    [students],
  );

  const filteredStudents = useMemo(
    () =>
      selectedClass === 'all'
        ? students
        : students.filter((student) => student.class_name === selectedClass),
    [selectedClass, students],
  );

  const handleOpenReset = (student: AdminStudentRow) => {
    setCustomPassword('');
    setResetTarget(student);
  };

  const handleConfirmReset = async () => {
    if (!resetTarget) return;
    const normalized = customPassword.trim();
    if (normalized) {
      const passwordError = validatePasswordStrength(normalized);
      if (passwordError) {
        showErrorToast(passwordError);
        return;
      }
    }

    setResetting(true);
    try {
      const result = await resetStudentPassword(apiClient, resetTarget.id, normalized);
      setResetPasswords((current) => ({ ...current, [resetTarget.id]: result.temporary_password }));
      showSuccessToast(`已成功重置学生 ${resetTarget.digital_id} 的密码`);
      setResetTarget(null);
      await loadData();
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : '重置失败');
    } finally {
      setResetting(false);
    }
  };

  const handleViewHomeData = (student: AdminStudentRow) => {
    showInfoToast(`正在查看学生 ${student.digital_id}（${student.nickname_label}）的家庭学习数据`);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const payload =
        role === 'admin'
          ? await exportAdminStudents(apiClient, selectedClass)
          : await exportTeacherStudents(apiClient, selectedClass);
      await shareExportFile(payload);
      showSuccessToast('Excel 文件已准备分享');
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const result =
        role === 'admin'
          ? await fetchAdminPrintCards(apiClient, getAccountLoginUrl(), selectedClass)
          : await fetchTeacherPrintCards(apiClient, getAccountLoginUrl(), selectedClass);
      await printOrShareAccountCards(result.cards);
      showSuccessToast('账号卡已准备打印或分享');
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : '打印失败');
    } finally {
      setPrinting(false);
    }
  };

  const active = role === 'admin' ? 'admin-students' : 'teacher-students';
  const title = '学生账号管理';

  return (
    <AccountConsoleShell title={title} active={active}>
      <Panel>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.panelTitle}>学生账号管理</Text>
            {role === 'teacher' ? <Text style={styles.subtitle}>仅展示您分配权限范围内的学生账号。</Text> : null}
          </View>
          <View style={styles.actions}>
            <PrimaryButton
              label="单个创建"
              onPress={() =>
                router.push(
                  (role === 'admin' ? ADMIN_STUDENT_CREATE_ROUTE : TEACHER_STUDENT_CREATE_ROUTE) as Href,
                )
              }
            />
            <SecondaryButton
              label={exporting ? '导出中...' : '导出 Excel'}
              onPress={handleExport}
              disabled={exporting || loading || filteredStudents.length === 0}
            />
            <SecondaryButton
              label={printing ? '准备中...' : '打印账号卡'}
              onPress={handlePrint}
              disabled={printing || loading || filteredStudents.length === 0}
            />
          </View>
        </View>

        <View style={styles.classFilter}>
          <Text style={styles.filterLabel}>班级：</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classOptions}>
            <ClassChip label="全部班级" active={selectedClass === 'all'} onPress={() => setSelectedClass('all')} />
            {classNames.map((className) => (
              <ClassChip
                key={className}
                label={className}
                active={selectedClass === className}
                onPress={() => setSelectedClass(className)}
              />
            ))}
          </ScrollView>
        </View>

        {resetRequests.length > 0 ? (
          <View style={styles.resetBox}>
            <Text style={styles.resetBoxTitle}>待处理忘记密码申请（{resetRequests.length}）</Text>
            {resetRequests.map((request) => (
              <Text key={request.id} style={styles.resetText}>
                {request.digital_id} · {request.nickname_label} · {request.class_name}
              </Text>
            ))}
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.subtitle}>加载中...</Text>
          </View>
        ) : (
          <StudentTable
            students={filteredStudents}
            resetPasswords={resetPasswords}
            onReset={handleOpenReset}
            onViewHomeData={handleViewHomeData}
          />
        )}
      </Panel>

      <Modal visible={Boolean(resetTarget)} transparent animationType="fade" onRequestClose={() => setResetTarget(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>重置学生密码</Text>
            <Text style={styles.subtitle}>
              学生 {resetTarget?.digital_id}，留空则随机生成新密码。
            </Text>
            <TextInput
              style={styles.input}
              value={customPassword}
              onChangeText={setCustomPassword}
              placeholder="新密码（可选）"
              placeholderTextColor={LoginColors.inputPlaceholder}
              secureTextEntry
              editable={!resetting}
            />
            <View style={styles.modalActions}>
              <SecondaryButton label="取消" onPress={() => setResetTarget(null)} disabled={resetting} />
              <PrimaryButton
                label={resetting ? '重置中...' : '重置'}
                onPress={handleConfirmReset}
                disabled={resetting}
              />
            </View>
          </View>
        </View>
      </Modal>
    </AccountConsoleShell>
  );
}

function ClassChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.classChip, active && styles.classChipActive]} onPress={onPress}>
      <Text style={[styles.classChipText, active && styles.classChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function StudentTable({
  students,
  resetPasswords,
  onReset,
  onViewHomeData,
}: {
  students: AdminStudentRow[];
  resetPasswords: Record<number, string>;
  onReset: (student: AdminStudentRow) => void;
  onViewHomeData: (student: AdminStudentRow) => void;
}) {
  if (students.length === 0) {
    return <Text style={styles.empty}>暂无学生账号</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          {['数字 ID', '昵称', '班级 ID 后 2 位', '密码', '学校与家庭数据绑定', '操作'].map((title) => (
            <Text key={title} style={[styles.cell, styles.headerCell]}>
              {title}
            </Text>
          ))}
        </View>
        {students.map((student) => {
          const temporaryPassword = resetPasswords[student.id];
          const displayPassword = temporaryPassword || student.password || '••••••';
          return (
            <View key={student.id} style={[styles.tableRow, student.pending_password_reset && styles.warnRow]}>
              <View style={styles.cell}>
                <Text selectable style={styles.boldText}>
                  {student.digital_id}
                </Text>
                {student.pending_password_reset ? <StatusTag label="待重置" tone="warn" /> : null}
              </View>
              <Text style={styles.cell}>{student.nickname_label}</Text>
              <Text selectable style={styles.cell}>
                {student.class_suffix}
              </Text>
              <View style={styles.cell}>
                <Text selectable style={styles.passwordText}>
                  {displayPassword}
                </Text>
                <Pressable onPress={() => onReset(student)}>
                  <Text style={styles.linkText}>重置</Text>
                </Pressable>
              </View>
              <View style={styles.cell}>
                <StatusTag label={student.has_home_binding ? '已绑定' : '未绑定'} tone={student.has_home_binding ? 'ok' : 'muted'} />
              </View>
              <View style={styles.cell}>
                {student.home_data_authorized ? (
                  <Pressable onPress={() => onViewHomeData(student)}>
                    <Text style={styles.linkText}>查看家庭数据</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.mutedText}>无</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
  },
  subtitle: {
    marginTop: 4,
    color: LoginColors.textMuted,
    fontSize: 14,
    fontWeight: LoginWeights.medium,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
  },
  classFilter: {
    gap: 8,
  },
  filterLabel: {
    fontWeight: LoginWeights.bold,
    color: LoginColors.textLabel,
  },
  classOptions: {
    gap: 8,
    paddingRight: 16,
  },
  classChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LoginColors.secondaryBorder,
    backgroundColor: LoginColors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  classChipActive: {
    backgroundColor: LoginColors.text,
    borderColor: LoginColors.text,
  },
  classChipText: {
    color: LoginColors.secondaryText,
    fontWeight: LoginWeights.bold,
    fontSize: 13,
  },
  classChipTextActive: {
    color: LoginColors.white,
  },
  resetBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LoginColors.infoBlueBorder,
    backgroundColor: LoginColors.infoBlueBg,
    padding: 14,
    gap: 6,
  },
  resetBoxTitle: {
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.infoBlueText,
  },
  resetText: {
    color: LoginColors.text,
    fontWeight: LoginWeights.medium,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 20,
  },
  empty: {
    color: LoginColors.textMuted,
    fontWeight: LoginWeights.bold,
    padding: 18,
  },
  table: {
    borderWidth: 1,
    borderColor: LoginColors.line,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: LoginColors.line,
    backgroundColor: LoginColors.white,
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
  },
  warnRow: {
    backgroundColor: '#fffbeb',
  },
  cell: {
    width: 162,
    padding: 12,
    justifyContent: 'center',
    color: LoginColors.text,
    fontSize: 14,
    gap: 6,
  },
  headerCell: {
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.textLabel,
  },
  boldText: {
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
  },
  passwordText: {
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.success,
  },
  linkText: {
    color: LoginColors.infoBlueText,
    fontWeight: LoginWeights.extraBold,
    textDecorationLine: 'underline',
  },
  mutedText: {
    color: LoginColors.textMuted,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LoginColors.modalBackdrop,
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 22,
    backgroundColor: LoginColors.modalBg,
    padding: 22,
    gap: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
  },
  input: {
    height: 46,
    borderWidth: 1.5,
    borderColor: LoginColors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: LoginColors.inputBg,
    color: LoginColors.inputText,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
});
