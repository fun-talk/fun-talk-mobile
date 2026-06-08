import { useCallback, useEffect, useRef, useState } from 'react';
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
import { readRememberMePreference, writeRememberMePreference } from '@/lib/auth/preferences';
import { getApiHost } from '@/lib/env';

import { useAuth } from '../AuthProvider';
import { loginImages } from '../assets/loginAssets';
import { useWechatQrLogin } from '../hooks/useWechatQrLogin';
import type { FtAuthRecord } from '@/lib/auth/types';
import {
  LoginError,
  loginWithFrontpage,
  loginWithWechatCode,
  checkSession,
} from '../services/login';
import { requestWechatAuthCode } from '../services/wechatNative';
import { LoginColors } from './LoginConstants';
import { LandingView } from './LandingView';
import { LoginView } from './LoginView';
import { WechatModal } from './WechatModal';

type ViewMode = 'landing' | 'login';
type LoginTab = 'personal' | 'school';

const COURSES_ROUTE = '/(app)/courses' as Href;

export function LoginScreen() {
  const router = useRouter();
  const { apiClient, saveAuth } = useAuth();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const shortestSide = Math.min(windowWidth, windowHeight);

  // Treat only true tablet/desktop layouts as desktop so landscape phones keep the compact mobile card.
  const isDesktopLayout = shortestSide >= 760;
  const logoHeight = isDesktopLayout
    ? Math.min(56, Math.max(36, windowWidth * 0.04))
    : 34;
  const logoLeft = isDesktopLayout ? 28 : 18;
  const logoTop = isDesktopLayout ? 56 - logoHeight / 2 : 40;

  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [activeTab, setActiveTab] = useState<LoginTab>('personal');
  const [rememberMe, setRememberMe] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wechatModalVisible, setWechatModalVisible] = useState(false);

  // Keep rememberMe in a ref so finishLogin closures don't go stale
  const rememberMeRef = useRef(rememberMe);
  rememberMeRef.current = rememberMe;

  useEffect(() => {
    void readRememberMePreference().then(setRememberMe);
  }, []);

  const handleRememberMeChange = useCallback(async (value: boolean) => {
    setRememberMe(value);
    await writeRememberMePreference(value);
  }, []);

  /* ---- Shared login finish handler ---- */
  const finishLogin = useCallback(
    async (action: () => Promise<void>) => {
      setIsSubmitting(true);
      setErrorMessage('');
      setStatusMessage('正在登录...');

      try {
        await action();
        setStatusMessage('登录成功，正在进入...');
        router.replace(COURSES_ROUTE);
      } catch (error) {
        const message =
          error instanceof LoginError ||
          error instanceof ApiRequestError ||
          error instanceof Error
            ? error.message
            : '登录失败，请稍后重试';
        if (error instanceof ApiRequestError) {
          setStatusMessage(`当前 API：${getApiHost()}`);
        } else {
          setStatusMessage('');
        }
        setErrorMessage(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [router],
  );

  /* ---- Landing View Handlers ---- */
  const handleReturningUser = useCallback(async () => {
    try {
      await checkSession(apiClient, null);
      router.replace(COURSES_ROUTE);
    } catch {
      setViewMode('login');
      setErrorMessage('登录已过期，请重新登录');
    }
  }, [apiClient, router]);

  const handleNewUser = useCallback(() => {
    setActiveTab('personal');
    setViewMode('login');
    setErrorMessage('');
    setStatusMessage('');
  }, []);

  /* ---- Login View Handlers ---- */
  const handleHomePress = useCallback(() => {
    setViewMode('landing');
    setErrorMessage('');
    setStatusMessage('');
  }, []);

  const handlePersonalSubmit = useCallback(
    (phone: string, password: string) => {
      const trimmedPhone = phone.trim();
      const trimmedPassword = password.trim();
      if (!trimmedPhone || !trimmedPassword) {
        setErrorMessage('请输入手机号和密码');
        return;
      }

      void finishLogin(async () => {
        const auth = await loginWithFrontpage(apiClient, {
          mode: 'personal',
          rememberMe: rememberMeRef.current,
          payload: {
            phone: trimmedPhone,
            name: trimmedPassword,
          },
        });
        await saveAuth(auth);
      });
    },
    [apiClient, saveAuth, finishLogin],
  );

  const handleSchoolSubmit = useCallback(
    (school: string, className: string, studentName: string, schoolCode: string) => {
      const s = school.trim();
      const c = className.trim();
      const n = studentName.trim();
      const code = schoolCode.trim();
      if (!s || !c || !n || !code) {
        setErrorMessage('请完整填写学校、班级、姓名和密码');
        return;
      }

      void finishLogin(async () => {
        const auth = await loginWithFrontpage(apiClient, {
          mode: 'school',
          rememberMe: rememberMeRef.current,
          payload: {
            school: s,
            class_name: c,
            student_name: n,
            school_code: code,
          },
        });
        await saveAuth(auth);
      });
    },
    [apiClient, saveAuth, finishLogin],
  );

  const handleWechatLoginPress = useCallback(() => {
    setWechatModalVisible(true);
  }, []);

  const handleWechatLogin = useCallback(() => {
    setWechatModalVisible(false);

    void finishLogin(async () => {
      const code = await requestWechatAuthCode();
      const auth = await loginWithWechatCode(apiClient, code, rememberMeRef.current);
      await saveAuth(auth);
    });
  }, [apiClient, saveAuth, finishLogin]);

  /* ---- QR scan login callbacks ---- */
  const handleQrLoginSuccess = useCallback(
    async (auth: FtAuthRecord) => {
      await saveAuth(auth);
      setStatusMessage('扫码登录成功，正在进入...');
      setErrorMessage('');
      router.replace(COURSES_ROUTE);
    },
    [saveAuth, router],
  );

  const handleQrLoginError = useCallback((error: string) => {
    setErrorMessage(error);
  }, []);

  const qrLogin = useWechatQrLogin(apiClient, {
    rememberMe,
    onLoginSuccess: handleQrLoginSuccess,
    onLoginError: handleQrLoginError,
  });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.page}>
        {/* Background image layer */}
        <Image
          source={loginImages.background}
          style={styles.backgroundImage}
          contentFit="cover"
        />

        {/* Scrollable scene (matches web mobile: page overflow:auto, scene position:relative, min-height:100vh) */}
        <ScrollView
          style={styles.sceneScroll}
          contentContainerStyle={styles.sceneContent}
          bounces={false}
          keyboardShouldPersistTaps="handled">
          <View style={[styles.scene, { minHeight: windowHeight }]}>
            {/* Logo — absolute within scene, matches web .brand */}
            <Image
              source={loginImages.logo}
              style={[
                styles.logoBase,
                {
                  left: logoLeft,
                  top: logoTop,
                  height: logoHeight,
                  // Estimate width from logo aspect ratio (~3.2:1)
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
                statusMessage={statusMessage}
                errorMessage={errorMessage}
                rememberMe={rememberMe}
                onRememberMeChange={handleRememberMeChange}
                onWechatLoginPress={handleWechatLoginPress}
                onPersonalSubmit={handlePersonalSubmit}
                onSchoolSubmit={handleSchoolSubmit}
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
    ...StyleSheet.absoluteFill,
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
