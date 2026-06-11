import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';

import { useAuth } from '@/features/auth';
import { getApiHost, getWebBaseUrl } from '@/lib/env';
import { getDeviceID } from '@/lib/device/deviceId';
import { mergeAuthRecord } from '@/lib/auth/session';

import {
  buildLessonWebDestination,
  buildLessonWebUrl,
  isCourseHomeWebUrl,
  normalizeRouteParam,
  type LessonRouteParams,
} from '../buildLessonWebUrl';
import { syncWebViewAuthCookies } from '../syncWebViewCookies';
import { buildWebViewBootstrapScript } from '../webViewBootstrap';
import {
  parseWebViewBridgeMessage,
  resolveWebViewCourseProgressUpdate,
  resolveWebViewAuthUpdate,
} from '../webViewMessages';
import { writeCourseProgress } from '@/shared/courseHomeProgress';
import { writeCourseHomeFoxMove } from '@/shared/courseHomeFoxMove';

const COURSES_ROUTE = '/(app)/courses' as Href;
const LOGIN_ROUTE = '/(auth)/login' as Href;

export function LessonWebViewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<LessonRouteParams>();
  const { auth, saveAuth, logout } = useAuth();
  const webViewRef = useRef<WebView>(null);

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [webError, setWebError] = useState<string | null>(null);

  const webBaseUrl =
    normalizeRouteParam(params.web_base_url)?.trim() || getWebBaseUrl();
  const apiHost = getApiHost();
  const destinationPath = useMemo(() => buildLessonWebDestination(params), [params]);
  const lessonUrl = useMemo(
    () => buildLessonWebUrl(webBaseUrl, destinationPath),
    [destinationPath, webBaseUrl],
  );

  const bootstrapScript = useMemo(() => {
    if (!auth || !deviceId) {
      return 'true;';
    }
    return buildWebViewBootstrapScript({
      auth,
      deviceId,
      apiHost,
    });
  }, [apiHost, auth, deviceId]);

  useEffect(() => {
    void ScreenOrientation.unlockAsync();
    return () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!auth?.token) {
        if (!cancelled) {
          setSessionError('登录状态已失效，请重新登录');
          setIsSessionReady(false);
        }
        return;
      }

      try {
        const nextDeviceId = await getDeviceID();
        if (cancelled) {
          return;
        }
        setDeviceId(nextDeviceId);
        await syncWebViewAuthCookies(apiHost, auth);
        if (!cancelled) {
          setSessionError(null);
          setIsSessionReady(true);
        }
      } catch (error) {
        console.warn('prepare lesson webview session failed:', error);
        if (!cancelled) {
          setDeviceId((current) => current ?? '');
          setSessionError(null);
          setIsSessionReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiHost, auth]);

  const handleBridgeMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      const message = parseWebViewBridgeMessage(event.nativeEvent.data);
      if (!message) {
        return;
      }

      const update = resolveWebViewAuthUpdate(message, auth);
      if (update) {
        if (update.kind === 'logout') {
          await logout();
          router.replace(LOGIN_ROUTE);
          return;
        }

        if (update.kind === 'login') {
          await saveAuth(update.auth);
          return;
        }

        if (update.kind === 'update_user') {
          if (!auth) {
            return;
          }
          await saveAuth(mergeAuthRecord(auth, update.patch));
        }
        return;
      }

      const progressUpdate = resolveWebViewCourseProgressUpdate(message);
      if (!progressUpdate) {
        return;
      }

      await writeCourseProgress({
        completedCourseNumbers: progressUpdate.completedCourseNumbers,
        currentCourseNumber: progressUpdate.currentCourseNumber,
      });
      await writeCourseHomeFoxMove(
        {
          fromCourseNumber: progressUpdate.courseNumber,
          toCourseNumber: progressUpdate.currentCourseNumber,
        },
        progressUpdate.totalCourses,
      );
    },
    [auth, logout, router, saveAuth],
  );

  const handleNavigationChange = useCallback(
    (navigation: WebViewNavigation) => {
      if (isCourseHomeWebUrl(navigation.url)) {
        router.replace(COURSES_ROUTE);
      }
    },
    [router],
  );

  const handlePermissionRequest = useCallback(
    (event: {
      nativeEvent: {
        request: {
          grant: (resources: string[]) => void;
          resources: string[];
        };
      };
    }) => {
      event.nativeEvent.request.grant(event.nativeEvent.request.resources);
    },
    [],
  );

  const androidWebViewProps =
    Platform.OS === 'android'
      ? {
          onPermissionRequest: handlePermissionRequest,
          androidLayerType: 'hardware' as const,
        }
      : {};

  const handleExitLesson = useCallback(() => {
    router.replace(COURSES_ROUTE);
  }, [router]);

  if (!auth?.token) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>登录状态已失效，请重新登录</Text>
        <Pressable style={styles.button} onPress={() => router.replace(LOGIN_ROUTE)}>
          <Text style={styles.buttonText}>返回登录</Text>
        </Pressable>
      </View>
    );
  }

  if (sessionError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{sessionError}</Text>
        <Pressable style={styles.button} onPress={() => router.replace(LOGIN_ROUTE)}>
          <Text style={styles.buttonText}>返回登录</Text>
        </Pressable>
      </View>
    );
  }

  if (!isSessionReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1760c4" />
        <Text style={styles.loadingText}>正在准备课程环境...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" onPress={handleExitLesson} style={styles.exitButton}>
          <Text style={styles.exitButtonText}>返回课程</Text>
        </Pressable>
      </View>

      {webError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{webError}</Text>
        </View>
      ) : null}

      <WebView
        ref={webViewRef}
        source={{ uri: lessonUrl }}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={bootstrapScript}
        onMessage={handleBridgeMessage}
        onNavigationStateChange={handleNavigationChange}
        onError={() => setWebError('课程页面加载失败，请检查 Web 服务是否已启动')}
        onHttpError={() => setWebError('课程页面加载失败，请检查 Web 服务是否已启动')}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        domStorageEnabled
        javaScriptEnabled
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        cacheEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.webviewLoading}>
            <ActivityIndicator size="large" color="#1760c4" />
            <Text style={styles.loadingText}>正在加载课程...</Text>
          </View>
        )}
        {...androidWebViewProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    pointerEvents: 'box-none',
  },
  exitButton: {
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
  exitButtonText: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 14,
  },
  webview: {
    flex: 1,
    backgroundColor: '#020617',
  },
  webviewLoading: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020617',
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25b8dd',
    padding: 24,
    gap: 16,
  },
  loadingText: {
    color: '#1760c4',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#1760c4',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorBanner: {
    position: 'absolute',
    top: 72,
    left: 16,
    right: 16,
    zIndex: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(127, 29, 29, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorBannerText: {
    color: '#fee2e2',
    fontSize: 13,
    textAlign: 'center',
  },
  button: {
    borderRadius: 999,
    backgroundColor: '#1760c4',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
