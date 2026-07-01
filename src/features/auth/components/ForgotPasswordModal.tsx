import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LANDSCAPE_MODAL_ORIENTATIONS } from '@/constants/orientation';
import { showErrorToast } from '@/lib/toast';
import { LoginColors, LoginSizes, LoginWeights } from './LoginConstants';

type ForgotPasswordModalProps = {
  visible: boolean;
  initialDigitalId?: string;
  onSubmit: (digitalId: string) => Promise<{ message: string }>;
  onClose: () => void;
};

export function ForgotPasswordModal({
  visible,
  initialDigitalId = '',
  onSubmit,
  onClose,
}: ForgotPasswordModalProps) {
  const [digitalId, setDigitalId] = useState(initialDigitalId);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async () => {
    const trimmed = digitalId.trim();
    if (!trimmed) {
      showErrorToast('请输入学生数字编号');
      return;
    }
    setLoading(true);
    try {
      const result = await onSubmit(trimmed);
      setSuccessMessage(result.message);
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : '提交失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccessMessage('');
    setDigitalId(initialDigitalId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      supportedOrientations={LANDSCAPE_MODAL_ORIENTATIONS}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.dialog} onPress={() => {}}>
          {/* Close button — web .account-modal-close */}
          <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={12}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>

          <Text style={styles.title}>忘记密码</Text>
          <Text style={styles.subtitle}>
            输入学生数字编号，系统将短信通知可处理的管理员和教学老师。
          </Text>

          {successMessage ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>学生数字编号</Text>
                <TextInput
                  style={styles.input}
                  value={digitalId}
                  onChangeText={(text) => setDigitalId(text.replace(/\D/g, '').slice(0, 8))}
                  placeholder="请输入 8 位数字编号"
                  placeholderTextColor={LoginColors.inputPlaceholder}
                  keyboardType="number-pad"
                  maxLength={8}
                  editable={!loading}
                />
              </View>

              <Pressable
                style={[styles.submitBtn, (loading || !digitalId.trim()) && styles.disabled]}
                onPress={handleSubmit}
                disabled={loading || !digitalId.trim()}
              >
                {loading ? (
                  <ActivityIndicator color={LoginColors.white} />
                ) : (
                  <Text style={styles.submitText}>通知老师重置密码</Text>
                )}
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  /* ── Backdrop (web .account-modal-backdrop) ── */
  backdrop: {
    flex: 1,
    backgroundColor: LoginColors.modalBackdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  /* ── Dialog (web .account-modal) ── */
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: LoginColors.modalBg,
    borderRadius: LoginSizes.modalBorderRadius,
    padding: LoginSizes.modalPadding,
    position: 'relative',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    zIndex: 5,
    width: LoginSizes.modalCloseSize,
    height: LoginSizes.modalCloseSize,
    borderRadius: 999,
    backgroundColor: LoginColors.modalCloseBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 20,
    color: LoginColors.modalCloseText,
    fontWeight: '400',
  },

  /* ── Title (web .account-modal-title) ── */
  title: {
    fontSize: LoginSizes.modalTitleFontSize,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: LoginSizes.noteFontSize,
    color: LoginColors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },

  /* ── Error (web .account-error) ── */
  errorBox: {
    backgroundColor: LoginColors.errorBg,
    borderWidth: 1,
    borderColor: LoginColors.errorBorder,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  errorText: {
    fontSize: LoginSizes.noteFontSize,
    fontWeight: LoginWeights.semiBold,
    color: LoginColors.errorText,
    textAlign: 'center',
  },

  /* ── Field + Input ── */
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

  /* ── Submit (web .account-btn-primary) ── */
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

  /* ── Success ── */
  successBox: {
    backgroundColor: LoginColors.infoGreenBg,
    borderWidth: 1,
    borderColor: LoginColors.infoGreenBorder,
    borderRadius: LoginSizes.infoBoxRadius,
    paddingVertical: LoginSizes.infoBoxPaddingV,
    paddingHorizontal: LoginSizes.infoBoxPaddingH,
  },
  successText: {
    fontSize: LoginSizes.noteFontSize,
    fontWeight: LoginWeights.semiBold,
    color: LoginColors.infoGreenText,
    textAlign: 'center',
    lineHeight: 20,
  },
});
