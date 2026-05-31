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
  onSubmit: (school: string, className: string, studentName: string, schoolCode: string) => void;
};

export function SchoolForm({ isSubmitting, onSubmit }: SchoolFormProps) {
  const [school, setSchool] = useState('');
  const [className, setClassName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');

  const handleSubmit = () => {
    onSubmit(school, className, studentName, schoolCode);
  };

  return (
    <View style={styles.formInner}>
      <Text style={styles.methodTitle}>学校登录</Text>

      <TextInput
        style={styles.field}
        value={school}
        onChangeText={setSchool}
        placeholder="请输入学校名称"
        placeholderTextColor={LoginColors.fieldPlaceholder}
        autoCapitalize="none"
        editable={!isSubmitting}
      />

      <TextInput
        style={styles.field}
        value={className}
        onChangeText={setClassName}
        placeholder="请输入班级"
        placeholderTextColor={LoginColors.fieldPlaceholder}
        editable={!isSubmitting}
      />

      <TextInput
        style={styles.field}
        value={studentName}
        onChangeText={setStudentName}
        placeholder="请输入姓名"
        placeholderTextColor={LoginColors.fieldPlaceholder}
        autoCapitalize="none"
        editable={!isSubmitting}
      />

      <TextInput
        style={styles.field}
        value={schoolCode}
        onChangeText={setSchoolCode}
        placeholder="请输入密码"
        placeholderTextColor={LoginColors.fieldPlaceholder}
        secureTextEntry
        editable={!isSubmitting}
      />

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
    gap: 12,
  },
  methodTitle: {
    fontSize: LoginSizes.methodTitleFontSize,
    fontWeight: LoginWeights.extraBlack,
    color: LoginColors.blueSchool,
    textAlign: 'center',
    marginBottom: 4,
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
  submit: {
    height: LoginSizes.submitHeight,
    borderRadius: LoginSizes.submitBorderRadius,
    backgroundColor: LoginColors.blueSubmit,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
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
