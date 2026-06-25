import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LoginColors, LoginSizes, LoginWeights } from './LoginConstants';
import { AccountAgreement } from './AccountAgreement';
import { PersonalForm } from './PersonalForm';
import { SchoolForm } from './SchoolForm';

type LoginTab = 'home' | 'school';
type FamilyLoginMode = 'sms' | 'password';

type LoginViewProps = {
  activeTab: LoginTab;
  onTabChange: (tab: LoginTab) => void;
  onHomePress: () => void;
  isDesktopLayout: boolean;
  isSubmitting: boolean;
  agreed: boolean;
  onAgreementChange: (checked: boolean) => void;
  smsCountdown: number;
  onSendSms: (phone: string) => void;
  onWechatLoginPress: () => void;
  onPersonalSubmit: (phone: string, credential: string, mode: FamilyLoginMode) => void;
  onSchoolSubmit: (digitalId: string, password: string) => void;
  onForgotPassword: () => void;
};

export function LoginView({
  activeTab,
  onTabChange,
  onHomePress,
  isDesktopLayout,
  isSubmitting,
  agreed,
  onAgreementChange,
  smsCountdown,
  onSendSms,
  onWechatLoginPress,
  onPersonalSubmit,
  onSchoolSubmit,
  onForgotPassword,
}: LoginViewProps) {
  return (
    <View style={styles.container}>
      {/* Home Button — pill-shaped, matches web .account-topbar-btn */}
      <Pressable style={styles.homeBtn} onPress={onHomePress} disabled={isSubmitting}>
        <View style={styles.homeIcon}>
          <View style={styles.homeIconRoof} />
          <View style={styles.homeIconBody} />
        </View>
        <Text style={styles.homeBtnText}>返回首页</Text>
      </Pressable>

      {/* Login Stage — centered card */}
      <View style={styles.loginStage}>
        {/* Glassmorphic card — matches web .account-card-student-login */}
        <View style={[styles.card, isDesktopLayout && styles.cardDesktop]}>
          {/* Heading — matches web .account-student-login-heading */}
          <View style={styles.heading}>
            <Text style={styles.headingTitle}>学生登录</Text>
            <Text style={styles.headingSubtitle}>选择家庭个人账号或学校账号</Text>
          </View>

          {/* Tabs — matches web .account-tabs .account-login-tabs */}
          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, activeTab === 'home' && styles.tabActive]}
              onPress={() => onTabChange('home')}
              disabled={isSubmitting}
            >
              <Text style={[styles.tabText, activeTab === 'home' && styles.tabTextActive]}>
                家庭账号
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'school' && styles.tabActive]}
              onPress={() => onTabChange('school')}
              disabled={isSubmitting}
            >
              <Text style={[styles.tabText, activeTab === 'school' && styles.tabTextActive]}>
                学校账号
              </Text>
            </Pressable>
          </View>

          {/* Panel wrap — matches web .account-login-panel-wrap */}
          <View style={styles.panelWrap}>
            {activeTab === 'home' ? (
              <PersonalForm
                isSubmitting={isSubmitting}
                smsCountdown={smsCountdown}
                onSendSms={onSendSms}
                onWechatLoginPress={onWechatLoginPress}
                onSubmit={onPersonalSubmit}
              />
            ) : (
              <SchoolForm
                isSubmitting={isSubmitting}
                onSubmit={onSchoolSubmit}
                onForgotPassword={onForgotPassword}
              />
            )}

          </View>

          {/* Agreement — matches web .account-checkbox-field */}
          <AccountAgreement
            checked={agreed}
            onChange={onAgreementChange}
            disabled={isSubmitting}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },

  /* ── Home Button (web .account-btn-secondary .account-topbar-btn) ── */
  homeBtn: {
    position: 'absolute',
    top: 40,
    right: 14,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: LoginSizes.btnBorderRadius,
    backgroundColor: LoginColors.secondaryBg,
    borderWidth: 1.5,
    borderColor: LoginColors.secondaryBorder,
  },
  homeIcon: {
    width: 18,
    height: 16,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  homeIconRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: LoginColors.orange,
  },
  homeIconBody: {
    width: 14,
    height: 9,
    backgroundColor: LoginColors.orange,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },
  homeBtnText: {
    fontSize: LoginSizes.headerBtnFontSize,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.secondaryText,
  },

  /* ── Login Stage ── */
  loginStage: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  /* ── Glassmorphic Card (web .account-card-student-login) ── */
  card: {
    width: '100%',
    maxWidth: LoginSizes.cardMaxWidth,
    borderRadius: LoginSizes.cardBorderRadius,
    backgroundColor: LoginColors.cardBg,
    borderWidth: 1,
    borderColor: LoginColors.cardBorder,
    paddingVertical: LoginSizes.cardPaddingVM,
    paddingHorizontal: LoginSizes.cardPaddingHM,
    // shadow (web box-shadow)
    shadowColor: LoginColors.cardShadow,
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.08,
    shadowRadius: 50,
    elevation: 10,
  },
  cardDesktop: {
    maxWidth: 520,
  },

  /* ── Heading (web .account-student-login-heading) ── */
  heading: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headingTitle: {
    fontSize: LoginSizes.titleFontSize,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  headingSubtitle: {
    fontSize: LoginSizes.subtitleFontSize,
    color: LoginColors.textMuted,
    lineHeight: 22,
  },

  /* ── Tabs (web .account-tabs .account-login-tabs) ── */
  tabs: {
    flexDirection: 'row',
    backgroundColor: LoginColors.tabContainerBg,
    borderRadius: LoginSizes.tabContainerRadius,
    padding: 4,
    gap: LoginSizes.tabGap,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LoginSizes.tabPaddingV,
    paddingHorizontal: LoginSizes.tabPaddingH,
    borderRadius: LoginSizes.tabActiveRadius,
  },
  tabActive: {
    backgroundColor: LoginColors.tabActiveBg,
    shadowColor: LoginColors.tabShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  tabText: {
    fontSize: LoginSizes.tabFontSize,
    fontWeight: LoginWeights.bold,
    color: LoginColors.tabInactiveText,
  },
  tabTextActive: {
    color: LoginColors.tabActiveText,
    fontWeight: LoginWeights.extraBold,
  },

  /* ── Panel Wrap (web .account-login-panel-wrap) ── */
  panelWrap: {
    marginBottom: 0,
  },

  /* ── Error (web .account-error) ── */
  errorBox: {
    backgroundColor: LoginColors.errorBg,
    borderWidth: 1,
    borderColor: LoginColors.errorBorder,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  errorText: {
    fontSize: LoginSizes.noteFontSize,
    fontWeight: LoginWeights.semiBold,
    color: LoginColors.errorText,
    textAlign: 'center',
  },

  /* ── Success ── */
  successText: {
    marginTop: 12,
    fontSize: LoginSizes.noteFontSize,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.success,
    textAlign: 'center',
  },
});
