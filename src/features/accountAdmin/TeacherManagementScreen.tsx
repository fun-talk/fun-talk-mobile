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

import { LANDSCAPE_MODAL_ORIENTATIONS } from '@/constants/orientation';
import { useAuth } from '@/features/auth';
import { LoginColors, LoginWeights } from '@/features/auth/components/LoginConstants';
import { validatePasswordPair } from '@/features/auth/passwordPolicy';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import {
  createTeacherAccount,
  fetchAdminOverview,
  fetchAdminStudents,
  fetchAdminTeachers,
  fetchSchoolManagement,
  mergeAdminTeachers,
  updateTeacherAccount,
  type AdminOverview,
  type AdminStudentRow,
  type AdminTeacherRow,
  type SchoolManagementClass,
} from '@/features/auth/services/accountApi';

import { AccountConsoleShell, Panel, PrimaryButton, SecondaryButton } from './AccountConsoleShell';

type TeacherEditForm = {
  displayName: string;
  phone: string;
  email: string;
  scopeType: string;
  scopeValue: string;
  viewPermissions: string;
  editPermissions: string;
};

function viewPermissionLabel(value: string) {
  return value === 'all' ? '全部' : '指定学生';
}

function editPermissionLabel(value: string) {
  if (value === 'all') return '全部';
  if (value === 'reset_password') return '重置密码';
  if (value === 'create_student,reset_password') return '创建学生编号、重置密码';
  return '创建学生编号';
}

function studentOptionLabel(student: AdminStudentRow) {
  return `${student.digital_id} · ${student.nickname_label} · ${student.class_name}`;
}

