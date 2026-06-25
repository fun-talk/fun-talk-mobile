import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LoginColors, LoginSizes, LoginWeights } from './LoginConstants';

type AccountAgreementProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function AccountAgreement({ checked, onChange, disabled = false }: AccountAgreementProps) {
  return (
    <Pressable
      style={styles.row}
      onPress={() => onChange(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <Text style={styles.label}>
        我已阅读并同意
        <Text style={styles.link}>《用户协议》</Text>
        、
        <Text style={styles.link}>《隐私协议》</Text>
        和
        <Text style={styles.link}>《儿童隐私政策》</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: LoginSizes.agreementGap,
    marginTop: 18,
  },
  checkbox: {
    width: LoginSizes.checkboxSize,
    height: LoginSizes.checkboxSize,
    borderRadius: LoginSizes.checkboxRadius,
    borderWidth: 1.5,
    borderColor: LoginColors.checkboxBorder,
    backgroundColor: LoginColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxChecked: {
    borderColor: LoginColors.checkboxAccent,
    backgroundColor: LoginColors.checkboxAccent,
  },
  checkmark: {
    fontSize: 12,
    fontWeight: '900',
    color: LoginColors.white,
    lineHeight: 14,
  },
  label: {
    flex: 1,
    fontSize: LoginSizes.agreementFontSize,
    fontWeight: '500',
    color: LoginColors.agreementText,
    lineHeight: LoginSizes.agreementFontSize * 1.5,
    textAlign: 'left',
  },
  link: {
    color: LoginColors.agreementLink,
    fontWeight: LoginWeights.bold,
  },
});
