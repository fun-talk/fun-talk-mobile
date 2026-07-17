import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../AuthProvider';
import { loginImages } from '../assets/loginAssets';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { LoginColors, LoginSizes, LoginWeights } from './LoginConstants';
import { BindConfirmModal } from './BindConfirmModal';
import { validatePasswordPair } from '../passwordPolicy';
import {
  bindHomePhone,
  bindHomeStudent,
  bindStudentPhone,
  changeHomePassword,
  changeStudentPassword,
  deleteAccount,
  fetchAccountSession,
  fetchHomeProfile,
  fetchStudentProfile,
  previewHomeBinding,
  sendAccountSmsCode,
  unbindHomeStudent,
  updateStudentNickname,
  type HomeBindingPreview,
  type HomeProfile,
  type HomeProfileStudent,
  type StudentProfile,
} from '../services/accountApi';

type ProfileView = 'teacher' | 'student' | 'home';

const COURSES_ROUTE = '/(app)/courses' as Href;
const SMS_COOLDOWN = 60;

function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.skeletonBlock, style]} />;
}

function ProfilePanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.panel} pointerEvents="none">
      <SkeletonBlock style={styles.skeletonSectionTitle} />
      {Array.from({ length: rows }).map((_, index) => (
        <View style={styles.skeletonField} key={index}>
          <SkeletonBlock style={styles.skeletonLabel} />
          <SkeletonBlock style={styles.skeletonInput} />
        </View>
      ))}
      <SkeletonBlock style={styles.skeletonButton} />
    </View>
  );
}

function ProfileSkeletonScreen({ topPadding }: { topPadding: number }) {
  return (
    <View style={styles.root} accessibilityRole="progressbar" accessibilityLabel="正在加载个人中心">
      <Image source={loginImages.background} style={styles.bg} contentFit="cover" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <SkeletonBlock style={styles.skeletonHeaderTitle} />
          <View style={styles.headerActions}>
            <SkeletonBlock style={styles.skeletonHeaderBtn} />
            <SkeletonBlock style={styles.skeletonHeaderBtn} />
          </View>
        </View>

        <View style={styles.profileGrid}>
          <ProfilePanelSkeleton />
          <ProfilePanelSkeleton rows={5} />
        </View>
      </ScrollView>
    </View>
  );
}

