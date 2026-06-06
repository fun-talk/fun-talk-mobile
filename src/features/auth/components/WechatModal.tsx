import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { isWechatLoginSupported } from '../services/wechatNative';
import { LoginColors, LoginSizes, LoginWeights } from './LoginConstants';

type WechatModalProps = {
  visible: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onWechatLogin: () => void;
};

export function WechatModal({ visible, isSubmitting, onClose, onWechatLogin }: WechatModalProps) {
  const wechatSupported = isWechatLoginSupported();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Pressable style={styles.closeBtn} onPress={onClose} disabled={isSubmitting}>
            <Text style={styles.closeBtnText}>×</Text>
          </Pressable>

          <Text style={styles.title}>微信扫码登录</Text>

          <View style={styles.qrBox}>
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrPlaceholderIcon}>💬</Text>
              <Text style={styles.qrPlaceholderText}>
                {wechatSupported
                  ? '点击下方按钮\n通过微信授权登录'
                  : '微信登录仅支持\niOS / Android 真机'}
              </Text>
            </View>
          </View>

          {wechatSupported ? (
            <Pressable
              style={[styles.wechatLoginBtn, isSubmitting && styles.disabled]}
              onPress={onWechatLogin}
              disabled={isSubmitting}>
              <Text style={styles.wechatLoginBtnText}>微信登录</Text>
            </Pressable>
          ) : null}

          <Text style={styles.meta}>
            {wechatSupported
              ? '请使用微信授权登录'
              : '请使用 development build 或正式包'}
          </Text>
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
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 28,
    borderRadius: LoginSizes.modalBorderRadius,
    backgroundColor: LoginColors.modalDialogBg,
    alignItems: 'center',
    shadowColor: LoginColors.shadowColor,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.18,
    shadowRadius: 48,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: LoginSizes.modalCloseSize,
    height: LoginSizes.modalCloseSize,
    borderRadius: LoginSizes.modalCloseSize / 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 28,
    lineHeight: 30,
    color: LoginColors.modalCloseBtn,
  },
  title: {
    marginBottom: 16,
    fontSize: 28,
    fontWeight: LoginWeights.extraBlack,
    color: LoginColors.wechatGreenModal,
    textAlign: 'center',
  },
  qrBox: {
    width: 260,
    aspectRatio: 1,
    padding: 14,
    borderWidth: 14,
    borderColor: 'rgba(255,255,255,0.96)',
    borderRadius: 24,
    backgroundColor: '#f4f6fa',
    overflow: 'hidden',
  },
  qrPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  qrPlaceholderText: {
    fontSize: 15,
    fontWeight: LoginWeights.extraBold,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  wechatLoginBtn: {
    marginTop: 16,
    width: 260,
    height: 48,
    borderRadius: 14,
    backgroundColor: LoginColors.wechatGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wechatLoginBtnText: {
    fontSize: 18,
    fontWeight: LoginWeights.black,
    color: LoginColors.white,
  },
  disabled: {
    opacity: 0.65,
  },
  meta: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: LoginWeights.extraBold,
    color: '#666',
    textAlign: 'center',
  },
});