export function TeacherManagementScreen() {
  const { apiClient, auth } = useAuth();
  const [teachers, setTeachers] = useState<AdminTeacherRow[]>([]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [schoolClasses, setSchoolClasses] = useState<SchoolManagementClass[]>([]);
  const [students, setStudents] = useState<AdminStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [merging, setMerging] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminTeacherRow | null>(null);
  const [editForm, setEditForm] = useState<TeacherEditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [scopeType, setScopeType] = useState('global');
  const [scopeValue, setScopeValue] = useState('');
  const [sourceTeacherId, setSourceTeacherId] = useState('');
  const [targetTeacherId, setTargetTeacherId] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [teacherData, overviewData, schoolData, studentData] = await Promise.all([
        fetchAdminTeachers(apiClient),
        fetchAdminOverview(apiClient),
        fetchSchoolManagement(apiClient),
        fetchAdminStudents(apiClient),
      ]);
      setTeachers(teacherData.teachers);
      setOverview(overviewData.overview);
      setSchoolClasses(schoolData.management.classes);
      setStudents(studentData.students);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : '加载老师账号失败');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const mergeCandidates = useMemo(() => teachers.filter((teacher) => teacher.role === 'teacher'), [teachers]);
  const classOptions = useMemo(() => schoolClasses.map((schoolClass) => schoolClass.name), [schoolClasses]);
  const studentOptions = students;

  const handleCreate = async () => {
    if (!phone.trim()) {
      showErrorToast('请输入手机号');
      return;
    }
    const passwordError = validatePasswordPair(password, confirmPassword);
    if (passwordError) {
      showErrorToast(passwordError);
      return;
    }
    if (scopeType === 'class' && !scopeValue) {
      showErrorToast('请选择班级');
      return;
    }
    if (scopeType === 'student' && !scopeValue) {
      showErrorToast('请选择学生');
      return;
    }
    setSubmitting(true);
    try {
      await createTeacherAccount(apiClient, {
        phone: phone.trim(),
        password,
        confirm_password: confirmPassword,
        email: email.trim(),
        display_name: displayName.trim(),
        scope_type: scopeType,
        scope_value: scopeValue.trim(),
      });
      setPhone('');
      setDisplayName('');
      setPassword('');
      setConfirmPassword('');
      setEmail('');
      setScopeType('global');
      setScopeValue('');
      setShowForm(false);
      showSuccessToast('教学老师账号创建成功');
      await loadData();
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMerge = async () => {
    if (!sourceTeacherId || !targetTeacherId) {
      showErrorToast('请选择源老师账号和目标老师账号');
      return;
    }
    if (sourceTeacherId === targetTeacherId) {
      showErrorToast('源老师账号和目标老师账号不能相同');
      return;
    }
    setMerging(true);
    try {
      await mergeAdminTeachers(apiClient, Number(sourceTeacherId), Number(targetTeacherId));
      setShowMerge(false);
      setSourceTeacherId('');
      setTargetTeacherId('');
      showSuccessToast('老师账号合并成功');
      await loadData();
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : '合并失败');
    } finally {
      setMerging(false);
    }
  };

  const openEdit = (teacher: AdminTeacherRow) => {
    if (teacher.role === 'admin' && teacher.id !== auth?.teacherId) {
      showErrorToast('不能修改其他管理员信息');
      return;
    }
    setEditTarget(teacher);
    setEditForm({
      displayName: teacher.display_name,
      phone: teacher.phone,
      email: teacher.email || '',
      scopeType: teacher.scope_type || 'global',
      scopeValue: teacher.scope_value || '',
      viewPermissions: teacher.view_permissions || 'assigned',
      editPermissions: teacher.edit_permissions || 'create_student,reset_password',
    });
  };

  const closeEdit = () => {
    if (savingEdit) return;
    setEditTarget(null);
    setEditForm(null);
  };

  const updateEditForm = (patch: Partial<TeacherEditForm>) => {
    setEditForm((current) => current ? { ...current, ...patch } : current);
  };

  const handleSaveEdit = async () => {
    if (!editTarget || !editForm) return;
    const scopeTypeValue = editForm.scopeType || 'global';
    const scopeValueValue = scopeTypeValue === 'global' ? '' : editForm.scopeValue.trim();
    if (scopeTypeValue !== 'global' && !scopeValueValue) {
      showErrorToast(scopeTypeValue === 'class' ? '请选择班级' : '请选择学生');
      return;
    }

    setSavingEdit(true);
    try {
      const result = await updateTeacherAccount(apiClient, editTarget.id, {
        display_name: editForm.displayName.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim(),
        scope_type: scopeTypeValue,
        scope_value: scopeValueValue,
        view_permissions: editForm.viewPermissions,
        edit_permissions: editForm.editPermissions,
      });
      setTeachers((current) => current.map((teacher) => (
        teacher.id === editTarget.id ? result.teacher : teacher
      )));
      showSuccessToast('老师信息已更新');
      setEditTarget(null);
      setEditForm(null);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <AccountConsoleShell title="老师账号管理" active="admin-teachers">
      <Panel>
        <View style={styles.header}>
          <Text style={styles.panelTitle}>老师账号管理</Text>
          <View style={styles.actions}>
            <SecondaryButton label="合并账号 / 信息" onPress={() => setShowMerge(true)} disabled={mergeCandidates.length < 2} />
            <PrimaryButton label={showForm ? '收起表单' : '新增老师'} onPress={() => setShowForm((value) => !value)} />
          </View>
        </View>

        {overview ? (
          <View style={styles.stats}>
            <Stat label="管理员账号" value={String(overview.admin_count)} />
            <Stat label="教学老师账号" value={String(overview.teacher_count)} />
            <Stat label="学生账号" value={String(overview.student_count)} />
          </View>
        ) : null}

        {showForm ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>填写老师注册信息</Text>
            <View style={styles.formGrid}>
              <Field label="手机号" value={phone} onChangeText={setPhone} placeholder="例如：135..." />
              <Field label="显示名称" value={displayName} onChangeText={setDisplayName} placeholder="例如：李老师" />
              <Field label="登录密码" value={password} onChangeText={setPassword} placeholder="至少 8 位，包含字母和数字" secure />
              <Field label="确认密码" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="请再次输入密码" secure />
              <Field label="邮箱（可选）" value={email} onChangeText={setEmail} placeholder="用于找回密码" />
              <ChoiceGroup
                label="学生范围"
                value={scopeType}
                options={[
                  { value: 'global', label: '全局' },
                  { value: 'class', label: '指定班级' },
                  { value: 'student', label: '指定学生' },
                ]}
                onChange={(value) => {
                  setScopeType(value);
                  setScopeValue('');
                }}
              />
              {scopeType === 'class' ? (
                <OptionPicker
                  label="范围值"
                  value={scopeValue}
                  placeholder={classOptions.length === 0 ? '暂无班级' : '请选择班级'}
                  options={classOptions.map((className) => ({ value: className, label: className }))}
                  onChange={setScopeValue}
                />
              ) : scopeType === 'student' ? (
                <OptionPicker
                  label="范围值"
                  value={scopeValue}
                  placeholder={studentOptions.length === 0 ? '暂无学生' : '请选择学生'}
                  options={studentOptions.map((student) => ({
                    value: student.digital_id,
                    label: studentOptionLabel(student),
                  }))}
                  onChange={setScopeValue}
                />
              ) : null}
            </View>
            <PrimaryButton label={submitting ? '创建中...' : '创建教学老师'} onPress={handleCreate} disabled={submitting} />
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.subtitle}>加载中...</Text>
          </View>
        ) : (
          <TeacherTable teachers={teachers} onEdit={openEdit} />
        )}
      </Panel>

      <Modal
        visible={Boolean(editTarget && editForm)}
        transparent
        animationType="slide"
        onRequestClose={closeEdit}
        supportedOrientations={LANDSCAPE_MODAL_ORIENTATIONS}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.editModalContent}>
              <Text style={styles.modalTitle}>编辑老师信息</Text>
              <Text style={styles.subtitle}>修改后点击保存，普通教学老师账号立即生效。</Text>
              {editForm ? (
                <>
                  <Field
                    label="显示名称"
                    value={editForm.displayName}
                    onChangeText={(value) => updateEditForm({ displayName: value })}
                    placeholder="例如：李老师"
                  />
                  <Field
                    label="手机号"
                    value={editForm.phone}
                    onChangeText={(value) => updateEditForm({ phone: value })}
                    placeholder="例如：135..."
                  />
                  <Field
                    label="邮箱（可选）"
                    value={editForm.email}
                    onChangeText={(value) => updateEditForm({ email: value })}
                    placeholder="用于找回密码"
                  />
                  <ChoiceGroup
                    label="学生范围"
                    value={editForm.scopeType}
                    options={[
                      { value: 'global', label: '全局' },
                      { value: 'class', label: '指定班级' },
                      { value: 'student', label: '指定学生' },
                    ]}
                    onChange={(value) => updateEditForm({
                      scopeType: value,
                      scopeValue: value === editForm.scopeType ? editForm.scopeValue : '',
                    })}
                  />
                  {editForm.scopeType === 'class' ? (
                    <OptionPicker
                      label="范围值"
                      value={editForm.scopeValue}
                      placeholder={classOptions.length === 0 ? '暂无班级' : '请选择班级'}
                      options={classOptions.map((className) => ({ value: className, label: className }))}
                      onChange={(value) => updateEditForm({ scopeValue: value })}
                    />
                  ) : editForm.scopeType === 'student' ? (
                    <OptionPicker
                      label="范围值"
                      value={editForm.scopeValue}
                      placeholder={studentOptions.length === 0 ? '暂无学生' : '请选择学生'}
                      options={[
                        ...(editForm.scopeValue && !studentOptions.some((student) => student.digital_id === editForm.scopeValue)
                          ? [{ value: editForm.scopeValue, label: `当前学生：${editForm.scopeValue}` }]
                          : []),
                        ...studentOptions.map((student) => ({
                          value: student.digital_id,
                          label: studentOptionLabel(student),
                        })),
                      ]}
                      onChange={(value) => updateEditForm({ scopeValue: value })}
                    />
                  ) : null}
                  <ChoiceGroup
                    label="查看权限"
                    value={editForm.viewPermissions}
                    options={[
                      { value: 'assigned', label: '指定学生' },
                      { value: 'all', label: '全部' },
                    ]}
                    onChange={(value) => updateEditForm({ viewPermissions: value })}
                  />
                  <ChoiceGroup
                    label="编辑权限"
                    value={editForm.editPermissions}
                    options={[
                      { value: 'create_student,reset_password', label: '创建学生编号、重置密码' },
                      { value: 'create_student', label: '创建学生编号' },
                      { value: 'reset_password', label: '重置密码' },
                      { value: 'all', label: '全部' },
                    ]}
                    onChange={(value) => updateEditForm({ editPermissions: value })}
                  />
                  <View style={styles.modalActions}>
                    <SecondaryButton label="取消" onPress={closeEdit} disabled={savingEdit} />
                    <PrimaryButton label={savingEdit ? '保存中...' : '保存'} onPress={handleSaveEdit} disabled={savingEdit} />
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showMerge}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMerge(false)}
        supportedOrientations={LANDSCAPE_MODAL_ORIENTATIONS}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>合并账号 / 信息</Text>
            <Text style={styles.subtitle}>选择要合并的源老师账号与保留的目标老师账号。</Text>
            <PickerLike
              label="源老师账号"
              value={sourceTeacherId}
              onChange={setSourceTeacherId}
              teachers={mergeCandidates}
            />
            <PickerLike
              label="目标老师账号"
              value={targetTeacherId}
              onChange={setTargetTeacherId}
              teachers={mergeCandidates}
            />
            <View style={styles.modalActions}>
              <SecondaryButton label="取消" onPress={() => setShowMerge(false)} disabled={merging} />
              <PrimaryButton label={merging ? '合并中...' : '合并'} onPress={handleMerge} disabled={merging} />
            </View>
          </View>
        </View>
      </Modal>
    </AccountConsoleShell>
  );
}

