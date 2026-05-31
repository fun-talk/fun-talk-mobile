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

type PersonalFormProps = {
  isSubmitting: boolean;
  rememberMe: boolean;
  onRememberMeChange: (value: boolean) => void;
  onWechatLoginPress: () => void;
  onSubmit: (phone: string, password: string) => void;
};

export function PersonalForm({
  isSubmitting,
  rememberMe,
  onRememberMeChange,
  onWechatLoginPress,
  onSubmit,
}: PersonalFormProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    onSubmit(phone, password);
  };

  return (
    <View style={styles.formInner}>
      <Text style={styles.methodTitle}>微信登录</Text>

      <Pressable
        style={[styles.wechatBtn, isSubmitting && styles.disabled]}
        onPress={onWechatLoginPress}
        disabled={isSubmitting}>
        <Text style={styles.wechatBtnText}>
          {isWechatLoginSupported() ? '微信扫码登录' : '微信登录（仅真机）'}
        </Text>
      </Pressable>

      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>或</Text>
        <View style={styles.orLine} />
      </View>

      <Text style={styles.phoneLabel}>使用手机号登录</Text>

      <TextInput
        style={styles.field}
        value={phone}
        onChangeText={setPhone}
        placeholder="请输入手机号"
        placeholderTextColor={LoginColors.fieldPlaceholder}
        autoCapitalize="none"
        keyboardType="phone-pad"
        editable={!isSubmitting}
      />

      <TextInput
        style={styles.field}
        value={password}
        onChangeText={setPassword}
        placeholder="请输入密码"
        placeholderTextColor={LoginColors.fieldPlaceholder}
        secureTextEntry
        editable={!isSubmitting}
      />

      <View style={styles.rememberRow}>
        <Pressable
          style={styles.remember}
          onPress={() => onRememberMeChange(!rememberMe)}
          disabled={isSubmitting}>
          <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
            {rememberMe && <View style={styles.checkboxInnerDot} />}
          </View>
          <Text style={styles.rememberLabel}>记住我</Text>
        </Pressable>
        <Pressable disabled={isSubmitting}>
          <Text style={styles.forgot}>忘记密码？</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.submit, isSubmitting && styles.disabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color={LoginColors.white} />
        ) : (
          <Text style={styles.submitText}>登录</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  formInner: {
    borderWidth: 2,
    borderColor: LoginColors.formLine,
    borderRadius: LoginSizes.formInnerBorderRadius,
    backgroundColor: LoginColors.formInnerBg,
    padding: LoginSizes.formInnerPadding,
    gap: 14,
  },
  methodTitle: {
    fontSize: LoginSizes.methodTitleFontSize,
    fontWeight: LoginWeights.extraBlack,
    color: LoginColors.wechatGreenModal,
    textAlign: 'center',
  },
  wechatBtn: {
    height: LoginSizes.wechatBtnHeight,
    borderRadius: LoginSizes.wechatBtnBorderRadius,
    backgroundColor: LoginColors.wechatGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wechatBtnText: {
    fontSize: LoginSizes.wechatBtnFontSize,
    fontWeight: LoginWeights.black,
    color: LoginColors.white,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  orLine: {
    flex: 1,
    height: 2,
    backgroundColor: LoginColors.orLine,
  },
  orText: {
    fontSize: LoginSizes.orFontSize,
    fontWeight: LoginWeights.bold,
    color: LoginColors.orText,
  },
  phoneLabel: {
    fontSize: LoginSizes.phoneLabelFontSize,
    fontWeight: LoginWeights.black,
    color: LoginColors.phoneLabel,
  },
  field: {
    height: LoginSizes.fieldHeight,
    borderWidth: LoginSizes.fieldBorderWidth,
    borderColor: LoginColors.inputBorder,
    borderRadius: LoginSizes.fieldBorderRadius,
    paddingHorizontal: 16,
    fontSize: LoginSizes.fieldFontSize,
    color: LoginColors.fieldText,
    backgroundColor: LoginColors.fieldBg,
  },
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  remember: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: LoginSizes.checkboxSize,
    height: LoginSizes.checkboxSize,
    borderRadius: LoginSizes.checkboxSize / 2,
    borderWidth: 2,
    borderColor: LoginColors.checkboxBorder,
    backgroundColor: LoginColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: LoginColors.orange,
    backgroundColor: LoginColors.orange,
  },
  checkboxInnerDot: {
    width: LoginSizes.checkboxInnerDotSize,
    height: LoginSizes.checkboxInnerDotSize,
    borderRadius: LoginSizes.checkboxInnerDotSize / 2,
    backgroundColor: LoginColors.white,
  },
  rememberLabel: {
    fontSize: LoginSizes.rememberForgotFontSize,
    fontWeight: LoginWeights.semiBold,
    color: LoginColors.rememberForgot,
  },
  forgot: {
    fontSize: LoginSizes.rememberForgotFontSize,
    fontWeight: LoginWeights.semiBold,
    color: LoginColors.rememberForgot,
  },
  submit: {
    height: LoginSizes.submitHeight,
    borderRadius: LoginSizes.submitBorderRadius,
    backgroundColor: LoginColors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: LoginSizes.submitFontSize,
    fontWeight: LoginWeights.extraBlack,
    color: LoginColors.white,
  },
  disabled: {
    opacity: 0.65,
  },
});
