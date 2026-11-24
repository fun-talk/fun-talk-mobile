import { useCallback, useEffect, useState, type PropsWithChildren } from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { defaultAsyncStorage } from '@/lib/storage/asyncStorage';

import { LEGAL_DOCS, type LegalDocType } from '../legalDocs';
import { acceptPrivacyConsent, hasAcceptedPrivacyConsent } from '../privacyConsent';
import { LegalDocView } from './LegalDocView';
import { LegalColors } from './legalStyles';

type ConsentStatus = 'checking' | 'required' | 'accepted';
type ConsentStep = 'notice' | 'declined';

/**
 * First-launch privacy popup (隐私弹窗).
 *
 * Nothing below this gate is mounted until the user taps “同意”, so no session
 * check, API request, device ID or SDK runs before consent. The links open the
 * same published documents as the website and the in-app “隐私政策” entry.
 */
export function PrivacyConsentGate({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<ConsentStatus>('checking');
  const [step, setStep] = useState<ConsentStep>('notice');
  const [viewingDoc, setViewingDoc] = useState<LegalDocType | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hasAcceptedPrivacyConsent(defaultAsyncStorage)
      .catch(() => false)
      .then((accepted) => {
        if (!cancelled) setStatus(accepted ? 'accepted' : 'required');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== 'required') return;
    // The splash screen is normally hidden by AuthProvider, which is not mounted yet.
    SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  useEffect(() => {
    if (status !== 'required') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (viewingDoc) {
        setViewingDoc(null);
      } else if (step === 'declined') {
        setStep('notice');
      }
      return true;
    });
    return () => subscription.remove();
  }, [status, step, viewingDoc]);

  const handleAgree = useCallback(async () => {
    setSaving(true);
    try {
      await acceptPrivacyConsent(defaultAsyncStorage);
    } catch {
      // Storage failure only means the popup is shown again next launch.
    }
    setSaving(false);
    setStatus('accepted');
  }, []);

  const handleExit = useCallback(() => {
    BackHandler.exitApp();
  }, []);

  if (status === 'accepted') return <>{children}</>;
  if (status === 'checking') return null;

  if (viewingDoc) {
    return <LegalDocView type={viewingDoc} onClose={() => setViewingDoc(null)} />;
  }

  const docLink = (type: LegalDocType) => (
    <Text
      key={type}
      style={styles.link}
      accessibilityRole="link"
      onPress={() => setViewingDoc(type)}
    >
      {LEGAL_DOCS[type].linkLabel}
    </Text>
  );

  return (
    <View style={styles.scrim}>
      <View style={styles.card} accessibilityViewIsModal>
        {step === 'notice' ? (
          <>
            <Text style={styles.title} accessibilityRole="header">
              个人信息保护提示
            </Text>
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
              <Text style={styles.paragraph}>
                欢迎使用狐狸开心学！我们非常重视您和孩子的个人信息保护。在使用前，请您（未满 14
                周岁的儿童请在监护人陪同下）仔细阅读并充分理解
                {docLink('user')}、{docLink('privacy')}和{docLink('children')}
                的全部内容，特别是以下要点：
              </Text>
              <Text style={styles.item}>
                1. 注册、登录时，我们会收集您的
                <Text style={styles.strong}>手机号码、短信验证码</Text>
                ；使用微信登录时，经您授权后获取<Text style={styles.strong}>微信昵称、头像</Text>
                ，用于创建和登录账号。
              </Text>
              <Text style={styles.item}>
                2. 为保障服务安全稳定运行，我们会收集
                <Text style={styles.strong}>设备信息（设备型号、操作系统版本、设备标识符）和日志信息</Text>
                。
              </Text>
              <Text style={styles.item}>
                3. 课程中的英语口语练习需要使用<Text style={styles.strong}>麦克风权限</Text>
                ，用于识别孩子的语音回答。我们会在您使用该功能时单独申请，您可以拒绝或随时在系统设置中关闭。
              </Text>
              <Text style={styles.item}>
                4. 为孩子创建账号时，我们会处理您提供的
                <Text style={styles.strong}>昵称、年级等儿童个人信息</Text>
                ，具体规则见{docLink('children')}。
              </Text>
              <Text style={styles.paragraph}>
                您可以查询、更正、删除您的个人信息，也可以注销账号。点击“同意”即表示您已阅读并同意上述协议和政策；如您不同意，将无法使用我们的产品和服务。
              </Text>
            </ScrollView>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setStep('declined')}
                style={({ pressed }) => [styles.button, styles.secondaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryText}>不同意</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() => void handleAgree()}
                style={({ pressed }) => [styles.button, styles.primaryButton, pressed && styles.primaryPressed]}
              >
                <Text style={styles.primaryText}>同意</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title} accessibilityRole="header">
              温馨提示
            </Text>
            <View style={styles.bodyContent}>
              <Text style={styles.paragraph}>
                我们需要您同意{docLink('privacy')}后，才能为您提供狐狸开心学的课程服务。
                {Platform.OS === 'android'
                  ? '如您仍不同意，可以退出应用。'
                  : '如您仍不同意，可以直接关闭应用。'}
              </Text>
            </View>
            <View style={styles.actions}>
              {Platform.OS === 'android' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={handleExit}
                  style={({ pressed }) => [styles.button, styles.secondaryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.secondaryText}>退出应用</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => setStep('notice')}
                style={({ pressed }) => [styles.button, styles.primaryButton, pressed && styles.primaryPressed]}
              >
                <Text style={styles.primaryText}>再次查看</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: LegalColors.scrim,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '92%',
    borderRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: LegalColors.surface,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: LegalColors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    flexGrow: 0,
    flexShrink: 1,
  },
  bodyContent: {
    gap: 8,
    paddingBottom: 4,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: LegalColors.textBody,
  },
  item: {
    fontSize: 14,
    lineHeight: 22,
    color: LegalColors.textBody,
  },
  strong: {
    fontWeight: '800',
    color: LegalColors.text,
  },
  link: {
    color: LegalColors.link,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: LegalColors.line,
    backgroundColor: LegalColors.surface,
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: LegalColors.textMuted,
  },
  primaryButton: {
    backgroundColor: LegalColors.accent,
  },
  primaryPressed: {
    backgroundColor: LegalColors.accentPressed,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '800',
    color: LegalColors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
});
