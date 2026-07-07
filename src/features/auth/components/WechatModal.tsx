import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { LANDSCAPE_MODAL_ORIENTATIONS } from '@/constants/orientation';
import { isWechatLoginSupported } from '../services/wechatNative';
import { LoginColors, LoginSizes, LoginWeights } from './LoginConstants';

type WechatModalProps = {
  visible: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onWechatLogin: () => void;
};

export function WechatModal({
  visible,
  isSubmitting,
  onClose,
  onWechatLogin,
}: WechatModalProps) {
  const wechatSupported = isWechatLoginSupported();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      supportedOrientations={LANDSCAPE_MODAL_ORIENTATIONS}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <View style={styles.heading}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>微信登录</Text>
              </View>
              <Text style={styles.title}>微信授权登录</Text>
              <Text style={styles.subtitle}>点击下方按钮，打开微信完成授权</Text>
            </View>

            <Pressable style={styles.closeBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.closeBtnText}>×</Text>
            </Pressable>
          </View>

          {wechatSupported ? (
            <Pressable
              style={[styles.wechatLoginBtn, isSubmitting && styles.disabled]}
              onPress={onWechatLogin}
              disabled={isSubmitting}>
              <Text style={styles.wechatLoginBtnText}>打开微信授权</Text>
            </Pressable>
          ) : (
            <View style={styles.unsupportedNote}>
              <Text style={styles.unsupportedNoteText}>当前环境不支持微信登录</Text>
            </View>
          )}

          <View style={styles.note}>
            <Text style={styles.noteText}>微信授权后，本机将自动完成登录。</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: LoginColors.modalBackdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 388,
    paddingTop: 24,
    paddingBottom: 22,
    paddingHorizontal: 22,
    borderRadius: LoginSizes.modalBorderRadius,
    backgroundColor: LoginColors.modalBg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LoginColors.cardBorder,
    shadowColor: LoginColors.cardShadow,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.14,
    shadowRadius: 48,
    elevation: 12,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 18,
  },
  heading: {
    flex: 1,
    alignItems: 'flex-start',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: LoginSizes.tagRadius,
    backgroundColor: LoginColors.infoGreenBg,
    borderWidth: 1,
    borderColor: LoginColors.infoGreenBorder,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: LoginSizes.tagFontSize,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.infoGreenText,
  },
  closeBtn: {
    width: LoginSizes.modalCloseSize,
    height: LoginSizes.modalCloseSize,
    borderRadius: LoginSizes.modalCloseSize / 2,
    backgroundColor: LoginColors.modalCloseBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 24,
    lineHeight: 26,
    color: LoginColors.modalCloseText,
  },
  title: {
    fontSize: 24,
    fontWeight: LoginWeights.extraBlack,
    color: LoginColors.text,
    textAlign: 'left',
  },
  subtitle: {
    marginTop: 8,
    fontSize: LoginSizes.captionFontSize,
    lineHeight: 20,
    color: LoginColors.textMuted,
    textAlign: 'left',
  },
  unsupportedNote: {
    width: '100%',
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unsupportedNoteText: {
    fontSize: LoginSizes.captionFontSize,
    fontWeight: LoginWeights.semiBold,
    color: LoginColors.textMuted,
  },
  wechatLoginBtn: {
    marginTop: 18,
    width: '100%',
    height: LoginSizes.wechatBtnHeight,
    borderRadius: LoginSizes.wechatBtnBorderRadius,
    backgroundColor: LoginColors.wechatGreen,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: LoginColors.primaryShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 6,
  },
  wechatLoginBtnText: {
    fontSize: LoginSizes.wechatBtnFontSize,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.white,
  },
  disabled: {
    opacity: 0.65,
  },
  note: {
    width: '100%',
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: LoginSizes.infoBoxRadius,
    backgroundColor: LoginColors.infoGreenBg,
    borderWidth: 1,
    borderColor: LoginColors.infoGreenBorder,
  },
  noteText: {
    fontSize: LoginSizes.captionFontSize,
    lineHeight: 20,
    fontWeight: LoginWeights.semiBold,
    color: LoginColors.infoGreenText,
    textAlign: 'left',
  },
});
