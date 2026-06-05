import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import type { RecordingControllerState } from '../recordingController';

type FreeChatPanelProps = {
  state: RecordingControllerState;
  scale: number;
};

function localImage(moduleId: number): ImageSource {
  return moduleId as unknown as ImageSource;
}

const freeChatImages = {
  mic: localImage(require('@/assets/images/lesson/mic_icon.png')),
};

function getFreeChatStatusText(state: RecordingControllerState): string {
  if (state.status === 'recording' || state.status === 'auto_stopping') {
    return '正在收音，请说话...';
  }
  if (state.status === 'recorded') {
    return '已停录，正在自动提交...';
  }
  if (state.status === 'submitted') {
    return '正在思考中..';
  }
  if (state.status === 'permission_denied') {
    return '自由对话开麦失败，请检查麦克风权限';
  }
  if (state.status === 'error') {
    return state.errorText || '自由对话开麦失败，请检查麦克风权限';
  }
  return '准备和欧波聊聊';
}

function getStatusDotColor(state: RecordingControllerState): string {
  if (state.status === 'submitted') {
    return '#0BCD3F';
  }
  return '#FC3B19';
}

export function FreeChatPanel({ state, scale }: FreeChatPanelProps) {
  const showPulse = state.status === 'recording' || state.status === 'auto_stopping';
  const statusText = getFreeChatStatusText(state);

  return (
    <View
      style={[
        styles.panel,
        {
          borderRadius: 38 * scale,
          paddingHorizontal: 40 * scale,
          paddingVertical: 24 * scale,
        },
      ]}
    >
      <View style={styles.gradientTop} pointerEvents="none" />
      <View style={styles.contentRow}>
        <Image
          source={freeChatImages.mic}
          style={[
            styles.iconImage,
            {
              width: 146.13 * scale,
              height: 146.26 * scale,
              opacity: showPulse ? 1 : 0.92,
            },
          ]}
          contentFit="contain"
        />
        <View style={[styles.statusGroup, { marginLeft: 28 * scale }]}>
          <View style={[styles.statusRow, { gap: 16 * scale }]}>
            <View
              style={[
                styles.statusDot,
                {
                  width: 30 * scale,
                  height: 30 * scale,
                  borderRadius: 15 * scale,
                  backgroundColor: getStatusDotColor(state),
                  opacity: showPulse ? 1 : 0.88,
                },
              ]}
            />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[
                styles.statusText,
                {
                  fontSize: 48 * scale,
                  lineHeight: 58 * scale,
                },
              ]}
            >
              {statusText}
            </Text>
          </View>
          {state.status !== 'recording' && state.status !== 'auto_stopping' ? (
            <Text
              numberOfLines={1}
              style={[
                styles.helperText,
                {
                  marginTop: 10 * scale,
                  fontSize: 20 * scale,
                  lineHeight: 24 * scale,
                },
              ]}
            >
              {state.status === 'submitted'
                ? '欧波正在回复你'
                : `自由对话自动收音 · ${Math.max(0, Math.round(state.durationMs / 1000))}s`}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    overflow: 'hidden',
    backgroundColor: '#c3e2ff',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
    backgroundColor: '#f6faff',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconImage: {
    flexShrink: 0,
  },
  statusGroup: {
    flex: 1,
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    flexShrink: 0,
  },
  statusText: {
    flexShrink: 1,
    color: '#000000',
    fontWeight: '500',
    textAlign: 'center',
  },
  helperText: {
    color: '#475569',
    fontWeight: '700',
    textAlign: 'center',
  },
});
