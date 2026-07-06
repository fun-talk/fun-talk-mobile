import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';

import { buildFtAuthFromTeacherLogin } from '@/lib/auth/session';
import { resolveTeacherHomeRoute } from '@/lib/auth/accountRoutes';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

import { useAuth } from '../AuthProvider';
import { loginImages } from '../assets/loginAssets';
import type { AgreementType } from '../data/agreements';
import { loginTeacher, registerTeacher, sendAccountSmsCode } from '../services/accountApi';
import { validatePasswordPair } from '../passwordPolicy';
import { AccountAgreement } from './AccountAgreement';
import { LoginColors, LoginSizes, LoginWeights } from './LoginConstants';

type AuthMode = 'login' | 'register';
type LoginMethod = 'password' | 'sms';

const SMS_COOLDOWN = 60;

export function TeacherAuthScreen() {
  const router = useRouter();
  const { apiClient, saveAuth } = useAuth();
  const { width, height } = useWindowDimensions();
  const isWide = Math.min(width, height) >= 760;
  const logoHeight = isWide
    ? Math.min(56, Math.max(36, width * 0.04))
    : 34;
  const logoLeft = isWide ? 28 : 18;
  const logoTop = isWide ? 56 - logoHeight / 2 : 40;

  const [mode, setMode] = useState<AuthMode>('login');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [smsCountdown, setSmsCountdown] = useState(0);

  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // When the virtual keyboard opens on a tablet/phone, we add bottom padding to
  // the scroll content and scroll down so that the focused password field stays
  // visible above the keyboard.
  const scrollForKeyboard = useCallback(
    (openHeight: number) => {
      if (!scrollViewRef.current || openHeight <= 0) return;
      const targetY = Math.round(openHeight * 0.55);
      scrollViewRef.current.scrollTo({ y: targetY, animated: true });
    },
    [],
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const openHeight = event.endCoordinates.height;
      setKeyboardHeight(openHeight);
      scrollForKeyboard(openHeight);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scrollForKeyboard]);

  const handlePasswordFocus = useCallback(() => {
    scrollForKeyboard(keyboardHeight);
  }, [keyboardHeight, scrollForKeyboard]);

  useEffect(() => {
    if (smsCountdown <= 0) return undefined;
    const timer = setTimeout(() => setSmsCountdown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [smsCountdown]);

  const requireAgreement = useCallback(() => {
    if (!agreed) {
      showErrorToast('请先勾选同意用户协议和隐私协议');
      return false;
    }
    return true;
  }, [agreed]);

  const handleSendSms = useCallback(async () => {
    if (!phone.trim()) {
      showErrorToast('请输入手机号');
      return;
    }
    try {
      const result = await sendAccountSmsCode(apiClient, phone.trim());
      setSmsCountdown(result.expires_in || SMS_COOLDOWN);
      if (result.debug_code) setSmsCode(result.debug_code);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : '发送验证码失败');
    }
  }, [apiClient, phone]);

  const finishTeacherAuth = useCallback(
    async (action: () => Promise<Awaited<ReturnType<typeof loginTeacher>>>) => {
      setSubmitting(true);
      try {
        const result = await action();
        const auth = buildFtAuthFromTeacherLogin(result.token, result.expires_in, result.teacher, true);
        await saveAuth(auth);
        showSuccessToast(mode === 'register' ? '注册成功，正在进入后台...' : '登录成功，正在进入后台...');
        router.replace(resolveTeacherHomeRoute(auth) as Href);
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : '操作失败');
      } finally {
        setSubmitting(false);
      }
    },
    [mode, router, saveAuth],
  );

  const handleLogin = useCallback(() => {
    if (!phone.trim()) {
      showErrorToast('请输入手机号');
      return;
    }
    if (loginMethod === 'sms' && !smsCode.trim()) {
      showErrorToast('请输入验证码');
      return;
    }
    if (loginMethod === 'password' && !password) {
      showErrorToast('请输入密码');
      return;
    }
    if (!requireAgreement()) return;

    void finishTeacherAuth(() =>
      loginTeacher(apiClient, {
        phone: phone.trim(),
        login_method: loginMethod,
        ...(loginMethod === 'sms' ? { sms_code: smsCode.trim() } : { password }),
      }),
    );
  }, [apiClient, finishTeacherAuth, loginMethod, password, phone, requireAgreement, smsCode]);

  const handleRegister = useCallback(() => {
    if (!phone.trim()) {
      showErrorToast('请输入手机号');
      return;
    }
    if (!schoolName.trim()) {
      showErrorToast('请输入学校名');
      return;
    }
    if (!smsCode.trim()) {
      showErrorToast('请输入验证码');
      return;
    }
    const passwordError = validatePasswordPair(password, confirmPassword);
    if (passwordError) {
      showErrorToast(passwordError);
      return;
    }
    if (!requireAgreement()) return;

    void finishTeacherAuth(() =>
      registerTeacher(apiClient, {
        phone: phone.trim(),
        sms_code: smsCode.trim(),
        password,
        confirm_password: confirmPassword,
        email: email.trim(),
        school_name: schoolName.trim(),
      }),
    );
  }, [
    apiClient,
    confirmPassword,
    email,
    finishTeacherAuth,
    password,
    phone,
    requireAgreement,
    schoolName,
    smsCode,
  ]);

  const toggleMode = () => {
    setMode((value) => (value === 'login' ? 'register' : 'login'));
    setPassword('');
    setConfirmPassword('');
  };

  const handleAgreementPress = useCallback(
    (type: AgreementType) => {
      router.push(`/(auth)/agreement?type=${type}` as Href);
    },
    [router],
  );

  return (
    <View style={styles.root}>
      <Image source={loginImages.background} style={styles.background} contentFit="cover" />
      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { minHeight: height },
          keyboardHeight > 0 && { paddingBottom: keyboardHeight },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Image
          source={loginImages.logo}
          style={[
            styles.logoBase,
            {
              left: logoLeft,
              top: logoTop,
              height: logoHeight,
              width: logoHeight * 3.2,
            },
          ]}
          contentFit="contain"
        />

        <Pressable style={styles.topbarButton} onPress={toggleMode} disabled={submitting}>
          <Text style={styles.topbarButtonText}>{mode === 'login' ? '没有账号，去注册' : '已有账号，去登录'}</Text>
        </Pressable>

        <View
          style={[
            styles.card,
            isWide && styles.cardWide,
            keyboardHeight > 0 &&
              !isWide && {
                marginTop: Math.max(12, 80 - keyboardHeight * 0.35),
                marginBottom: Math.min(keyboardHeight * 0.2, 60),
              },
          ]}
        >
          <Text style={styles.title}>{mode === 'register' ? '老师注册' : '老师登录'}</Text>

          <Field label="手机号">
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="请输入手机号"
              placeholderTextColor={LoginColors.inputPlaceholder}
              keyboardType="phone-pad"
              editable={!submitting}
            />
          </Field>

          {mode === 'login' ? (
            <View style={styles.methodTabs}>
              <Pressable
                style={[styles.methodTab, loginMethod === 'sms' && styles.methodTabActive]}
                onPress={() => setLoginMethod('sms')}
                disabled={submitting}
              >
                <Text style={[styles.methodTabText, loginMethod === 'sms' && styles.methodTabTextActive]}>
                  验证码登录
                </Text>
              </Pressable>
              <Pressable
                style={[styles.methodTab, loginMethod === 'password' && styles.methodTabActive]}
                onPress={() => setLoginMethod('password')}
                disabled={submitting}
              >
                <Text style={[styles.methodTabText, loginMethod === 'password' && styles.methodTabTextActive]}>
                  密码登录
                </Text>
              </Pressable>
            </View>
          ) : null}

          {mode === 'register' ? (
            <>
              <Field label="学校名">
                <TextInput
                  style={styles.input}
                  value={schoolName}
                  onChangeText={setSchoolName}
                  placeholder="请输入学校名"
                  placeholderTextColor={LoginColors.inputPlaceholder}
                  editable={!submitting}
                />
              </Field>
              <Field label="邮箱（可选）">
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="用于找回密码"
                  placeholderTextColor={LoginColors.inputPlaceholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!submitting}
                />
              </Field>
            </>
          ) : null}

          {(mode === 'register' || loginMethod === 'sms') ? (
            <Field label="验证码">
              <View style={styles.inputWrap}>
                <TextInput
                  style={[styles.input, styles.smsInput]}
                  value={smsCode}
                  onChangeText={setSmsCode}
                  placeholder="请输入验证码"
                  placeholderTextColor={LoginColors.inputPlaceholder}
                  keyboardType="number-pad"
                  editable={!submitting}
                />
                <Pressable
                  style={[styles.smsButton, (smsCountdown > 0 || !phone.trim()) && styles.smsButtonDisabled]}
                  onPress={handleSendSms}
                  disabled={submitting || smsCountdown > 0 || !phone.trim()}
                >
                  <Text style={styles.smsButtonText}>{smsCountdown > 0 ? `${smsCountdown}s` : '获取验证码'}</Text>
                </Pressable>
              </View>
            </Field>
          ) : null}

          {(mode === 'register' || loginMethod === 'password') ? (
            <Field label={mode === 'register' ? '登录密码' : '密码'}>
              <PasswordInput
                value={password}
                onChangeText={setPassword}
                placeholder="至少 8 位，包含字母和数字"
                showPassword={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                editable={!submitting}
                onFocus={handlePasswordFocus}
              />
            </Field>
          ) : null}

          {mode === 'register' ? (
            <Field label="确认密码">
              <PasswordInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="请再次输入密码"
                showPassword={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((value) => !value)}
                editable={!submitting}
                onFocus={handlePasswordFocus}
              />
            </Field>
          ) : null}

          <AccountAgreement
            checked={agreed}
            onChange={setAgreed}
            onAgreementPress={handleAgreementPress}
            disabled={submitting}
          />

          <Pressable
            style={[styles.submitButton, submitting && styles.disabled]}
            onPress={mode === 'register' ? handleRegister : handleLogin}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={LoginColors.white} />
            ) : (
              <Text style={styles.submitText}>{mode === 'register' ? '注册并进入后台' : '登录'}</Text>
            )}
          </Pressable>

          <Pressable style={styles.backButton} onPress={() => router.replace('/(auth)/login' as Href)}>
            <Text style={styles.backButtonText}>返回学生登录</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
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

