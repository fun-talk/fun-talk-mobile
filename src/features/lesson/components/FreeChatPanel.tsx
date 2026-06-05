import { Image, type ImageSource } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RecordingControllerState } from '../recordingController';

type FreeChatPanelProps = {
  state: RecordingControllerState;
  targetText: string;
  scale: number;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  onSubmit: () => void;
};

function localImage(moduleId: number): ImageSource {
  return moduleId as unknown as ImageSource;
}

const freeChatImages = {
  mic: localImage(require('@/assets/images/lesson/mic_icon.png')),
  speaker: localImage(require('@/assets/images/lesson/speaker-icon.png')),
};

function getFreeChatStatusText(state: RecordingControllerState): string {
  if (state.status === 'recording' || state.status === 'auto_stopping') {
    return '正在收音，请说话...';
  }
  if (state.status === 'recorded') {
    return state.hasSpeech ? '说完后提交给欧波' : '没有听清，可以重录';
  }
  if (state.status === 'submitted') {
    return '正在思考中..';
  }
  if (state.status === 'permission_denied') {
    return '需要麦克风权限';
  }
  if (state.status === 'error') {
    return '录音遇到问题';
  }
  return '准备和欧波聊聊';
}

function getStatusDotColor(state: RecordingControllerState): string {
  if (state.status === 'submitted') {
    return '#0BCD3F';
  }
  if (state.status === 'recording' || state.status === 'auto_stopping') {
    return '#FC3B19';
  }
  return '#FC3B19';
}

function formatDuration(durationMs: number): string {
  return `${Math.max(0, Math.round(durationMs / 1000))}s`;
}

export function FreeChatPanel({
  state,
  targetText,
  scale,
  onStart,
  onStop,
  onCancel,
  onSubmit,
}: FreeChatPanelProps) {
  const canStart =
    state.status === 'idle' ||
    state.status === 'recorded' ||
    state.status === 'submitted' ||
    state.status === 'cancelled' ||
    state.status === 'error';
  const canStop = state.status === 'recording' || state.status === 'auto_stopping';
  const canSubmit = state.status === 'recorded' && Boolean(state.recordingUri);
  const iconSource = canStop ? freeChatImages.mic : freeChatImages.speaker;
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
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusDot,
            {
              width: 28 * scale,
              height: 28 * scale,
              borderRadius: 14 * scale,
              backgroundColor: getStatusDotColor(state),
            },
          ]}
        />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[
            styles.statusText,
            {
              fontSize: 41.54 * scale,
              lineHeight: 46 * scale,
            },
          ]}
        >
          {statusText}
        </Text>
      </View>
      <View style={[styles.contentRow, { marginTop: 16 * scale }]}>
        <Pressable
          accessibilityRole="button"
          disabled={!canStart && !canStop}
          onPress={canStop ? onStop : onStart}
          style={({ pressed }) => [
            styles.iconButton,
            {
              width: 146.13 * scale,
              height: 146.26 * scale,
              opacity: pressed ? 0.82 : 1,
            },
          ]}
        >
          <Image source={iconSource} style={styles.iconImage} contentFit="contain" />
        </Pressable>

        <View style={[styles.promptColumn, { marginLeft: 24 * scale }]}>
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            style={[
              styles.promptText,
              {
                fontSize: 55.42 * scale,
                lineHeight: 66 * scale,
              },
            ]}
          >
            {targetText || '准备和欧波聊聊'}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.helperText,
              {
                marginTop: 8 * scale,
                fontSize: 22 * scale,
                lineHeight: 28 * scale,
              },
            ]}
          >
            {state.errorText || `自由对话录音 · ${formatDuration(state.durationMs)}`}
          </Text>
        </View>

        <View style={[styles.actions, { marginLeft: 18 * scale, gap: 8 * scale }]}>
          {canStop ? (
            <Pressable
              accessibilityRole="button"
              onPress={onStop}
              style={[styles.primaryButton, { minHeight: 54 * scale, borderRadius: 16 * scale }]}
            >
              <Text style={[styles.primaryButtonText, { fontSize: 22 * scale }]}>停止</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={!canStart}
              onPress={onStart}
              style={[
                styles.primaryButton,
                { minHeight: 54 * scale, borderRadius: 16 * scale },
                !canStart && styles.disabledButton,
              ]}
            >
              <Text style={[styles.primaryButtonText, { fontSize: 22 * scale }]}>开始说话</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={onSubmit}
            style={[
              styles.submitButton,
              { minHeight: 54 * scale, borderRadius: 16 * scale },
              !canSubmit && styles.disabledButton,
            ]}
          >
            <Text style={[styles.secondaryButtonText, { fontSize: 20 * scale }]}>提交</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={[styles.resetButton, { minHeight: 54 * scale, borderRadius: 16 * scale }]}
          >
            <Text style={[styles.resetButtonText, { fontSize: 20 * scale }]}>重置</Text>
          </Pressable>
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusDot: {},
  statusText: {
    color: '#000000',
    fontWeight: '500',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 0,
  },
  iconButton: {
    padding: 0,
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
  promptColumn: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  promptText: {
    color: '#fd7a0d',
    fontWeight: '600',
    textAlign: 'left',
  },
  helperText: {
    color: '#475569',
    fontWeight: '700',
  },
  actions: {
    width: 150,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 8,
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingHorizontal: 8,
  },
  resetButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#93c5fd',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  resetButtonText: {
    color: '#075985',
    fontWeight: '900',
  },
});
