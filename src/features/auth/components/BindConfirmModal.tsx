import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LoginColors, LoginSizes, LoginWeights } from './LoginConstants';
import type { HomeBindingPreview } from '../services/accountApi';

type BindConfirmModalProps = {
  visible: boolean;
  preview: HomeBindingPreview | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function BindConfirmModal({
  visible,
  preview,
  loading,
  onCancel,
  onConfirm,
}: BindConfirmModalProps) {
  if (!preview) return null;

  const canConfirm = !preview.student_already_bound;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.dialog} onPress={() => {}}>
          <Text style={styles.title}>确认绑定学生</Text>
          <Text style={styles.subtitle}>请核对以下信息，确认后将建立绑定关系。</Text>

          {/* Info grid — web .account-result-grid */}
          <View style={styles.resultGrid}>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>学生数字 ID</Text>
              <Text style={styles.resultValue}>{preview.digital_id}</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>昵称</Text>
              <Text style={styles.resultValue}>{preview.nickname_label}</Text>
            </View>
          </View>

          {preview.student_already_bound ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                该学生 ID 已绑定家庭账号，如需调整请联系老师或管理员
              </Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={[styles.confirmBtn, (!canConfirm || loading) && styles.disabled]}
              onPress={onConfirm}
              disabled={!canConfirm || loading}
            >
              {loading ? (
                <ActivityIndicator color={LoginColors.white} />
              ) : (
                <Text style={styles.confirmText}>确认绑定</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.cancelBtn}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: LoginColors.modalBackdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: LoginColors.modalBg,
    borderRadius: LoginSizes.modalBorderRadius,
    padding: LoginSizes.modalPadding,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
    elevation: 12,
  },
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

  /* ── Result grid (web .account-result-grid) ── */
  resultGrid: {
    backgroundColor: LoginColors.inputBg,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    borderColor: LoginColors.line,
    marginBottom: 20,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: LoginColors.secondaryBorder,
    borderStyle: 'solid',
  },
  resultLabel: {
    fontSize: LoginSizes.subtitleFontSize,
    color: LoginColors.textMuted,
    fontWeight: LoginWeights.bold,
  },
  resultValue: {
    fontSize: 18,
    color: LoginColors.text,
    fontWeight: LoginWeights.extraBold,
  },

  /* ── Error ── */
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

  /* ── Actions ── */
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmBtn: {
    flex: 1,
    height: LoginSizes.btnPaddingV * 2 + LoginSizes.inputFontSize + 4,
    borderRadius: LoginSizes.btnBorderRadius,
    backgroundColor: LoginColors.primaryEnd,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LoginSizes.btnPaddingV,
    paddingHorizontal: LoginSizes.btnPaddingH,
  },
  confirmText: {
    fontSize: LoginSizes.btnFontSize,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.white,
  },
  cancelBtn: {
    flex: 1,
    height: LoginSizes.btnPaddingV * 2 + LoginSizes.inputFontSize + 4,
    borderRadius: LoginSizes.btnBorderRadius,
    backgroundColor: LoginColors.secondaryBg,
    borderWidth: 1.5,
    borderColor: LoginColors.secondaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: LoginSizes.btnFontSize,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.secondaryText,
  },
  disabled: {
    opacity: 0.55,
  },
});
