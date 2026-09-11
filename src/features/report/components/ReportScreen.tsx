import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { LoginColors, LoginSizes, LoginWeights } from '@/features/auth/components/LoginConstants';
import { useAuth } from '@/features/auth';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

import { useReportForm } from '../hooks/useReportForm';
import { pickReportImage } from '../services/imagePicker';
import { ReportHistoryList } from './ReportHistoryList';
import { ReportTypePicker } from './ReportTypePicker';
import { ImagePreview } from './ImagePreview';

export function ReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { apiClient } = useAuth();
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const {
    form,
    isSubmitting,
    resultMessage,
    errorMessage,
    canAddScreenshot,
    setReportType,
    setContent,
    setContact,
    setTarget,
    addScreenshot,
    removeScreenshot,
    submit,
    resetMessages,
  } = useReportForm(apiClient);

  const handleAddImage = async () => {
    resetMessages();
    try {
      const image = await pickReportImage();
      if (image) {
        addScreenshot(image);
      }
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : '选择图片失败');
    }
  };

  const handleSubmit = async () => {
    resetMessages();
    const result = await submit();
    if (result.success) {
      showSuccessToast(result.message);
      // Refresh the local report history so the newly submitted report appears.
      setHistoryRefreshKey((prev) => prev + 1);
    } else if (result.message) {
      showErrorToast(result.message);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>投诉与建议</Text>
          <Pressable
            style={styles.closeBtn}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="返回"
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 32,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>
            如果您发现不良内容、不当行为、隐私泄露、诱导消费或其他问题，欢迎向我们反馈。我们将尽快核实并处理。
          </Text>

          <View style={styles.card}>
            {/* Report type */}
            <View style={styles.field}>
              <Text style={styles.label}>
                举报类型 <Text style={styles.required}>*</Text>
              </Text>
              <ReportTypePicker
                value={form.reportType}
                onChange={setReportType}
                disabled={isSubmitting}
              />
            </View>

            {/* Report content */}
            <View style={styles.field}>
              <Text style={styles.label}>
                举报内容 <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.content}
                onChangeText={setContent}
                placeholder="请详细描述您遇到的问题，包括发生时间、涉及内容等"
                placeholderTextColor={LoginColors.inputPlaceholder}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={1000}
                editable={!isSubmitting}
              />
              <Text style={styles.hint}>{form.content.length}/1000</Text>
            </View>

            {/* Contact */}
            <View style={styles.field}>
              <Text style={styles.label}>
                联系方式 <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={form.contact}
                onChangeText={setContact}
                placeholder="请输入手机号或邮箱，便于反馈处理结果"
                placeholderTextColor={LoginColors.inputPlaceholder}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isSubmitting}
              />
            </View>

            {/* Reported target */}
            <View style={styles.field}>
              <Text style={styles.label}>被举报对象（选填）</Text>
              <TextInput
                style={styles.input}
                value={form.target}
                onChangeText={setTarget}
                placeholder="如：用户昵称、课程名称、内容ID等"
                placeholderTextColor={LoginColors.inputPlaceholder}
                editable={!isSubmitting}
              />
            </View>

            {/* Screenshots */}
            <View style={styles.field}>
              <Text style={styles.label}>相关截图（选填，最多3张）</Text>
              <ImagePreview
                images={form.screenshots}
                onRemove={removeScreenshot}
                disabled={isSubmitting}
              />
              {canAddScreenshot ? (
                <Pressable
                  style={[
                    styles.imageBtn,
                    isSubmitting && styles.imageBtnDisabled,
                  ]}
                  onPress={handleAddImage}
                  disabled={isSubmitting}
                >
                  <Text style={styles.imageBtnText}>+ 上传截图</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Messages */}
            {errorMessage ? (
              <View style={[styles.messageBox, styles.errorBox]}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
            {resultMessage ? (
              <View style={[styles.messageBox, styles.successBox]}>
                <Text style={styles.successText}>{resultMessage}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <Pressable
              style={[styles.submitBtn, isSubmitting && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={LoginColors.white} />
              ) : (
                <Text style={styles.submitText}>提交举报</Text>
              )}
            </Pressable>

            <Text style={styles.privacyHint}>
              提交即表示您同意我们按照《隐私政策》收集、使用并保护您填写的信息。
            </Text>
          </View>

          <ReportHistoryList refreshKey={historyRefreshKey} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LoginColors.skyBg,
  },
  keyboardWrap: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: LoginColors.line,
    backgroundColor: LoginColors.white,
  },
  headerTitle: {
    fontSize: LoginSizes.titleFontSize,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: LoginColors.modalCloseBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.textMuted,
  },
  scroll: {
    flex: 1,
  },
  intro: {
    fontSize: 14,
    lineHeight: 22,
    color: LoginColors.textMuted,
    marginTop: 16,
    marginBottom: 16,
  },
  card: {
    backgroundColor: LoginColors.cardBg,
    borderWidth: 1,
    borderColor: LoginColors.cardBorder,
    borderRadius: LoginSizes.cardBorderRadius,
    padding: 20,
    marginBottom: 24,
    shadowColor: LoginColors.cardShadow,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 40,
    elevation: 8,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: LoginSizes.labelFontSize,
    fontWeight: LoginWeights.bold,
    color: LoginColors.textLabel,
    marginBottom: LoginSizes.labelMarginBottom,
  },
  required: {
    color: LoginColors.error,
  },
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
  textArea: {
    height: 140,
    paddingTop: 14,
    lineHeight: 22,
  },
  hint: {
    fontSize: 12,
    color: LoginColors.textMuted,
    textAlign: 'right',
    marginTop: 6,
  },
  imageBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: LoginColors.inputBorder,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: LoginColors.inputBg,
  },
  imageBtnDisabled: {
    opacity: 0.55,
  },
  imageBtnText: {
    fontSize: 14,
    fontWeight: LoginWeights.bold,
    color: LoginColors.textMuted,
  },
  messageBox: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: LoginColors.errorBg,
    borderWidth: 1,
    borderColor: LoginColors.errorBorder,
  },
  errorText: {
    fontSize: 14,
    fontWeight: LoginWeights.semiBold,
    color: LoginColors.errorText,
    lineHeight: 20,
  },
  successBox: {
    backgroundColor: LoginColors.infoGreenBg,
    borderWidth: 1,
    borderColor: LoginColors.infoGreenBorder,
  },
  successText: {
    fontSize: 14,
    fontWeight: LoginWeights.semiBold,
    color: LoginColors.success,
    lineHeight: 20,
  },
  submitBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: LoginColors.primaryEnd,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: LoginColors.primaryShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 6,
  },
  submitDisabled: {
    opacity: 0.55,
  },
  submitText: {
    fontSize: 16,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.white,
  },
  privacyHint: {
    fontSize: 12,
    color: LoginColors.textMuted,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 18,
  },
});
