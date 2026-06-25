import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { isWechatLoginSupported } from '../services/wechatNative';
import { LoginColors, LoginSizes, LoginWeights } from './LoginConstants';

type FamilyLoginMode = 'sms' | 'password';

type PersonalFormProps = {
  isSubmitting: boolean;
  smsCountdown: number;
  onSendSms: (phone: string) => void;
  onWechatLoginPress: () => void;
  onSubmit: (phone: string, credential: string, mode: FamilyLoginMode) => void;
};

export function PersonalForm({
  isSubmitting,
  smsCountdown,
  onSendSms,
  onWechatLoginPress,
  onSubmit,
}: PersonalFormProps) {
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<FamilyLoginMode>('sms');

  const handleSubmit = () => {
    const credential = loginMode === 'sms' ? smsCode.trim() : password;
    onSubmit(phone.trim(), credential, loginMode);
  };

  return (
    <View style={styles.panel}>
      {/* Hint — web .account-panel-heading */}
      <View style={styles.panelHeading}>
        <Text style={styles.panelCaption}>首次登录将自动创建账号</Text>
      </View>

      {/* WeChat Login — web .account-btn-block */}
      <Pressable
        style={[styles.wechatBtn, isSubmitting && styles.disabled]}
        onPress={onWechatLoginPress}
        disabled={isSubmitting}
      >
        <Text style={styles.wechatBtnText}>
          {isWechatLoginSupported() ? '微信登录' : '微信登录（仅真机）'}
        </Text>
      </Pressable>

      {/* SMS / Password sub-tabs — web .account-family-login-tabs */}
      <View style={styles.subTabs}>
        <Pressable
          style={[styles.subTab, loginMode === 'sms' && styles.subTabActive]}
          onPress={() => setLoginMode('sms')}
        >
          <Text style={[styles.subTabText, loginMode === 'sms' && styles.subTabTextActive]}>
            验证码登录
          </Text>
        </Pressable>
        <Pressable
          style={[styles.subTab, loginMode === 'password' && styles.subTabActive]}
          onPress={() => setLoginMode('password')}
        >
          <Text style={[styles.subTabText, loginMode === 'password' && styles.subTabTextActive]}>
            密码登录
          </Text>
        </Pressable>
      </View>

      {/* Phone field — web .account-field */}
      <View style={styles.field}>
        <Text style={styles.label}>手机号</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="请输入手机号"
          placeholderTextColor={LoginColors.inputPlaceholder}
          keyboardType="phone-pad"
          editable={!isSubmitting}
        />
      </View>

      {/* SMS or Password — web .account-input-wrapper */}
      {loginMode === 'sms' ? (
        <View style={styles.field}>
          <Text style={styles.label}>验证码</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, styles.smsInput]}
              value={smsCode}
              onChangeText={setSmsCode}
              placeholder="请输入验证码"
              placeholderTextColor={LoginColors.inputPlaceholder}
              keyboardType="number-pad"
              editable={!isSubmitting}
            />
            <Pressable
              style={[styles.smsBtn, (smsCountdown > 0 || !phone.trim()) && styles.smsBtnDisabled]}
              onPress={() => onSendSms(phone.trim())}
              disabled={smsCountdown > 0 || !phone.trim() || isSubmitting}
            >
              <Text style={styles.smsBtnText}>
                {smsCountdown > 0 ? `${smsCountdown}s` : '获取验证码'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.field}>
          <Text style={styles.label}>密码</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              value={password}
              onChangeText={setPassword}
              placeholder="请输入密码"
              placeholderTextColor={LoginColors.inputPlaceholder}
              secureTextEntry={!showPassword}
              editable={!isSubmitting}
            />
            <Pressable
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={8}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Submit — web .account-btn-primary .account-btn-block */}
      <Pressable
        style={[styles.submitBtn, isSubmitting && styles.disabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color={LoginColors.white} />
        ) : (
          <Text style={styles.submitText}>手机号登录</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  /* ── Panel (web .account-login-panel) ── */
  panel: {
    backgroundColor: LoginColors.panelBg,
    borderWidth: 1,
    borderColor: LoginColors.panelBorder,
    borderRadius: LoginSizes.panelBorderRadius,
    padding: LoginSizes.panelPadding,
  },

  /* ── Panel heading (web .account-panel-heading) ── */
  panelHeading: {
    marginBottom: 16,
  },
  panelCaption: {
    fontSize: LoginSizes.captionFontSize,
    color: LoginColors.success,
  },

  /* ── WeChat button (web .account-btn-block) ── */
  wechatBtn: {
    height: LoginSizes.wechatBtnHeight,
    borderRadius: LoginSizes.wechatBtnBorderRadius,
    backgroundColor: LoginColors.wechatGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  wechatBtnText: {
    fontSize: LoginSizes.wechatBtnFontSize,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.white,
  },

  /* ── Sub-tabs (web .account-family-login-tabs) ── */
  subTabs: {
    flexDirection: 'row',
    backgroundColor: LoginColors.subTabContainerBg,
    borderRadius: LoginSizes.subTabContainerRadius,
    padding: 5,
    gap: 4,
    marginBottom: 16,
  },
  subTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LoginSizes.subTabPaddingV,
    paddingHorizontal: LoginSizes.subTabPaddingH,
    borderRadius: LoginSizes.subTabActiveRadius,
  },
  subTabActive: {
    backgroundColor: LoginColors.tabActiveBg,
    shadowColor: LoginColors.tabShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  subTabText: {
    fontSize: LoginSizes.subTabFontSize,
    fontWeight: LoginWeights.bold,
    color: LoginColors.tabInactiveText,
  },
  subTabTextActive: {
    color: LoginColors.tabActiveText,
    fontWeight: LoginWeights.extraBold,
  },

  /* ── Field (web .account-field) ── */
  field: {
    marginBottom: LoginSizes.fieldMarginBottom,
  },
  label: {
    fontSize: LoginSizes.labelFontSize,
    fontWeight: LoginWeights.bold,
    color: LoginColors.textLabel,
    marginBottom: LoginSizes.labelMarginBottom,
    textAlign: 'left',
  },

  /* ── Input (web .account-input) ── */
  input: {
    height: LoginSizes.inputHeight,
    borderWidth: LoginSizes.inputBorderWidth,
    borderColor: LoginColors.inputBorder,
    borderRadius: LoginSizes.inputBorderRadius,
    paddingVertical: LoginSizes.inputPaddingV,
    paddingHorizontal: LoginSizes.inputPaddingH,
    fontSize: LoginSizes.inputFontSize,
    fontWeight: '500',
    color: LoginColors.inputText,
    backgroundColor: LoginColors.inputBg,
  },
  smsInput: {
    paddingRight: 100,
  },
  inputWithIcon: {
    paddingRight: 44,
  },
  inputWrapper: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 18,
    color: LoginColors.inputPlaceholder,
  },

  /* ── SMS button (web .account-sms-btn) ── */
  smsBtn: {
    position: 'absolute',
    right: 4,
    top: 4,
    bottom: 4,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: LoginColors.primaryStart,
  },
  smsBtnDisabled: {
    backgroundColor: LoginColors.inputPlaceholder,
  },
  smsBtnText: {
    fontSize: LoginSizes.captionFontSize,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.white,
  },

  /* ── Submit (web .account-btn-primary .account-btn-block) ── */
  submitBtn: {
    height: LoginSizes.btnPaddingV * 2 + LoginSizes.inputFontSize + 4,
    borderRadius: LoginSizes.btnBorderRadius,
    backgroundColor: LoginColors.primaryEnd,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LoginSizes.btnPaddingV,
    paddingHorizontal: LoginSizes.btnPaddingH,
    shadowColor: LoginColors.primaryShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 6,
  },
  submitText: {
    fontSize: LoginSizes.btnFontSize,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.white,
  },
  disabled: {
    opacity: 0.55,
  },
});
