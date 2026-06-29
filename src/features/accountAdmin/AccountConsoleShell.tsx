import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { useAuth } from '@/features/auth';
import {
  ADMIN_TEACHERS_ROUTE,
  COURSES_ROUTE,
  TEACHER_STUDENTS_ROUTE,
  isAdminTeacher,
} from '@/lib/auth/accountRoutes';
import { LoginColors, LoginWeights } from '@/features/auth/components/LoginConstants';

type AccountConsoleShellProps = {
  title: string;
  active: 'admin-teachers' | 'admin-students' | 'admin-schools' | 'teacher-students';
  children: ReactNode;
};

const ADMIN_STUDENTS_ROUTE = '/(app)/account/admin/students';
const ADMIN_SCHOOLS_ROUTE = '/(app)/account/admin/schools';

export function AccountConsoleShell({ title, active, children }: AccountConsoleShellProps) {
  const router = useRouter();
  const { auth, logout } = useAuth();
  const isAdmin = isAdminTeacher(auth);

  const navItems = isAdmin
    ? [
        { key: 'admin-teachers', label: '老师账号管理', href: ADMIN_TEACHERS_ROUTE },
        { key: 'admin-students', label: '学生账号管理', href: ADMIN_STUDENTS_ROUTE },
        { key: 'admin-schools', label: '学校信息管理', href: ADMIN_SCHOOLS_ROUTE },
      ]
    : [{ key: 'teacher-students', label: '学生账号管理', href: TEACHER_STUDENTS_ROUTE }];

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as Href);
  };

  return (
    <View style={styles.root}>
      <View style={styles.topbar}>
        <View>
          <Text style={styles.brand}>欧波开心学</Text>
          <Text style={styles.meta}>
            {auth?.schoolName || '学校后台'} · {isAdmin ? '管理员' : '教学老师'}
          </Text>
        </View>
        <View style={styles.topbarActions}>
          <Pressable style={styles.secondaryBtn} onPress={() => router.replace(COURSES_ROUTE as Href)}>
            <Text style={styles.secondaryBtnText}>返回大厅</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={handleLogout}>
            <Text style={styles.secondaryBtnText}>退出登录</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.nav}>
        {navItems.map((item) => (
          <Pressable
            key={item.key}
            style={[styles.navItem, active === item.key && styles.navItemActive]}
            onPress={() => router.replace(item.href as Href)}
          >
            <Text style={[styles.navText, active === item.key && styles.navTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{title}</Text>
        {children}
      </ScrollView>
    </View>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  return <View style={styles.panel}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable style={[styles.primaryBtn, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable style={[styles.secondaryBtn, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.secondaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function StatusTag({ label, tone }: { label: string; tone: 'ok' | 'muted' | 'warn' }) {
  return (
    <View style={[styles.tag, tone === 'ok' && styles.tagOk, tone === 'warn' && styles.tagWarn]}>
      <Text style={[styles.tagText, tone === 'ok' && styles.tagOkText, tone === 'warn' && styles.tagWarnText]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#eef6ff',
  },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: LoginColors.line,
    gap: 16,
  },
  brand: {
    fontSize: 20,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: LoginWeights.bold,
    color: LoginColors.textMuted,
  },
  topbarActions: {
    flexDirection: 'row',
    gap: 10,
  },
  nav: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(248,250,252,0.96)',
  },
  navItem: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: LoginColors.secondaryBg,
    borderWidth: 1,
    borderColor: LoginColors.secondaryBorder,
  },
  navItemActive: {
    backgroundColor: LoginColors.text,
    borderColor: LoginColors.text,
  },
  navText: {
    fontSize: 14,
    fontWeight: LoginWeights.bold,
    color: LoginColors.secondaryText,
  },
  navTextActive: {
    color: LoginColors.white,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
  },
  panel: {
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: LoginColors.line,
    padding: 18,
    gap: 14,
  },
  primaryBtn: {
    borderRadius: 999,
    backgroundColor: LoginColors.primaryStart,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: LoginColors.white,
    fontWeight: LoginWeights.extraBold,
    fontSize: 14,
  },
  secondaryBtn: {
    borderRadius: 999,
    backgroundColor: LoginColors.secondaryBg,
    borderWidth: 1,
    borderColor: LoginColors.secondaryBorder,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: LoginColors.secondaryText,
    fontWeight: LoginWeights.bold,
    fontSize: 14,
  },
  disabled: {
    opacity: 0.55,
  },
  tag: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: LoginColors.tagMutedBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagOk: {
    backgroundColor: LoginColors.tagOkBg,
  },
  tagWarn: {
    backgroundColor: '#fef3c7',
  },
  tagText: {
    fontSize: 12,
    fontWeight: LoginWeights.bold,
    color: LoginColors.tagMutedText,
  },
  tagOkText: {
    color: LoginColors.tagOkText,
  },
  tagWarnText: {
    color: '#b45309',
  },
});