export function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { apiClient, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profileView, setProfileView] = useState<ProfileView | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Student profile
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [nickname, setNickname] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Phone binding
  const [bindPhone, setBindPhone] = useState('');
  const [bindSms, setBindSms] = useState('');
  const [bindingPhone, setBindingPhone] = useState(false);
  const [bindSmsCountdown, setBindSmsCountdown] = useState(0);

  // Home profile
  const [homeProfile, setHomeProfile] = useState<HomeProfile | null>(null);
  const [unbindingId, setUnbindingId] = useState<string | null>(null);

  // Bind student
  const [bindDigitalId, setBindDigitalId] = useState('');
  const [bindPanelPhone, setBindPanelPhone] = useState('');
  const [bindPanelSms, setBindPanelSms] = useState('');
  const [bindingStudent, setBindingStudent] = useState(false);
  const [bindPanelSmsCountdown, setBindPanelSmsCountdown] = useState(0);
  const [bindPreview, setBindPreview] = useState<HomeBindingPreview | null>(null);
  const [bindPreviewOpen, setBindPreviewOpen] = useState(false);

  // SMS timers
  useEffect(() => {
    if (bindSmsCountdown <= 0) return;
    const t = setTimeout(() => setBindSmsCountdown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [bindSmsCountdown]);

  useEffect(() => {
    if (bindPanelSmsCountdown <= 0) return;
    const t = setTimeout(() => setBindPanelSmsCountdown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [bindPanelSmsCountdown]);

  const loadStudentProfile = useCallback(async () => {
    const data = await fetchStudentProfile(apiClient);
    setStudentProfile(data.profile);
    setNickname(data.profile.nickname || '');
    if (data.profile.phone) setBindPhone(data.profile.phone);
  }, [apiClient]);

  const loadHomeProfile = useCallback(async () => {
    const data = await fetchHomeProfile(apiClient);
    setHomeProfile(data.profile);
    if (data.profile.phone) {
      setBindPhone(data.profile.phone);
      setBindPanelPhone(data.profile.phone);
    }
  }, [apiClient]);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      try {
        const session = await fetchAccountSession(apiClient);
        if (cancelled) return;
        if (session.account_type === 'student') {
          setProfileView('student');
          await loadStudentProfile();
        } else if (session.account_type === 'home') {
          setProfileView('home');
          await loadHomeProfile();
        } else {
          setProfileView('teacher');
        }
      } catch {
        if (!cancelled) router.replace(COURSES_ROUTE);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void bootstrap();
    return () => { cancelled = true; };
  }, [apiClient, loadStudentProfile, loadHomeProfile, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.replace('/(auth)/login' as Href);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '永久删除账号？',
      '账号、个人资料和学习记录将被永久删除，且无法恢复。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '永久删除',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteAccount(apiClient);
              Alert.alert('账号已删除', '你的账号和相关数据已永久删除。', [
                {
                  text: '确定',
                  onPress: () => {
                    void logout().then(() => router.replace('/(auth)/login' as Href));
                  },
                },
              ]);
            } catch (err) {
              setIsDeleting(false);
              showErrorToast(err instanceof Error ? err.message : '删除账号失败');
            }
          },
        },
      ],
    );
  };

  const handleSendSms = async (phone: string, setCountdown: (v: number) => void) => {

try {
      const result = await sendAccountSmsCode(apiClient, phone);
      setCountdown(result.expires_in || SMS_COOLDOWN);
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : '发送失败');
    }
  };

  // Nickname
  const handleNicknameSave = async () => {
    setSavingNickname(true);


    try {
      const result = await updateStudentNickname(apiClient, nickname);
      setStudentProfile(result.profile);
      setNickname(result.profile.nickname || '');
      showSuccessToast('昵称已保存');
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSavingNickname(false);
    }
  };

  // Password
  const handlePasswordSave = async () => {
    const passwordError = validatePasswordPair(newPassword, confirmPassword);
    if (passwordError) { showErrorToast(passwordError); return; }
    setSavingPassword(true);


    try {
      if (profileView === 'home') {
        await changeHomePassword(apiClient, newPassword, confirmPassword);
      } else {
        await changeStudentPassword(apiClient, newPassword, confirmPassword);
      }
      setNewPassword('');
      setConfirmPassword('');
      showSuccessToast('密码已更新');
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : '修改失败');
    } finally {
      setSavingPassword(false);
    }
  };

  // Phone bind
  const handleBindPhone = async () => {
    if (!bindPhone.trim() || !bindSms.trim()) { showErrorToast('请填写手机号和验证码'); return; }
    setBindingPhone(true);
try {
      if (profileView === 'home') {
        const r = await bindHomePhone(apiClient, bindPhone.trim(), bindSms.trim());
        setHomeProfile(r.profile);
      } else {
        const r = await bindStudentPhone(apiClient, bindPhone.trim(), bindSms.trim());
        setStudentProfile(r.profile);
      }
      setBindSms('');
      showSuccessToast('手机号绑定成功');
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : '绑定失败');
    } finally { setBindingPhone(false); }
  };

  // Bind student
  const handlePreviewBind = async () => {
    if (!bindDigitalId.trim()) { showErrorToast('请输入学生数字 ID'); return; }
setBindingStudent(true);
    try {
      const result = await previewHomeBinding(apiClient, bindDigitalId.trim());
      setBindPreview(result.preview);
      setBindPreviewOpen(true);
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : '查询学生信息失败');
    } finally { setBindingStudent(false); }
  };

  const handleConfirmBindStudent = async () => {
    if (!bindPreview || bindPreview.student_already_bound) return;
    setBindingStudent(true);
try {
      const result = await bindHomeStudent(apiClient, bindDigitalId, bindPanelPhone, bindPanelSms);
      setBindPanelSms('');
      setBindDigitalId('');
      setBindPreviewOpen(false);
      setBindPreview(null);
      showSuccessToast(`已成功绑定学生 ${result.binding.nickname_label}`);
      await loadHomeProfile();
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : '绑定失败');
    } finally { setBindingStudent(false); }
  };

  const handleUnbindStudent = (child: HomeProfileStudent) => {
    Alert.alert(
      '解除绑定',
      `确定解除与学生 ${child.digital_id}（${child.nickname_label}）的绑定吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定解除', style: 'destructive',
          onPress: async () => {
            setUnbindingId(child.digital_id);
                try {
              await unbindHomeStudent(apiClient, child.digital_id);
              showSuccessToast(`已解除与学生 ${child.nickname_label} 的绑定`);
              await loadHomeProfile();
            } catch (err) {
              showErrorToast(err instanceof Error ? err.message : '解除绑定失败');
            } finally { setUnbindingId(null); }
          },
        },
      ],
    );
  };

  const formatBoundAt = (timestamp?: number) =>
    timestamp ? new Date(timestamp * 1000).toLocaleString() : '—';

  const isHomeView = profileView === 'home';
  const isStudentView = profileView === 'student';
  const isTeacherView = profileView === 'teacher';
  const hasPhoneBound = isHomeView
    ? Boolean(homeProfile?.has_phone)
    : Boolean(studentProfile?.has_phone_bound);
  const homeChildren = homeProfile?.children ?? [];
  const title = isHomeView ? '家庭个人中心' : isStudentView ? '学生个人中心' : '老师个人中心';

  if (loading) {
    return <ProfileSkeletonScreen topPadding={insets.top + 20} />;
  }

  /* ── Reusable submit button ── */
  const SubmitBtn = ({ onPress, disabled, label }: { onPress: () => void; disabled: boolean; label: string }) => (
    <Pressable style={[styles.submitBtn, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      {disabled ? <ActivityIndicator color={LoginColors.white} size="small" /> : <Text style={styles.submitText}>{label}</Text>}
    </Pressable>
  );

  /* ── SMS send button ── */
  const SmsBtn = ({ countdown, phone, onPress }: { countdown: number; phone: string; onPress: () => void }) => (
    <Pressable style={[styles.smsBtn, (countdown > 0 || !phone.trim()) && styles.smsBtnDisabled]} onPress={onPress} disabled={countdown > 0 || !phone.trim()}>
      <Text style={styles.smsBtnText}>{countdown > 0 ? `${countdown}s` : '获取验证码'}</Text>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <Image source={loginImages.background} style={styles.bg} contentFit="cover" />

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]} keyboardShouldPersistTaps="handled">
        {/* Header — web .account-profile-topbar */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerActions}>
            <Pressable style={styles.headerBtn} onPress={() => router.replace(COURSES_ROUTE)}>
              <Text style={styles.headerBtnText}>返回大厅</Text>
            </Pressable>
            <Pressable style={[styles.headerBtn, styles.logoutBtn]} onPress={handleLogout} disabled={isLoggingOut}>
              <Text style={styles.logoutBtnText}>{isLoggingOut ? '退出中...' : '退出登录'}</Text>
            </Pressable>
          </View>
        </View>

        {/* Two-column grid — web .account-profile-grid */}
        {!isTeacherView ? <View style={styles.profileGrid}>
          {/* ===== LEFT: Account Info ===== */}
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>{isHomeView ? '家庭账号' : '我的个人信息'}</Text>

            {/* Student: Digital ID (readonly) */}
            {isStudentView ? (
              <View style={styles.field}>
                <Text style={styles.label}>数字编号</Text>
                <View style={styles.readonlyField}>
                  <Text style={styles.readonlyText}>{studentProfile?.digital_id || '暂无'}</Text>
                </View>
              </View>
            ) : null}

            {/* Student: Nickname */}
            {isStudentView ? (
              <View style={styles.field}>
                <Text style={styles.label}>昵称</Text>
                <View style={styles.fieldInline}>
                  <TextInput style={[styles.input, styles.inputFlex]} value={nickname} onChangeText={setNickname} placeholder="支持中文、英文、数字或组合" placeholderTextColor={LoginColors.inputPlaceholder} maxLength={20} />
                  <SubmitBtn onPress={handleNicknameSave} disabled={savingNickname} label={savingNickname ? '保存中...' : '修改昵称'} />
                </View>
              </View>
            ) : null}

            {/* Phone binding section — web .account-profile-subsection */}
            <View style={styles.subSection}>
              <Text style={styles.subTitle}>绑定手机号（可选）</Text>
              {hasPhoneBound ? (
                <View style={styles.field}>
                  <Text style={styles.label}>手机号</Text>
                  <View style={styles.readonlyField}>
                    <Text style={styles.readonlyText}>{isStudentView ? studentProfile?.masked_phone || bindPhone : homeProfile?.masked_phone || bindPhone}</Text>
                  </View>
                  <Text style={styles.hint}>已绑定，可通过手机号登录此账号</Text>
                </View>
              ) : (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>手机号</Text>
                    <TextInput style={styles.input} value={bindPhone} onChangeText={setBindPhone} placeholder="请输入手机号" placeholderTextColor={LoginColors.inputPlaceholder} keyboardType="phone-pad" />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>验证码</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput style={[styles.input, styles.smsInput]} value={bindSms} onChangeText={setBindSms} placeholder="请输入验证码" placeholderTextColor={LoginColors.inputPlaceholder} keyboardType="number-pad" />
                      <SmsBtn countdown={bindSmsCountdown} phone={bindPhone} onPress={() => handleSendSms(bindPhone, setBindSmsCountdown)} />
                    </View>
                  </View>
                  <SubmitBtn onPress={handleBindPhone} disabled={bindingPhone} label={bindingPhone ? '绑定中...' : '绑定'} />
                </>
              )}
            </View>

            {/* Password change */}
            <View style={styles.subSection}>
              <Text style={styles.subTitle}>更改密码</Text>
              <View style={styles.field}>
                <Text style={styles.label}>新密码</Text>
                <View style={styles.inputWrapper}>
                  <TextInput style={[styles.input, styles.inputWithIcon]} value={newPassword} onChangeText={setNewPassword} placeholder="至少 8 位，包含字母和数字" placeholderTextColor={LoginColors.inputPlaceholder} secureTextEntry={!showNewPassword} />
                  <Pressable style={styles.eyeBtn} onPress={() => setShowNewPassword(!showNewPassword)}><Text style={styles.eyeIcon}>{showNewPassword ? '👁️' : '🙈'}</Text></Pressable>
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>确认密码</Text>
                <View style={styles.inputWrapper}>
                  <TextInput style={[styles.input, styles.inputWithIcon]} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="请再次输入" placeholderTextColor={LoginColors.inputPlaceholder} secureTextEntry={!showConfirmPassword} />
                  <Pressable style={styles.eyeBtn} onPress={() => setShowConfirmPassword(!showConfirmPassword)}><Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '🙈'}</Text></Pressable>
                </View>
              </View>
              <SubmitBtn onPress={handlePasswordSave} disabled={savingPassword} label={savingPassword ? '提交中...' : '修改密码'} />
            </View>
          </View>

          {/* ===== RIGHT: Binding ===== */}
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>{isHomeView ? '我的孩子' : '学校账号与家庭账号绑定'}</Text>

            {isHomeView ? (
              <>
                {homeChildren.length > 0 ? (
                  <View style={styles.childrenList}>
                    {homeChildren.map((child) => (
                      <View key={child.digital_id} style={styles.childCard}>
                        <View style={styles.resultGrid}>
                          <View style={styles.resultItem}><Text style={styles.resultLabel}>数字 ID</Text><Text style={styles.resultValue}>{child.digital_id}</Text></View>
                          <View style={[styles.resultItem, styles.resultItemLast]}><Text style={styles.resultLabel}>昵称</Text><Text style={styles.resultValue}>{child.nickname_label}</Text></View>
                          <View style={[styles.resultItem, styles.resultItemLast]}><Text style={styles.resultLabel}>绑定时间</Text><Text style={styles.resultValue}>{formatBoundAt(child.bound_at)}</Text></View>
                        </View>
                        <View style={styles.tagRow}>
                          <View style={[styles.tag, child.school_data_authorized ? styles.tagOk : styles.tagMuted]}>
                            <Text style={[styles.tagText, child.school_data_authorized ? styles.tagTextOk : styles.tagTextMuted]}>学校数据：{child.school_data_authorized ? '已授权' : '未授权'}</Text>
                          </View>
                          <View style={[styles.tag, child.home_data_authorized ? styles.tagOk : styles.tagMuted]}>
                            <Text style={[styles.tagText, child.home_data_authorized ? styles.tagTextOk : styles.tagTextMuted]}>家庭数据：{child.home_data_authorized ? '已授权' : '未授权'}</Text>
                          </View>
                        </View>
                        <View style={styles.inlineActions}>
                          <Pressable style={styles.inlineBtn} onPress={() => Alert.alert('提示', `查看 ${child.nickname_label} 的学习数据（即将开放）`)}>
                            <Text style={styles.inlineBtnText}>查看学习数据</Text>
                          </Pressable>
                          <Pressable style={styles.inlineBtn} onPress={() => handleUnbindStudent(child)} disabled={unbindingId === child.digital_id}>
                            <Text style={[styles.inlineBtnText, styles.unbindText]}>{unbindingId === child.digital_id ? '解除中...' : '解除绑定'}</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.hint}>尚未绑定孩子，可在下方输入学生数字 ID 进行绑定。</Text>
                )}

                <View style={styles.subSection}>
                  <Text style={styles.subTitle}>绑定新的学生 ID</Text>
                  <View style={styles.field}>
                    <Text style={styles.label}>手机号</Text>
                    <TextInput style={styles.input} value={bindPanelPhone} onChangeText={setBindPanelPhone} placeholder="请输入家庭账号手机号" placeholderTextColor={LoginColors.inputPlaceholder} keyboardType="phone-pad" />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>验证码</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput style={[styles.input, styles.smsInput]} value={bindPanelSms} onChangeText={setBindPanelSms} placeholder="请输入验证码" placeholderTextColor={LoginColors.inputPlaceholder} keyboardType="number-pad" />
                      <SmsBtn countdown={bindPanelSmsCountdown} phone={bindPanelPhone} onPress={() => handleSendSms(bindPanelPhone, setBindPanelSmsCountdown)} />
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>学校数字编号</Text>
                    <TextInput style={styles.input} value={bindDigitalId} onChangeText={(t) => setBindDigitalId(t.replace(/\D/g, ''))} placeholder="请输入学校数字编号" placeholderTextColor={LoginColors.inputPlaceholder} keyboardType="number-pad" />
                  </View>
                  <SubmitBtn onPress={handlePreviewBind} disabled={bindingStudent} label={bindingStudent ? '查询中...' : '绑定新的学生 ID'} />
                </View>
              </>
            ) : null}

            {isStudentView && studentProfile ? (
              studentProfile.has_home_binding ? (
                <View style={styles.tagRow}>
                  <View style={[styles.tag, studentProfile.school_data_authorized ? styles.tagOk : styles.tagMuted]}>
                    <Text style={[styles.tagText, studentProfile.school_data_authorized ? styles.tagTextOk : styles.tagTextMuted]}>学校数据授权：{studentProfile.school_data_authorized ? '已授权' : '未授权'}</Text>
                  </View>
                  <View style={[styles.tag, studentProfile.home_data_authorized ? styles.tagOk : styles.tagMuted]}>
                    <Text style={[styles.tagText, studentProfile.home_data_authorized ? styles.tagTextOk : styles.tagTextMuted]}>家庭数据授权：{studentProfile.home_data_authorized ? '已授权' : '未授权'}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.hint}>尚未绑定家庭账号。请家长在家庭个人账号登录后，输入您的学校数字编号完成绑定。</Text>
              )
            ) : null}

            <View style={styles.infoBoxBlue}>
              <Text style={styles.infoBoxBlueText}>绑定后默认互相绑定，学校和家长都可以查看该学生的全部学习记录。</Text>
            </View>
          </View>
        </View> : null}

        <View style={[styles.panel, styles.dangerPanel]}>
          <Text style={styles.sectionTitle}>删除账号</Text>
          <Text style={styles.dangerHint}>永久删除账号、个人资料和学习记录。此操作无法撤销。</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="永久删除账号"
            style={[styles.deleteBtn, isDeleting && styles.disabled]}
            onPress={handleDeleteAccount}
            disabled={isDeleting}
          >
            {isDeleting ? <ActivityIndicator color={LoginColors.white} size="small" /> : <Text style={styles.deleteBtnText}>永久删除账号</Text>}
          </Pressable>
        </View>
      </ScrollView>

      <BindConfirmModal visible={bindPreviewOpen} preview={bindPreview} loading={bindingStudent} onCancel={() => { if (!bindingStudent) { setBindPreviewOpen(false); setBindPreview(null); } }} onConfirm={() => void handleConfirmBindStudent()} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: LoginColors.skyBg },
  bg: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 48 },
  loadingContainer: { flex: 1, backgroundColor: LoginColors.skyBg, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 16, fontWeight: '700', color: LoginColors.text },
  skeletonBlock: { borderRadius: 999, backgroundColor: 'rgba(226, 232, 240, 0.86)' },
  skeletonHeaderTitle: { width: 148, height: 28 },
  skeletonHeaderBtn: { width: 92, height: 38 },
  skeletonSectionTitle: { width: 132, height: 22, marginBottom: 24 },
  skeletonField: { marginBottom: LoginSizes.fieldMarginBottom },
  skeletonLabel: { width: 64, height: 14, marginBottom: LoginSizes.labelMarginBottom },
  skeletonInput: { height: LoginSizes.inputHeight, borderRadius: LoginSizes.inputBorderRadius },
  skeletonButton: { width: 118, height: 42, marginTop: 4 },

  /* ── Header (web .account-profile-topbar) ── */
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: LoginWeights.extraBold, color: LoginColors.text, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 10 },
  headerBtn: { paddingHorizontal: LoginSizes.headerBtnPaddingH, paddingVertical: LoginSizes.headerBtnPaddingV, borderRadius: LoginSizes.headerBtnBorderRadius, backgroundColor: LoginColors.secondaryBg, borderWidth: 1.5, borderColor: LoginColors.secondaryBorder },
  headerBtnText: { fontSize: LoginSizes.headerBtnFontSize, fontWeight: LoginWeights.extraBold, color: LoginColors.secondaryText },
  logoutBtn: { backgroundColor: LoginColors.orange },
  logoutBtnText: { fontSize: LoginSizes.headerBtnFontSize, fontWeight: LoginWeights.extraBold, color: LoginColors.white },

  /* ── Profile grid (web .account-profile-grid) ── */
  profileGrid: { gap: 24 },

  /* ── Panel (web .account-profile-panel) ── */
  panel: { backgroundColor: LoginColors.panelBg, borderWidth: 1, borderColor: LoginColors.panelBorder, borderRadius: LoginSizes.panelBorderRadius, padding: 24 },
  sectionTitle: { fontSize: LoginSizes.sectionTitleFontSize, fontWeight: LoginWeights.extraBold, color: LoginColors.text, marginBottom: 16 },
  subSection: { marginTop: LoginSizes.sectionDividerMargin, paddingTop: LoginSizes.sectionDividerPadding, borderTopWidth: 1, borderTopColor: LoginColors.line, borderStyle: 'solid' },
  subTitle: { fontSize: LoginSizes.subsectionTitleFontSize, fontWeight: LoginWeights.extraBold, color: LoginColors.text, marginBottom: 16 },

  /* ── Fields ── */
  field: { marginBottom: LoginSizes.fieldMarginBottom },
  label: { fontSize: LoginSizes.labelFontSize, fontWeight: LoginWeights.bold, color: LoginColors.textLabel, marginBottom: LoginSizes.labelMarginBottom, textAlign: 'left' },
  input: { height: LoginSizes.inputHeight, borderWidth: LoginSizes.inputBorderWidth, borderColor: LoginColors.inputBorder, borderRadius: LoginSizes.inputBorderRadius, paddingVertical: LoginSizes.inputPaddingV, paddingHorizontal: LoginSizes.inputPaddingH, fontSize: LoginSizes.inputFontSize, fontWeight: '500', color: LoginColors.inputText, backgroundColor: LoginColors.inputBg },
  inputFlex: { flex: 1, minWidth: 0 },
  inputWithIcon: { paddingRight: 44 },
  smsInput: { paddingRight: 100 },
  inputWrapper: { position: 'relative' },
  fieldInline: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  readonlyField: { height: LoginSizes.inputHeight, borderWidth: LoginSizes.inputBorderWidth, borderColor: LoginColors.line, borderRadius: LoginSizes.inputBorderRadius, paddingHorizontal: LoginSizes.inputPaddingH, justifyContent: 'center', backgroundColor: LoginColors.inputReadonlyBg },
  readonlyText: { fontSize: LoginSizes.inputFontSize, color: LoginColors.inputReadonlyText, fontWeight: '600' },
  hint: { fontSize: LoginSizes.captionFontSize, color: LoginColors.textMuted, fontWeight: '500', marginTop: 10, lineHeight: 19 },
  eyeBtn: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  eyeIcon: { fontSize: 18, color: LoginColors.inputPlaceholder },

  /* ── SMS button ── */
  smsBtn: { position: 'absolute', right: 4, top: 4, bottom: 4, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, borderRadius: 11, backgroundColor: LoginColors.primaryStart },
  smsBtnDisabled: { backgroundColor: LoginColors.inputPlaceholder },
  smsBtnText: { fontSize: LoginSizes.captionFontSize, fontWeight: LoginWeights.extraBold, color: LoginColors.white },

  /* ── Submit (web .account-btn-primary) ── */
  submitBtn: { borderRadius: LoginSizes.btnBorderRadius, backgroundColor: LoginColors.primaryEnd, paddingVertical: LoginSizes.btnPaddingV, paddingHorizontal: LoginSizes.btnPaddingH, alignItems: 'center', justifyContent: 'center', minWidth: 140, shadowColor: LoginColors.primaryShadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 20, elevation: 6, marginTop: 4, alignSelf: 'flex-start' },
  submitText: { fontSize: LoginSizes.btnFontSize, fontWeight: LoginWeights.extraBold, color: LoginColors.white },
  disabled: { opacity: 0.55 },

  /* ── Children list ── */
  childrenList: { gap: 16, marginBottom: 8 },
  childCard: { padding: 16, borderWidth: 1, borderColor: LoginColors.line, borderRadius: 16, backgroundColor: LoginColors.white },

  /* ── Result grid (web .account-result-grid) ── */
  resultGrid: { backgroundColor: LoginColors.inputBg, borderRadius: 20, padding: 24, borderWidth: 1.5, borderColor: LoginColors.line },
  resultItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: LoginColors.secondaryBorder, borderStyle: 'solid' },
  resultItemLast: { borderBottomWidth: 0 },
  resultLabel: { fontSize: LoginSizes.subtitleFontSize, color: LoginColors.textMuted, fontWeight: LoginWeights.bold },
  resultValue: { fontSize: 18, color: LoginColors.text, fontWeight: LoginWeights.extraBold },

  /* ── Tags (web .account-tag) ── */
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag: { paddingVertical: LoginSizes.tagPaddingV, paddingHorizontal: LoginSizes.tagPaddingH, borderRadius: LoginSizes.tagRadius },
  tagOk: { backgroundColor: LoginColors.tagOkBg },
  tagMuted: { backgroundColor: LoginColors.tagMutedBg },
  tagText: { fontSize: LoginSizes.tagFontSize, fontWeight: LoginWeights.extraBold },
  tagTextOk: { color: LoginColors.tagOkText },
  tagTextMuted: { color: LoginColors.tagMutedText },

  /* ── Inline actions (web .account-inline-actions) ── */
  inlineActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  inlineBtn: { borderWidth: 0, backgroundColor: 'transparent', paddingVertical: 4, paddingHorizontal: 8 },
  inlineBtnText: { fontSize: LoginSizes.noteFontSize, fontWeight: LoginWeights.bold, color: LoginColors.blueSchool },
  unbindText: { color: LoginColors.errorText },
  dangerPanel: { marginTop: 24, borderColor: LoginColors.errorText },
  dangerHint: { fontSize: LoginSizes.captionFontSize, color: LoginColors.textMuted, lineHeight: 20, marginBottom: 16 },
  deleteBtn: { minHeight: 44, borderRadius: LoginSizes.btnBorderRadius, backgroundColor: LoginColors.errorText, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  deleteBtnText: { color: LoginColors.white, fontWeight: LoginWeights.extraBold },

  /* ── Info box blue (web .account-info-box-blue) ── */
  infoBoxBlue: { backgroundColor: LoginColors.infoBlueBg, borderWidth: 1, borderColor: LoginColors.infoBlueBorder, borderRadius: LoginSizes.infoBoxRadius, paddingVertical: LoginSizes.infoBoxPaddingV, paddingHorizontal: LoginSizes.infoBoxPaddingH, marginTop: 20 },
  infoBoxBlueText: { fontSize: LoginSizes.captionFontSize, color: LoginColors.infoBlueText, lineHeight: 19 },
});
