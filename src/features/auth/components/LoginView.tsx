import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LoginColors, LoginSizes, LoginWeights } from './LoginConstants';
import { PersonalForm } from './PersonalForm';
import { SchoolForm } from './SchoolForm';

type LoginTab = 'personal' | 'school';

type LoginViewProps = {
  activeTab: LoginTab;
  onTabChange: (tab: LoginTab) => void;
  onHomePress: () => void;
  isDesktopLayout: boolean;
  isSubmitting: boolean;
  statusMessage: string;
  errorMessage: string;
  rememberMe: boolean;
  onRememberMeChange: (value: boolean) => void;
  onWechatLoginPress: () => void;
  onPersonalSubmit: (phone: string, password: string) => void;
  onSchoolSubmit: (school: string, className: string, studentName: string, schoolCode: string) => void;
};

export function LoginView({
  activeTab,
  onTabChange,
  onHomePress,
  isDesktopLayout,
  isSubmitting,
  statusMessage,
  errorMessage,
  rememberMe,
  onRememberMeChange,
  onWechatLoginPress,
  onPersonalSubmit,
  onSchoolSubmit,
}: LoginViewProps) {
  return (
    <View style={styles.container}>
      {/* Home Button — absolute within the scene, matches web .home-button */}
      <Pressable style={styles.homeBtn} onPress={onHomePress} disabled={isSubmitting}>
        <View style={styles.homeIcon}>
          <View style={styles.homeIconRoof} />
          <View style={styles.homeIconBody} />
        </View>
        <Text style={styles.homeBtnText}>返回首页</Text>
      </Pressable>

      {/* Login Stage — matches web .login-stage: padding 86px 16px 32px */}
      <View style={styles.loginStage}>
        {/* Login Panel — matches web .login-panel */}
        <View style={[styles.panel, isDesktopLayout && styles.panelDesktop]}>
          {/* Tabs */}
          <View style={styles.tabs}>
            <Pressable
              style={styles.tab}
              onPress={() => onTabChange('personal')}
              disabled={isSubmitting}>
              <Text style={[styles.tabText, activeTab === 'personal' && styles.tabTextActive]}>
                个人登录
              </Text>
              {activeTab === 'personal' && <View style={styles.tabIndicator} />}
            </Pressable>
            <Pressable
              style={styles.tab}
              onPress={() => onTabChange('school')}
              disabled={isSubmitting}>
              <Text style={[styles.tabText, activeTab === 'school' && styles.tabTextActive]}>
                学校登录
              </Text>
              {activeTab === 'school' && <View style={styles.tabIndicator} />}
            </Pressable>
          </View>

          {/* Forms */}
          <View style={styles.forms}>
            {activeTab === 'personal' ? (
              <PersonalForm
                isSubmitting={isSubmitting}
                rememberMe={rememberMe}
                onRememberMeChange={onRememberMeChange}
                onWechatLoginPress={onWechatLoginPress}
                onSubmit={onPersonalSubmit}
              />
            ) : (
              <SchoolForm isSubmitting={isSubmitting} onSubmit={onSchoolSubmit} />
            )}

            {/* Status / Error messages */}
            {statusMessage ? (
              <Text style={[styles.note, { color: LoginColors.success }]}>{statusMessage}</Text>
            ) : null}
            {errorMessage ? (
              <Text style={[styles.note, { color: LoginColors.error }]}>{errorMessage}</Text>
            ) : null}
          </View>

          {/* Agreement footer */}
          <View style={styles.agreement}>
            <Text style={styles.agreementText}>
              登录即表示同意
              <Text style={styles.agreementLink}>《用户协议》</Text>
              <Text style={styles.agreementLink}>《隐私政策》</Text>
              <Text style={styles.agreementLink}>《儿童隐私保护声明》</Text>
            </Text>
          </View>
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

  /* ---- Home Button — matches web .home-button (mobile: top:40, right:14, h:44) ---- */
  homeBtn: {
    position: 'absolute',
    top: LoginSizes.homeBtnTop,
    right: LoginSizes.homeBtnRight,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: LoginSizes.homeBtnHeight,
    paddingHorizontal: 15,
    borderRadius: 999,
    backgroundColor: LoginColors.homeBtnBg,
  },
  homeIcon: {
    width: LoginSizes.homeIconW,
    height: LoginSizes.homeIconH,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  homeIconRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: LoginSizes.homeIconW / 2,
    borderRightWidth: LoginSizes.homeIconW / 2,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: LoginColors.orange,
  },
  homeIconBody: {
    width: LoginSizes.homeIconW - 4,
    height: 11,
    backgroundColor: LoginColors.orange,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },
  homeBtnText: {
    fontSize: LoginSizes.homeBtnFontSize,
    fontWeight: LoginWeights.black,
    color: LoginColors.homeBtnText,
  },

  /* ---- Login Stage — matches web .login-stage (mobile) ---- */
  loginStage: {
    width: '100%',
    alignItems: 'center',
    paddingTop: LoginSizes.loginStagePaddingTop,
    paddingHorizontal: LoginSizes.loginStagePaddingH,
    paddingBottom: LoginSizes.loginStagePaddingBottom,
  },

  /* ---- Panel — matches web .login-panel ---- */
  panel: {
    width: '100%',
    maxWidth: LoginSizes.panelMaxWidth,
    borderRadius: LoginSizes.panelBorderRadius,
    backgroundColor: LoginColors.panelBg,
    overflow: 'hidden',
    shadowColor: LoginColors.shadowColor,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 44,
    elevation: 10,
  },
  panelDesktop: {
    aspectRatio: LoginSizes.panelAspectW / LoginSizes.panelAspectH,
  },

  /* ---- Tabs — matches web .tabs ---- */
  tabs: {
    flexDirection: 'row',
    height: LoginSizes.tabHeight,
    borderBottomWidth: LoginSizes.tabBorderBottom,
    borderBottomColor: LoginColors.line,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: LoginSizes.tabFontSize,
    fontWeight: LoginWeights.extraBlack,
    color: LoginColors.tabInactive,
  },
  tabTextActive: {
    color: LoginColors.orange,
  },
  tabIndicator: {
    position: 'absolute',
    left: LoginSizes.tabIndicatorLeft,
    right: LoginSizes.tabIndicatorRight,
    bottom: -LoginSizes.tabBorderBottom,
    height: LoginSizes.tabActiveIndicatorHeight,
    borderTopLeftRadius: LoginSizes.tabActiveIndicatorHeight,
    borderTopRightRadius: LoginSizes.tabActiveIndicatorHeight,
    backgroundColor: LoginColors.orange,
  },

  /* ---- Forms — matches web .forms ---- */
  forms: {
    marginTop: 10,
    paddingTop: LoginSizes.formPaddingTop,
    paddingHorizontal: LoginSizes.formPaddingHorizontal,
    paddingBottom: 4,
  },
  note: {
    marginTop: 10,
    fontSize: LoginSizes.noteFontSize,
    fontWeight: LoginWeights.extraBold,
    textAlign: 'center',
    minHeight: 20,
  },

  /* ---- Agreement — matches web .agreement ---- */
  agreement: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  agreementText: {
    fontSize: LoginSizes.agreementFontSize,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.agreement,
    textAlign: 'center',
    lineHeight: LoginSizes.agreementFontSize * 1.45,
  },
  agreementLink: {
    color: LoginColors.agreementLink,
  },
});
