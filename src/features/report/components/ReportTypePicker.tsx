import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LoginColors, LoginSizes, LoginWeights } from '@/features/auth/components/LoginConstants';

import { REPORT_TYPE_OPTIONS, type ReportType } from '../types';

type ReportTypePickerProps = {
  value: ReportType | null;
  onChange: (value: ReportType) => void;
  disabled?: boolean;
};

export function ReportTypePicker({
  value,
  onChange,
  disabled = false,
}: ReportTypePickerProps) {
  const [visible, setVisible] = useState(false);

  const selectedLabel =
    REPORT_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
    '请选择举报类型';

  return (
    <>
      <Pressable
        style={[styles.selector, disabled && styles.selectorDisabled]}
        onPress={() => !disabled && setVisible(true)}
        disabled={disabled}
      >
        <Text
          style={[
            styles.selectorText,
            !value && styles.selectorPlaceholder,
          ]}
        >
          {selectedLabel}
        </Text>
        <Text style={styles.chevron}>▼</Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setVisible(false)}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>选择举报类型</Text>
            {REPORT_TYPE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.option,
                  value === option.value && styles.optionSelected,
                ]}
                onPress={() => {
                  onChange(option.value);
                  setVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    value === option.value && styles.optionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    height: LoginSizes.inputHeight,
    borderWidth: LoginSizes.inputBorderWidth,
    borderColor: LoginColors.inputBorder,
    borderRadius: LoginSizes.inputBorderRadius,
    paddingVertical: LoginSizes.inputPaddingV,
    paddingHorizontal: LoginSizes.inputPaddingH,
    backgroundColor: LoginColors.inputBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorDisabled: {
    opacity: 0.55,
    backgroundColor: LoginColors.inputReadonlyBg,
  },
  selectorText: {
    fontSize: LoginSizes.inputFontSize,
    fontWeight: '500',
    color: LoginColors.inputText,
  },
  selectorPlaceholder: {
    color: LoginColors.inputPlaceholder,
  },
  chevron: {
    fontSize: 12,
    color: LoginColors.textMuted,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: LoginColors.white,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    shadowColor: LoginColors.cardShadow,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 10,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 2,
  },
  optionSelected: {
    backgroundColor: LoginColors.infoBlueBg,
  },
  optionText: {
    fontSize: 16,
    fontWeight: LoginWeights.bold,
    color: LoginColors.text,
  },
  optionTextSelected: {
    color: LoginColors.infoBlueText,
  },
});
