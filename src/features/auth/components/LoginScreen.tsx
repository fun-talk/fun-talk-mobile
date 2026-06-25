import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';

import { ApiRequestError } from '@/lib/api/client';
import { buildFtAuthFromStudentLogin, buildFtAuthFromHomeLogin } from '@/lib/auth/session';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

import { useAuth } from '../AuthProvider';
import { loginImages } from '../assets/loginAssets';
import { useWechatQrLogin } from '../hooks/useWechatQrLogin';
import type { FtAuthRecord } from '@/lib/auth/types';
import {
  LoginError,
  checkSession,
} from '../services/login';
import {
  loginHomePhone,
  loginHomeWechat,
  loginStudent,
  requestStudentPasswordReset,
  sendAccountSmsCode,
  type HomePhoneLoginMethod,
} from '../services/accountApi';
import { requestWechatAuthCode } from '../services/wechatNative';
import { LoginColors } from './LoginConstants';
import { LandingView } from './LandingView';
import { LoginView } from './LoginView';
import { WechatModal } from './WechatModal';
import { ForgotPasswordModal } from './ForgotPasswordModal';

type ViewMode = 'landing' | 'login';
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

  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [activeTab, setActiveTab] = useState<LoginTab>('home');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wechatModalVisible, setWechatModalVisible] = useState(false);
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [smsCountdown, setSmsCountdown] = useState(0);

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

  /* ---- Landing View Handlers ---- */
  const handleReturningUser = useCallback(async () => {
    try {
      await checkSession(apiClient, null);
      router.replace(COURSES_ROUTE);
    } catch {
      setViewMode('login');
      showErrorToast('登录已过期，请重新登录');
    }
  }, [apiClient, router]);

  const handleNewUser = useCallback(() => {
    setActiveTab('home');
    setViewMode('login');
  }, []);

  /* ---- Login View Handlers ---- */
  const handleHomePress = useCallback(() => {
    setViewMode('landing');
  }, []);

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

  /* ---- WeChat native login ---- */
  const handleWechatLoginPress = useCallback(() => {
    if (!requireAgreement()) return;
    setWechatModalVisible(true);
  }, [requireAgreement]);

  const handleWechatLogin = useCallback(() => {
    setWechatModalVisible(false);

    void finishLogin(async () => {
      const code = await requestWechatAuthCode();
      const result = await loginHomeWechat(apiClient, { wechat_openid: code });
      const auth = buildFtAuthFromHomeLogin(
        result.token,
        result.expires_in,
        '',
        code,
        true,
      );
      await saveAuth(auth);
    });
  }, [apiClient, saveAuth, finishLogin]);

  /* ---- Forgot Password ---- */
  const handleForgotPassword = useCallback(() => {
    setForgotModalVisible(true);
  }, []);

  const handleForgotSubmit = useCallback(
    async (digitalId: string): Promise<{ message: string }> => {
      const result = await requestStudentPasswordReset(apiClient, digitalId);
      return { message: result.message };
    },
    [apiClient],
  );

  /* ---- QR scan login callbacks ---- */
  const handleQrLoginSuccess = useCallback(
    async (auth: FtAuthRecord) => {
      await saveAuth(auth);
      showSuccessToast('扫码登录成功，正在进入...');
      router.replace(COURSES_ROUTE);
    },
    [saveAuth, router],
  );

  const handleQrLoginError = useCallback((error: string) => {
    showErrorToast(error);
  }, []);

  const qrLogin = useWechatQrLogin(apiClient, {
    rememberMe: true,
    onLoginSuccess: handleQrLoginSuccess,
    onLoginError: handleQrLoginError,
  });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.page}>
        {/* Background image layer */}
        <Image
          source={loginImages.background}
          style={styles.backgroundImage}
          contentFit="cover"
        />

        <ScrollView
          style={styles.sceneScroll}
          contentContainerStyle={styles.sceneContent}
          bounces={false}
          keyboardShouldPersistTaps="handled"
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

            {viewMode === 'landing' ? (
              <LandingView
                onReturningUser={handleReturningUser}
                onNewUser={handleNewUser}
                windowWidth={windowWidth}
                windowHeight={windowHeight}
                qrLogin={qrLogin}
              />
            ) : (
              <LoginView
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onHomePress={handleHomePress}
                isDesktopLayout={isDesktopLayout}
                isSubmitting={isSubmitting}
                agreed={agreed}
                onAgreementChange={setAgreed}
                smsCountdown={smsCountdown}
                onSendSms={handleSendSms}
                onWechatLoginPress={handleWechatLoginPress}
                onPersonalSubmit={handlePersonalSubmit}
                onSchoolSubmit={handleSchoolSubmit}
                onForgotPassword={handleForgotPassword}
              />
            )}
          </View>
        </ScrollView>
      </View>

      <WechatModal
        visible={wechatModalVisible}
        isSubmitting={isSubmitting}
        onClose={() => setWechatModalVisible(false)}
        onWechatLogin={handleWechatLogin}
      />

      <ForgotPasswordModal
        visible={forgotModalVisible}
        onClose={() => setForgotModalVisible(false)}
        onSubmit={handleForgotSubmit}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LoginColors.skyBg,
  },
  page: {
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
});
