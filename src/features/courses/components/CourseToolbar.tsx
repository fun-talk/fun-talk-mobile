import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { courseHomeImages } from '../assets/courseHomeAssets';
import { clampByViewport } from '../layout/courseHomeLayout';

type CourseToolbarProps = {
  viewportWidth: number;
  landscapeTablet: boolean;
  countLabel: string;
  userName: string;
  currentCourseNumber: number;
  isLoggingOut: boolean;
  onLogout: () => void;
  onReportPress?: () => void;
  onProfilePress?: () => void;
};

export function CourseToolbar({
  viewportWidth,
  landscapeTablet,
  countLabel,
  userName,
  currentCourseNumber,
  isLoggingOut,
  onLogout,
  onReportPress,
  onProfilePress,
}: CourseToolbarProps) {
  const insets = useSafeAreaInsets();
  const reportWidth = landscapeTablet
    ? Math.min(196, viewportWidth * 0.18)
    : Math.min(180, viewportWidth * 0.24);
  const helloMaxWidth = landscapeTablet
    ? Math.min(420, viewportWidth * 0.46)
    : Math.min(460, viewportWidth * 0.58);
  const helloFontSize = landscapeTablet
    ? clampByViewport({ min: 14, vw: 0.014, max: 22 }, viewportWidth)
    : clampByViewport({ min: 14, vw: 0.0125, max: 24 }, viewportWidth);
  const countFontSize = clampByViewport({ min: 12, vw: 0.01, max: 19 }, viewportWidth);
  const logoutFontSize = clampByViewport({ min: 13, vw: 0.01, max: 18 }, viewportWidth);
  const horizontalPadding = landscapeTablet
    ? clampByViewport({ min: 24, vw: 0.04, max: 48 }, viewportWidth)
    : clampByViewport({ min: 16, vw: 0.03, max: 32 }, viewportWidth);

  return (
    <View
      style={[
        styles.toolbar,
        {
          paddingTop: insets.top + 12,
          paddingHorizontal: horizontalPadding,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.start}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="学习报告"
          onPress={onReportPress}
          style={({ pressed }) => [styles.reportButton, pressed && styles.reportPressed]}
        >
          <Image
            source={courseHomeImages.studyReport}
            style={{ width: reportWidth, height: reportWidth * 0.42 }}
            contentFit="contain"
          />
        </Pressable>
        <View style={styles.countBadge}>
          <Text style={[styles.countText, { fontSize: countFontSize }]}>{countLabel}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <View style={[styles.hello, { maxWidth: helloMaxWidth }]}>
          <Text style={[styles.helloText, { fontSize: helloFontSize }]} numberOfLines={1}>
            {userName}，继续学习第 {currentCourseNumber} 课
          </Text>
        </View>
        {onProfilePress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="个人中心"
            onPress={onProfilePress}
            style={({ pressed }) => [
              styles.profileButton,
              pressed && styles.profilePressed,
            ]}
          >
            <Text style={[styles.profileText, { fontSize: logoutFontSize }]}>
              个人中心
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={onLogout}
          disabled={isLoggingOut}
          style={({ pressed }) => [
            styles.logoutButton,
            isLoggingOut && styles.logoutDisabled,
            pressed && !isLoggingOut && styles.logoutPressed,
          ]}
        >
          <Text style={[styles.logoutText, { fontSize: logoutFontSize }]}>
            {isLoggingOut ? '退出中...' : '退出登录'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  start: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    flexShrink: 0,
  },
  reportButton: {
    borderWidth: 0,
    padding: 0,
    backgroundColor: 'transparent',
  },
  reportPressed: {
    transform: [{ translateY: -2 }, { scale: 1.03 }],
  },
  countBadge: {
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.68)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#0f59a4',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  countText: {
    color: '#1461b6',
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    flexShrink: 1,
    marginLeft: 'auto',
  },
  hello: {
    minHeight: 44,
    borderWidth: 3,
    borderColor: 'rgba(87, 144, 255, 0.36)',
    borderRadius: 999,
    backgroundColor: 'rgba(241, 246, 255, 0.86)',
    paddingHorizontal: 22,
    justifyContent: 'center',
    shadowColor: '#1661ba',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  helloText: {
    color: '#1760c4',
    fontWeight: '800',
  },
  logoutButton: {
    minHeight: 44,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.86)',
    borderRadius: 999,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255, 122, 21, 0.92)',
    justifyContent: 'center',
    shadowColor: '#964e0a',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  logoutDisabled: {
    opacity: 0.72,
  },
  logoutPressed: {
    transform: [{ translateY: -2 }],
  },
  logoutText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  profileButton: {
    minHeight: 44,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.86)',
    borderRadius: 999,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(47, 145, 238, 0.88)',
    justifyContent: 'center',
    shadowColor: '#0f59a4',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  profilePressed: {
    transform: [{ translateY: -2 }],
  },
  profileText: {
    color: '#ffffff',
    fontWeight: '900',
  },
});