function TeacherTable({ teachers, onEdit }: { teachers: AdminTeacherRow[]; onEdit: (teacher: AdminTeacherRow) => void }) {
  if (teachers.length === 0) return <Text style={styles.subtitle}>暂无老师账号</Text>;
  return (
    <ScrollView horizontal>
      <View style={styles.table}>
        <View style={[styles.row, styles.headerRow]}>
          {['老师账号', '角色', '学生范围', '手机号', '查看权限', '编辑权限', '操作'].map((label) => (
            <Text key={label} style={[styles.cell, styles.headerCell]}>{label}</Text>
          ))}
        </View>
        {teachers.map((teacher) => (
          <View key={teacher.id} style={styles.row}>
            <Text style={[styles.cell, styles.bold]}>{teacher.display_name}</Text>
            <Text style={styles.cell}>{teacher.role_label}</Text>
            <Text style={styles.cell}>{teacher.scope_label}</Text>
            <Text selectable style={styles.cell}>{teacher.phone}</Text>
            <Text style={styles.cell}>{viewPermissionLabel(teacher.view_permissions)}</Text>
            <Text style={styles.cell}>{editPermissionLabel(teacher.edit_permissions)}</Text>
            <View style={styles.cell}>
              <Pressable style={styles.editBtn} onPress={() => onEdit(teacher)}>
                <Text style={styles.editBtnText}>编辑</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function ChoiceGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.segmentWrap}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              style={[styles.segmentOption, active && styles.segmentOptionActive]}
              onPress={() => onChange(option.value)}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secure?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={LoginColors.inputPlaceholder}
        secureTextEntry={secure}
      />
    </View>
  );
}

function OptionPicker({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const disabled = options.length === 0;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.pickerField, disabled && styles.pickerFieldDisabled]}
        onPress={() => {
          if (!disabled) setOpen(true);
        }}
        disabled={disabled}
      >
        <Text style={[styles.pickerFieldText, !selected && styles.pickerPlaceholder]}>
          {selected?.label || placeholder}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        supportedOrientations={LANDSCAPE_MODAL_ORIENTATIONS}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.optionModal}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView contentContainerStyle={styles.optionList}>
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.optionRow, active && styles.optionRowActive]}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.optionRowText, active && styles.optionRowTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <SecondaryButton label="取消" onPress={() => setOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PickerLike({
  label,
  value,
  onChange,
  teachers,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  teachers: AdminTeacherRow[];
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal contentContainerStyle={styles.choiceRow}>
        {teachers.map((teacher) => (
          <Pressable
            key={teacher.id}
            style={[styles.choice, value === String(teacher.id) && styles.choiceActive]}
            onPress={() => onChange(String(teacher.id))}
          >
            <Text style={[styles.choiceText, value === String(teacher.id) && styles.choiceTextActive]}>
              {teacher.display_name} ({teacher.phone})
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
  },
  stats: {
    flexDirection: 'row',
    gap: 14,
  },
  stat: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LoginColors.line,
    backgroundColor: '#f8fafc',
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
  },
  statLabel: {
    marginTop: 4,
    color: LoginColors.textMuted,
    fontWeight: LoginWeights.bold,
  },
  form: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LoginColors.line,
    backgroundColor: '#f8fafc',
    padding: 16,
    gap: 14,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
    minWidth: 240,
    height: 44,
    borderWidth: 1.5,
    borderColor: LoginColors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: LoginColors.inputBg,
    color: LoginColors.inputText,
  },
  pickerField: {
    minWidth: 240,
    minHeight: 44,
    borderWidth: 1.5,
    borderColor: LoginColors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: LoginColors.inputBg,
    justifyContent: 'center',
  },
  pickerFieldDisabled: {
    opacity: 0.68,
  },
  pickerFieldText: {
    color: LoginColors.inputText,
    fontWeight: LoginWeights.bold,
  },
  pickerPlaceholder: {
    color: LoginColors.inputPlaceholder,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 20,
  },
  subtitle: {
    color: LoginColors.textMuted,
    fontWeight: LoginWeights.medium,
  },
  table: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LoginColors.line,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: LoginColors.line,
    backgroundColor: LoginColors.white,
  },
  headerRow: {
    backgroundColor: '#f8fafc',
  },
  cell: {
    width: 160,
    padding: 12,
    color: LoginColors.text,
  },
  editBtn: {
    alignSelf: 'flex-start',
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LoginColors.primaryStart,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  editBtnText: {
    color: LoginColors.primaryStart,
    fontWeight: LoginWeights.extraBold,
  },
  headerCell: {
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.textLabel,
  },
  bold: {
    fontWeight: LoginWeights.extraBold,
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
    maxWidth: 520,
    maxHeight: '88%',
    borderRadius: 22,
    backgroundColor: LoginColors.modalBg,
    padding: 22,
    gap: 14,
  },
  optionModal: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '78%',
    borderRadius: 22,
    backgroundColor: LoginColors.modalBg,
    padding: 22,
    gap: 14,
  },
  optionList: {
    gap: 8,
  },
  optionRow: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LoginColors.line,
    backgroundColor: LoginColors.white,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  optionRowActive: {
    backgroundColor: LoginColors.text,
    borderColor: LoginColors.text,
  },
  optionRowText: {
    color: LoginColors.text,
    fontWeight: LoginWeights.bold,
  },
  optionRowTextActive: {
    color: LoginColors.white,
  },
  editModalContent: {
    gap: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  choiceRow: {
    gap: 8,
  },
  choice: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LoginColors.secondaryBorder,
    backgroundColor: LoginColors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  choiceActive: {
    backgroundColor: LoginColors.text,
    borderColor: LoginColors.text,
  },
  choiceText: {
    color: LoginColors.secondaryText,
    fontWeight: LoginWeights.bold,
  },
  choiceTextActive: {
    color: LoginColors.white,
  },
  segmentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segmentOption: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LoginColors.secondaryBorder,
    backgroundColor: LoginColors.white,
    paddingHorizontal: 14,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  segmentOptionActive: {
    backgroundColor: LoginColors.text,
    borderColor: LoginColors.text,
  },
  segmentText: {
    color: LoginColors.secondaryText,
    fontWeight: LoginWeights.bold,
  },
  segmentTextActive: {
    color: LoginColors.white,
  },
});
