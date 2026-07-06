import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';

import type { AgreementType } from '../data/agreements';

import { ApiRequestError } from '@/lib/api/client';
import { buildFtAuthFromStudentLogin, buildFtAuthFromHomeLogin } from '@/lib/auth/session';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

import { useAuth } from '../AuthProvider';
import { loginImages } from '../assets/loginAssets';
import { LoginError } from '../services/login';
import {
  loginHomePhone,
  loginStudent,
  requestStudentPasswordReset,
  sendAccountSmsCode,
  type HomePhoneLoginMethod,
} from '../services/accountApi';
import { LoginColors } from './LoginConstants';
import { LoginView } from './LoginView';
import { ForgotPasswordModal } from './ForgotPasswordModal';

type LoginTab = 'home' | 'school';

const COURSES_ROUTE = '/(app)/courses' as Href;
const SMS_COOLDOWN = 60;

export function LoginScreen() {
  const router = useRouter();
  const { apiClient, saveAuth } = useAuth();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const shortestSide = Math.min(windowWidth, windowHeight);

  const isDesktopLayout = shortestSide >= 760;
  const logoHeight = isDesktopLayout
    ? Math.min(56, Math.max(36, windowWidth * 0.04))
    : 34;
  const logoLeft = isDesktopLayout ? 28 : 18;
  const logoTop = isDesktopLayout ? 56 - logoHeight / 2 : 40;

  const [activeTab, setActiveTab] = useState<LoginTab>('school');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [smsCountdown, setSmsCountdown] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // When the virtual keyboard opens on a tablet/phone, we add bottom padding to
  // the scroll content and scroll down so that the focused password field stays
  // visible above the keyboard. KeyboardAvoidingView alone is not reliable on
  // Android tablets with adjustResize, so we drive the scroll manually.
  const scrollForKeyboard = useCallback(
    (height: number) => {
      if (!scrollViewRef.current || height <= 0) return;
      // Scroll the login card up by a bit more than half the keyboard height.
      // This heuristic keeps the password input near the middle of the visible
      // area above the keyboard on both phones and tablets.
      const targetY = Math.round(height * 0.55);
      scrollViewRef.current.scrollTo({ y: targetY, animated: true });
    },
    [],
  );

  const handlePasswordFocus = useCallback(() => {
    scrollForKeyboard(keyboardHeight);
  }, [keyboardHeight, scrollForKeyboard]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const height = event.endCoordinates.height;
      setKeyboardHeight(height);
      scrollForKeyboard(height);
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

  // SMS countdown timer
  useEffect(() => {
    if (smsCountdown <= 0) return;
    const timer = setTimeout(() => setSmsCountdown((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [smsCountdown]);

  /* ---- Shared login finish handler ---- */
  const finishLogin = useCallback(
    async (action: () => Promise<void>) => {
      setIsSubmitting(true);

      try {
        await action();
        showSuccessToast('登录成功，正在进入...');
        router.replace(COURSES_ROUTE);
      } catch (error) {
        const message =
          error instanceof LoginError ||
          error instanceof ApiRequestError ||
          error instanceof Error
            ? error.message
            : '登录失败，请稍后重试';
        showErrorToast(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [router],
  );

  /* ---- Agreement guard ---- */
  const requireAgreement = useCallback((): boolean => {
    if (!agreed) {
      showErrorToast('请先阅读并同意相关协议');
      return false;
    }
    return true;
  }, [agreed]);

  /* ---- SMS ---- */
  const handleSendSms = useCallback(
    async (phone: string) => {
      try {
        const result = await sendAccountSmsCode(apiClient, phone);
        setSmsCountdown(result.expires_in || SMS_COOLDOWN);
      } catch (err) {
        showErrorToast(err instanceof Error ? err.message : '发送验证码失败');
      }
    },
    [apiClient],
  );

  /* ---- Family / Home login ---- */
  const handlePersonalSubmit = useCallback(
    (phone: string, credential: string, mode: HomePhoneLoginMethod) => {
      if (!phone) {
        showErrorToast('请输入手机号');
        return;
      }
      if (!credential) {
        showErrorToast(mode === 'sms' ? '请输入验证码' : '请输入密码');
        return;
      }
      if (!requireAgreement()) return;

      void finishLogin(async () => {
        const result = await loginHomePhone(apiClient, {
          phone,
          login_method: mode,
          ...(mode === 'sms' ? { sms_code: credential } : { password: credential }),
        });
        const auth = buildFtAuthFromHomeLogin(
          result.token,
          result.expires_in,
          phone,
          '',
          true,
        );
        await saveAuth(auth);
      });
    },
    [apiClient, saveAuth, finishLogin, requireAgreement],
  );

  /* ---- School / Student login ---- */
  const handleSchoolSubmit = useCallback(
    (digitalId: string, password: string) => {
      if (!digitalId) {
        showErrorToast('请输入数字编号');
        return;
      }
      if (!password) {
        showErrorToast('请输入密码');
        return;
      }
      if (!requireAgreement()) return;

      void finishLogin(async () => {
        const result = await loginStudent(apiClient, {
          digital_id: digitalId,
          password,
        });
        const auth = buildFtAuthFromStudentLogin(
          result.token,
          result.expires_in,
          result.student.digital_id,
          true,
        );
        await saveAuth(auth);
      });
    },
    [apiClient, saveAuth, finishLogin, requireAgreement],
  );

  /* ---- Forgot Password ---- */
  const handleForgotPassword = useCallback(() => {
    setForgotModalVisible(true);
  }, []);

  const handleAgreementPress = useCallback(
    (type: AgreementType) => {
      router.push(`/(auth)/agreement?type=${type}` as Href);
    },
    [router],
  );

  const handleForgotSubmit = useCallback(
    async (digitalId: string): Promise<{ message: string }> => {
      const result = await requestStudentPasswordReset(apiClient, digitalId);
      return { message: result.message };
    },
    [apiClient],
  );

  return (
    <View style={styles.root}>
      {/* Background image layer */}
      <Image
        source={loginImages.background}
        style={styles.backgroundImage}
        contentFit="cover"
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.sceneScroll}
        contentContainerStyle={[
          styles.sceneContent,
          keyboardHeight > 0 && { paddingBottom: keyboardHeight },
        ]}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={[styles.scene, { minHeight: windowHeight }]}>
            {/* Logo */}
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

            <Pressable
              style={styles.teacherAuthButton}
              onPress={() => router.push('/(auth)/teacher-auth' as Href)}
              disabled={isSubmitting}
            >
              <Text style={styles.teacherAuthButtonText}>老师注册 / 登录</Text>
            </Pressable>

            <LoginView
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isDesktopLayout={isDesktopLayout}
              isSubmitting={isSubmitting}
              agreed={agreed}
              onAgreementChange={setAgreed}
              onAgreementPress={handleAgreementPress}
              smsCountdown={smsCountdown}
              onSendSms={handleSendSms}
              onPersonalSubmit={handlePersonalSubmit}
              onSchoolSubmit={handleSchoolSubmit}
              onForgotPassword={handleForgotPassword}
              keyboardHeight={keyboardHeight}
              onPasswordFocus={handlePasswordFocus}
            />
          </View>
        </ScrollView>

      <ForgotPasswordModal
        visible={forgotModalVisible}
        onClose={() => setForgotModalVisible(false)}
        onSubmit={handleForgotSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LoginColors.skyBg,
  },
  backgroundImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  sceneScroll: {
    flex: 1,
  },
  sceneContent: {
    flexGrow: 1,
  },
  scene: {
    position: 'relative',
    width: '100%',
  },
  logoBase: {
    position: 'absolute',
    zIndex: 5,
  },
  teacherAuthButton: {
    position: 'absolute',
    right: 24,
    top: 36,
    zIndex: 6,
    backgroundColor: LoginColors.secondaryBg,
    borderWidth: 1,
    borderColor: LoginColors.secondaryBorder,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  teacherAuthButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: LoginColors.secondaryText,
  },
});