function PasswordInput({
  value,
  onChangeText,
  placeholder,
  showPassword,
  onToggle,
  editable,
  onFocus,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  showPassword: boolean;
  onToggle: () => void;
  editable: boolean;
  onFocus?: () => void;
}) {
  return (
    <View style={styles.inputWrap}>
      <TextInput
        style={[styles.input, styles.passwordInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        onFocus={onFocus}
        placeholderTextColor={LoginColors.inputPlaceholder}
        secureTextEntry={!showPassword}
        editable={editable}
      />
      <Pressable style={styles.eyeButton} onPress={onToggle} disabled={!editable} hitSlop={8}>
        <Text style={styles.eyeText}>{showPassword ? '隐藏' : '显示'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LoginColors.skyBg,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 36,
    alignItems: 'center',
  },
  logoBase: {
    position: 'absolute',
    zIndex: 5,
  },
  topbarButton: {
    position: 'absolute',
    right: 24,
    top: 36,
    zIndex: 6,
    backgroundColor: LoginColors.secondaryBg,
    borderWidth: 1,
    borderColor: LoginColors.secondaryBorder,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  topbarButtonText: {
    fontSize: 14,
    fontWeight: LoginWeights.bold,
    color: LoginColors.secondaryText,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    marginTop: 80,
    borderRadius: LoginSizes.cardBorderRadius,
    backgroundColor: LoginColors.cardBg,
    borderWidth: 1,
    borderColor: LoginColors.cardBorder,
    padding: 24,
    shadowColor: LoginColors.cardShadow,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 40,
    elevation: 8,
  },
  cardWide: {
    marginTop: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
    textAlign: 'center',
    marginBottom: 22,
  },
  methodTabs: {
    flexDirection: 'row',
    backgroundColor: LoginColors.tabContainerBg,
    borderRadius: 16,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  methodTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  methodTabActive: {
    backgroundColor: LoginColors.white,
  },
  methodTabText: {
    fontSize: 14,
    fontWeight: LoginWeights.bold,
    color: LoginColors.tabInactiveText,
  },
  methodTabTextActive: {
    color: LoginColors.text,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: LoginWeights.bold,
    color: LoginColors.textLabel,
    marginBottom: 6,
  },
  input: {
    height: LoginSizes.inputHeight,
    borderWidth: LoginSizes.inputBorderWidth,
    borderColor: LoginColors.inputBorder,
    borderRadius: LoginSizes.inputBorderRadius,
    paddingHorizontal: LoginSizes.inputPaddingH,
    fontSize: LoginSizes.inputFontSize,
    color: LoginColors.inputText,
    backgroundColor: LoginColors.inputBg,
  },
  inputWrap: {
    position: 'relative',
  },
  smsInput: {
    paddingRight: 112,
  },
  passwordInput: {
    paddingRight: 68,
  },
  smsButton: {
    position: 'absolute',
    right: 8,
    top: 6,
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  smsButtonDisabled: {
    opacity: 0.55,
  },
  smsButtonText: {
    fontSize: 13,
    fontWeight: LoginWeights.bold,
    color: LoginColors.infoBlueText,
  },
  eyeButton: {
    position: 'absolute',
    right: 10,
    top: 6,
    height: 32,
    justifyContent: 'center',
  },
  eyeText: {
    fontSize: 13,
    fontWeight: LoginWeights.bold,
    color: LoginColors.textMuted,
  },
  submitButton: {
    marginTop: 20,
    height: 46,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LoginColors.primaryStart,
  },
  disabled: {
    opacity: 0.65,
  },
  submitText: {
    color: LoginColors.white,
    fontSize: 16,
    fontWeight: LoginWeights.extraBold,
  },
  backButton: {
    alignSelf: 'center',
    marginTop: 16,
    padding: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: LoginWeights.bold,
    color: LoginColors.textMuted,
  },
});
