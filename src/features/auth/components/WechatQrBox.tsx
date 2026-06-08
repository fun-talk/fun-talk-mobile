import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import type { QrLoginState } from '../hooks/useWechatQrLogin';
import { LoginColors } from './LoginConstants';

type WechatQrBoxProps = QrLoginState & {
  size: number;
  onRefresh: () => void;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function WechatQrBox({ qrUrl, status, expiresIn, size, onRefresh }: WechatQrBoxProps) {
  const showOverlay = status === 'scanned' || status === 'confirmed' || status === 'expired';
  const isWaiting = status === 'waiting';
  const isLowTime = expiresIn > 0 && expiresIn < 60;

  return (
    <View style={styles.container}>
      {/* QR Code area */}
      <View style={[styles.qrBox, { width: size, height: size }]}>
        {status === 'loading' || !qrUrl ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#07C160" />
          </View>
        ) : (
          <QRCode
            value={qrUrl}
            size={size - 16}
            backgroundColor="#ffffff"
            color="#000000"
            quietZone={8}
          />
        )}

        {/* Status overlay */}
        {showOverlay && (
          <View style={[styles.overlay, status === 'expired' ? styles.overlayExpired : styles.overlaySuccess]}>
            {status === 'scanned' && (
              <Text style={styles.overlayText}>扫码成功{'\n'}请在手机确认</Text>
            )}
            {status === 'confirmed' && (
              <Text style={styles.overlayText}>登录成功{'\n'}请稍候...</Text>
            )}
            {status === 'expired' && (
              <View style={styles.center}>
                <Text style={styles.overlayText}>二维码已过期</Text>
                <Pressable style={styles.refreshBtn} onPress={onRefresh}>
                  <Text style={styles.refreshBtnText}>刷新</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Meta text */}
      <Text style={styles.meta}>请使用微信扫一扫登录</Text>
      {isWaiting && expiresIn > 0 && (
        <Text style={[styles.countdown, isLowTime && styles.countdownWarning]}>
          有效期: {formatTime(expiresIn)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  qrBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  overlaySuccess: {
    backgroundColor: 'rgba(7, 193, 96, 0.88)',
  },
  overlayExpired: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  overlayText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },
  refreshBtn: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    borderRadius: 14,
  },
  refreshBtnText: {
    color: LoginColors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  meta: {
    marginTop: 8,
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.85,
  },
  countdown: {
    marginTop: 4,
    fontSize: 11,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.7,
  },
  countdownWarning: {
    color: '#ffe08a',
    opacity: 1,
    fontWeight: '600',
  },
});
