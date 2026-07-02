import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';

import { useAuth } from '@/features/auth';
import {
  ADMIN_TEACHERS_ROUTE,
  TEACHER_STUDENTS_ROUTE,
  isAdminTeacher,
} from '@/lib/auth/accountRoutes';
import { LoginColors, LoginWeights } from '@/features/auth/components/LoginConstants';
import { loginImages } from '@/features/auth/assets/loginAssets';

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
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const collapsedSidebar = !compact && width < 1200;

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
    <View style={[styles.root, compact && styles.rootCompact]}>
      <Image source={loginImages.background} style={styles.backgroundImage} contentFit="cover" />
      <View style={[styles.sidebar, collapsedSidebar && styles.sidebarCollapsed, compact && styles.sidebarCompact]}>
        <View style={[styles.brandBlock, collapsedSidebar && styles.brandBlockCollapsed]}>
          <Image source={loginImages.logo} style={styles.brandLogo} contentFit="contain" />
          <View style={[styles.brandText, collapsedSidebar && styles.hidden]}>
            <Text style={styles.brand}>{isAdmin ? '管理员后台' : '教学老师后台'}</Text>
            <Text style={styles.meta}>{auth?.schoolName || '学校后台'}</Text>
          </View>
        </View>

        <View style={[styles.nav, compact && styles.navCompact]}>
          {navItems.map((item) => (
            <Pressable
              key={item.key}
              style={[
                styles.navItem,
                collapsedSidebar && styles.navItemCollapsed,
                active === item.key && styles.navItemActive,
              ]}
              onPress={() => router.replace(item.href as Href)}
            >
              <Text
                style={[
                  styles.navText,
                  collapsedSidebar && styles.navTextCollapsed,
                  active === item.key && styles.navTextActive,
                ]}
              >
                {collapsedSidebar ? item.label.slice(0, 2) : item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.sidebarFooter, collapsedSidebar && styles.sidebarFooterCollapsed, compact && styles.sidebarFooterCompact]}>
          <Text style={[styles.userName, collapsedSidebar && styles.hidden]} numberOfLines={1}>
            {auth?.username || auth?.phone || '教师账号'} ({isAdmin ? '管理员' : '老师'})
          </Text>
          <View style={styles.footerActions}>
            <Pressable onPress={handleLogout}>
              <Text style={styles.linkBtn}>{collapsedSidebar ? '退出' : '退出登录'}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          collapsedSidebar && styles.contentWithCollapsedSidebar,
          compact && styles.contentCompact,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.screenReaderTitle}>{title}</Text>
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
    backgroundColor: '#dff4ff',
    flexDirection: 'row',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  rootCompact: {
    flexDirection: 'column',
  },
  sidebar: {
    width: 220,
    backgroundColor: 'rgba(240, 249, 255, 0.82)',
    borderRightWidth: 1.5,
    borderBottomColor: LoginColors.line,
    borderRightColor: LoginColors.line,
    paddingHorizontal: 20,
    paddingVertical: 56,
  },
  sidebarCollapsed: {
    width: 84,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  sidebarCompact: {
    width: '100%',
    borderRightWidth: 0,
    borderBottomWidth: 1.5,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
  },
  brandBlock: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 40,
  },
  brandBlockCollapsed: {
    justifyContent: 'center',
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 0,
  },
  brandText: {
    flex: 1,
    minWidth: 0,
  },
  hidden: {
    display: 'none',
  },
  brand: {
    fontSize: 16,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
  },
  meta: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: LoginWeights.bold,
    color: '#94a3b8',
  },
  nav: {
    gap: 8,
  },
  navCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sidebarFooter: {
    marginTop: 'auto',
    borderTopWidth: 1.5,
    borderTopColor: LoginColors.line,
    paddingTop: 24,
    gap: 6,
  },
  sidebarFooterCollapsed: {
    alignItems: 'center',
    paddingTop: 18,
  },
  sidebarFooterCompact: {
    marginTop: 14,
    paddingTop: 12,
  },
  userName: {
    color: LoginColors.textLabel,
    fontSize: 14,
    fontWeight: LoginWeights.bold,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  linkBtn: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: LoginWeights.bold,
    textDecorationLine: 'underline',
  },
  navItem: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navItemCollapsed: {
    width: 56,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  navItemActive: {
    backgroundColor: LoginColors.white,
    borderWidth: 1.5,
    borderColor: LoginColors.line,
    shadowColor: LoginColors.cardShadow,
    shadowOpacity: 0.08,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 10 },
  },
  navText: {
    fontSize: 15,
    fontWeight: LoginWeights.bold,
    color: LoginColors.textMuted,
  },
  navTextCollapsed: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 17,
  },
  navTextActive: {
    color: LoginColors.text,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 70,
    paddingVertical: 70,
  },
  contentWithCollapsedSidebar: {
    paddingHorizontal: 48,
  },
  contentCompact: {
    padding: 18,
  },
  screenReaderTitle: {
    width: 1,
    height: 1,
    opacity: 0,
  },
  panel: {
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: LoginColors.cardBorder,
    padding: 32,
    gap: 24,
    shadowColor: LoginColors.cardShadow,
    shadowOpacity: 0.04,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 20 },
  },
  primaryBtn: {
    borderRadius: 999,
    backgroundColor: LoginColors.primaryStart,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: LoginColors.primaryStart,
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  primaryBtnText: {
    color: LoginColors.white,
    fontWeight: LoginWeights.extraBold,
    fontSize: 15,
  },
  secondaryBtn: {
    borderRadius: 999,
    backgroundColor: LoginColors.secondaryBg,
    borderWidth: 1.5,
    borderColor: LoginColors.secondaryBorder,
    paddingHorizontal: 24,
    paddingVertical: 12,
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
