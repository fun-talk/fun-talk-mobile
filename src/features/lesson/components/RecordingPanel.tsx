import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RecordingControllerState } from '../recordingController';

type RecordingPanelProps = {
  state: RecordingControllerState;
  isFreeChat: boolean;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  onSubmit: () => void;
};

function formatDuration(durationMs: number): string {
  return `${Math.max(0, Math.round(durationMs / 1000))}s`;
}

function statusLabel(state: RecordingControllerState): string {
  if (state.status === 'recording') {
    return state.hasSpeech ? '检测到语音' : '正在听';
  }
  if (state.status === 'auto_stopping') {
    return '正在自动收尾';
  }
  if (state.status === 'recorded') {
    return state.hasSpeech ? '录音已准备好' : '录到静音，可重录';
  }
  if (state.status === 'submitted') {
    return '已提交';
  }
  if (state.status === 'permission_denied') {
    return '麦克风未授权';
  }
  if (state.status === 'error') {
    return '录音异常';
  }
  return '准备中';
}

export function RecordingPanel({
  state,
  isFreeChat,
  onStart,
  onStop,
  onCancel,
  onSubmit,
}: RecordingPanelProps) {
  const canStart =
    state.status === 'idle' ||
    state.status === 'recorded' ||
    state.status === 'submitted' ||
    state.status === 'cancelled' ||
    state.status === 'error';
  const canStop = state.status === 'recording' || state.status === 'auto_stopping';
  const canSubmit = state.status === 'recorded' && Boolean(state.recordingUri);

  return (
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>{isFreeChat ? '自由对话录音' : '跟读录音'}</Text>
        <Text style={styles.duration}>{formatDuration(state.durationMs)}</Text>
      </View>
      <Text style={styles.status}>{statusLabel(state)}</Text>
      <Text style={styles.helper}>
        {state.errorText ||
          (state.status === 'recording'
            ? '说完后可手动提交；静音或超时会自动收尾。'
            : '点击开始后对着麦克风说话。')}
      </Text>
      <View style={styles.actions}>
        {canStop ? (
          <Pressable accessibilityRole="button" onPress={onStop} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>停止</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={!canStart}
            onPress={onStart}
            style={[styles.primaryButton, !canStart && styles.disabledButton]}
          >
            <Text style={styles.primaryButtonText}>开始录音</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={onSubmit}
          style={[styles.submitButton, !canSubmit && styles.disabledButton]}
        >
          <Text style={styles.secondaryButtonText}>提交录音</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>重置</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  kicker: {
    color: '#0369a1',
    fontSize: 13,
    fontWeight: '900',
  },
  duration: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
  },
  status: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },
  helper: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryButton: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 13,
  },
  submitButton: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#16a34a',
    paddingHorizontal: 13,
  },
  secondaryButton: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#93c5fd',
    backgroundColor: '#ffffff',
    paddingHorizontal: 13,
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  secondaryButtonText: {
    color: '#075985',
    fontSize: 12,
    fontWeight: '900',
  },
});

