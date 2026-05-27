import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { readRememberMePreference, writeRememberMePreference } from '@/lib/auth/preferences';

import { useAuth } from '../AuthProvider';
import {
  LoginError,
  loginWithFrontpage,
  loginWithWechatCode,
} from '../services/login';
import { isWechatLoginSupported, requestWechatAuthCode } from '../services/wechatNative';

type LoginTab = 'personal' | 'school';

const COURSES_ROUTE = '/(app)/courses' as Href;

export function LoginScreen() {
  const router = useRouter();
  const { apiClient, saveAuth } = useAuth();

  const [tab, setTab] = useState<LoginTab>('personal');
  const [rememberMe, setRememberMe] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [school, setSchool] = useState('');
  const [className, setClassName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');

  useEffect(() => {
    void readRememberMePreference().then(setRememberMe);
  }, []);

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
          error instanceof LoginError || error instanceof Error
            ? error.message
            : '登录失败，请稍后重试';
        setErrorMessage(message);
        setStatusMessage('');
      } finally {
        setIsSubmitting(false);
      }
    },
    [router],
  );

  const handleRememberMeChange = async (value: boolean) => {
    setRememberMe(value);
    await writeRememberMePreference(value);
  };

  const handlePersonalLogin = () => {
    const trimmedPhone = phone.trim();
    const trimmedPassword = password.trim();
    if (!trimmedPhone || !trimmedPassword) {
      setErrorMessage('请输入手机号和密码');
      return;
    }

    void finishLogin(async () => {
      const auth = await loginWithFrontpage(apiClient, {
        mode: 'personal',
        rememberMe,
        payload: {
          phone: trimmedPhone,
          name: trimmedPassword,
        },
      });
      await saveAuth(auth);
    });
  };

  const handleSchoolLogin = () => {
    if (!school.trim() || !className.trim() || !studentName.trim() || !schoolCode.trim()) {
      setErrorMessage('请完整填写学校、班级、姓名和密码');
      return;
    }

    void finishLogin(async () => {
      const auth = await loginWithFrontpage(apiClient, {
        mode: 'school',
        rememberMe,
        payload: {
          school: school.trim(),
          class_name: className.trim(),
          student_name: studentName.trim(),
          school_code: schoolCode.trim(),
        },
      });
      await saveAuth(auth);
    });
  };

  const handleWechatLogin = () => {
    void finishLogin(async () => {
      const code = await requestWechatAuthCode();
      const auth = await loginWithWechatCode(apiClient, code, rememberMe);
      await saveAuth(auth);
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>欧波开心说</Text>
        <Text style={styles.subtitle}>登录后开始学习</Text>

        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, tab === 'personal' && styles.tabActive]}
            onPress={() => setTab('personal')}
            disabled={isSubmitting}>
            <Text style={[styles.tabText, tab === 'personal' && styles.tabTextActive]}>
              个人登录
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === 'school' && styles.tabActive]}
            onPress={() => setTab('school')}
            disabled={isSubmitting}>
            <Text style={[styles.tabText, tab === 'school' && styles.tabTextActive]}>
              学校登录
            </Text>
          </Pressable>
        </View>

        {tab === 'personal' ? (
          <View style={styles.form}>
            <Text style={styles.label}>手机号</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="请输入手机号"
              keyboardType="phone-pad"
              autoCapitalize="none"
              editable={!isSubmitting}
            />
            <Text style={styles.label}>密码</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="请输入密码"
              secureTextEntry
              editable={!isSubmitting}
            />
            <Pressable
              style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
              onPress={handlePersonalLogin}
              disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>登录</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>学校名称</Text>
            <TextInput
              style={styles.input}
              value={school}
              onChangeText={setSchool}
              placeholder="请输入学校名称"
              editable={!isSubmitting}
            />
            <Text style={styles.label}>班级</Text>
            <TextInput
              style={styles.input}
              value={className}
              onChangeText={setClassName}
              placeholder="请输入班级"
              editable={!isSubmitting}
            />
            <Text style={styles.label}>姓名</Text>
            <TextInput
              style={styles.input}
              value={studentName}
              onChangeText={setStudentName}
              placeholder="请输入姓名"
              editable={!isSubmitting}
            />
            <Text style={styles.label}>密码</Text>
            <TextInput
              style={styles.input}
              value={schoolCode}
              onChangeText={setSchoolCode}
              placeholder="请输入密码"
              secureTextEntry
              editable={!isSubmitting}
            />
            <Pressable
              style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSchoolLogin}
              disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>登录</Text>
              )}
            </Pressable>
          </View>
        )}

        <View style={styles.rememberRow}>
          <Text style={styles.rememberLabel}>记住登录</Text>
          <Switch value={rememberMe} onValueChange={handleRememberMeChange} disabled={isSubmitting} />
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>或</Text>
          <View style={styles.divider} />
        </View>

        <Pressable
          style={[styles.wechatButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleWechatLogin}
          disabled={isSubmitting || !isWechatLoginSupported()}>
          <Text style={styles.wechatButtonText}>
            {isWechatLoginSupported() ? '微信登录' : '微信登录（仅 iOS/Android 真机）'}
          </Text>
        </Pressable>

        {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff7ee',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2089ea',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 28,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#f2dcc4',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#ff7a15',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7a5a43',
  },
  tabTextActive: {
    color: '#fff',
  },
  form: {
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b3424',
  },
  input: {
    borderWidth: 1,
    borderColor: '#f2dcc4',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#222',
    marginBottom: 6,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#2089ea',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  rememberRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rememberLabel: {
    fontSize: 15,
    color: '#4b3424',
  },
  dividerRow: {
    marginVertical: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e8d4bd',
  },
  dividerText: {
    color: '#999',
    fontSize: 14,
  },
  wechatButton: {
    backgroundColor: '#07c160',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  wechatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  status: {
    marginTop: 16,
    textAlign: 'center',
    color: '#2a9f42',
    fontSize: 14,
  },
  error: {
    marginTop: 16,
    textAlign: 'center',
    color: '#d94b32',
    fontSize: 14,
  },
});
