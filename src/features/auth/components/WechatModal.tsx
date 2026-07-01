import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { LANDSCAPE_MODAL_ORIENTATIONS } from '@/constants/orientation';
import type { QrLoginState } from '../hooks/useWechatQrLogin';
import { isWechatLoginSupported } from '../services/wechatNative';
import { LoginColors, LoginSizes, LoginWeights } from './LoginConstants';
import { WechatQrBox } from './WechatQrBox';

type WechatModalProps = {
  visible: boolean;
  isSubmitting: boolean;
  qrLogin: QrLoginState & { refresh: () => void };
  onClose: () => void;
  onWechatLogin: () => void;
};

export function WechatModal({
  visible,
  isSubmitting,
  qrLogin,
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
              <Text style={styles.title}>扫码进入课程大厅</Text>
              <Text style={styles.subtitle}>使用另一台手机微信扫一扫，授权后本机自动登录</Text>
            </View>

            <Pressable style={styles.closeBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.closeBtnText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.qrPanel}>
            <WechatQrBox
              qrUrl={qrLogin.qrUrl}
              status={qrLogin.status}
              expiresIn={qrLogin.expiresIn}
              size={204}
              onRefresh={qrLogin.refresh}
              showMeta={false}
            />
          </View>

          {wechatSupported ? (
            <Pressable
              style={[styles.wechatLoginBtn, isSubmitting && styles.disabled]}
              onPress={onWechatLogin}
              disabled={isSubmitting}>
              <Text style={styles.wechatLoginBtnText}>打开微信授权</Text>
            </Pressable>
          ) : null}

          <View style={styles.note}>
            <Text style={styles.noteText}>
              {wechatSupported
                ? '扫码和按钮都可以登录；扫码适合家长用自己的手机授权。'
                : '请使用微信扫一扫二维码完成授权。'}
            </Text>
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
  qrPanel: {
    width: 252,
    aspectRatio: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: LoginColors.panelBorder,
    borderRadius: LoginSizes.panelBorderRadius,
    backgroundColor: LoginColors.white,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: LoginColors.cardShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
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
