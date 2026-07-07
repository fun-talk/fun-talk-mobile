import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LoginColors, LoginSizes, LoginWeights } from './LoginConstants';

type SchoolFormProps = {
  isSubmitting: boolean;
  onSubmit: (digitalId: string, password: string) => void;
  onForgotPassword?: () => void;
};

export function SchoolForm({ isSubmitting, onSubmit, onForgotPassword }: SchoolFormProps) {
  const [digitalId, setDigitalId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = () => {
    onSubmit(digitalId.trim(), password);
  };

  return (
    <View style={styles.panel}>
      {/* Digital ID field — web .account-field */}
      <View style={styles.field}>
        <Text style={styles.label}>数字编号</Text>
        <TextInput
          style={styles.input}
          value={digitalId}
          onChangeText={(text) => setDigitalId(text.replace(/\D/g, ''))}
          placeholder="请输入数字编号"
          placeholderTextColor={LoginColors.inputPlaceholder}
          keyboardType="number-pad"
          editable={!isSubmitting}
          maxLength={8}
        />
      </View>

      {/* Password field — web .account-field + .account-input-wrapper + .account-input-icon-btn */}
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

        {/* Forgot password — web .account-forgot-row */}
        {onForgotPassword ? (
          <Pressable
            style={styles.forgotRow}
            onPress={onForgotPassword}
            disabled={isSubmitting}
          >
            <Text style={styles.forgotText}>忘记密码</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Submit button — web .account-btn-primary .account-btn-block */}
      <Pressable
        style={[styles.submitBtn, isSubmitting && styles.disabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color={LoginColors.white} />
        ) : (
          <Text style={styles.submitText}>登录</Text>
        )}
      </Pressable>

      {/* Hint — web .account-info-box-green */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          点击忘记密码，系统将短信通知可接收通知的管理员和教学老师。请等待老师重置密码。
        </Text>
      </View>
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

  /* ── Forgot password (web .account-forgot-row .account-forgot-inline) ── */
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: 6,
  },
  forgotText: {
    fontSize: LoginSizes.captionFontSize,
    fontWeight: LoginWeights.bold,
    color: LoginColors.blueSchool,
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

  /* ── Info box (web .account-info-box-green) ── */
  infoBox: {
    backgroundColor: LoginColors.infoGreenBg,
    borderWidth: 1,
    borderColor: LoginColors.infoGreenBorder,
    borderRadius: LoginSizes.infoBoxRadius,
    paddingVertical: LoginSizes.infoBoxPaddingV,
    paddingHorizontal: LoginSizes.infoBoxPaddingH,
    marginTop: 14,
  },
  infoText: {
    fontSize: LoginSizes.captionFontSize,
    color: LoginColors.infoGreenText,
    lineHeight: 21,
  },
});
