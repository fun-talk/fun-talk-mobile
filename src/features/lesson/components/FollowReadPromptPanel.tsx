import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { localImage } from '@/lib/assets/localImage';

import type { RecordingControllerState } from '../recordingController';

type FollowReadPromptPanelProps = {
  state: RecordingControllerState;
  scale: number;
  instructionText: string;
  targetText: string;
  hasPromptAudio: boolean;
  onReplayPrompt?: () => void;
};

const lessonImages = {
  speaker: localImage(require('@/assets/images/lesson/speaker-icon.png')),
};

function getStatusText(state: RecordingControllerState, instructionText: string): string {
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
    return state.errorText || '跟读开麦失败，请检查麦克风权限';
  }
  if (state.status === 'error') {
    return state.errorText || '跟读开麦失败，请检查麦克风权限';
  }
  return instructionText || '请大声跟读';
}

function getStatusDotColor(state: RecordingControllerState): string {
  if (state.status === 'submitted') {
    return '#0BCD3F';
  }
  return '#FC3B19';
}

export function FollowReadPromptPanel({
  state,
  scale,
  instructionText,
  targetText,
  hasPromptAudio,
  onReplayPrompt,
}: FollowReadPromptPanelProps) {
  const statusText = getStatusText(state, instructionText);
  const showPulse = state.status === 'recording' || state.status === 'auto_stopping';
  const lines = targetText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2);

  return (
    <View
      style={[
        styles.panel,
        {
          borderRadius: 38 * scale,
          paddingHorizontal: 40 * scale,
          paddingTop: 24 * scale,
          paddingBottom: 28 * scale,
        },
      ]}
    >
      <View style={styles.gradientTop} pointerEvents="none" />
      <View style={[styles.statusRow, { gap: 16 * scale, marginBottom: 16 * scale }]}>
        <View
          style={[
            styles.statusDot,
            {
              width: 28 * scale,
              height: 28 * scale,
              borderRadius: 14 * scale,
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
              fontSize: 41.54 * scale,
              lineHeight: 50 * scale,
            },
          ]}
        >
          {statusText}
        </Text>
      </View>

      <View style={styles.contentRow}>
        <Pressable
          accessibilityRole="button"
          disabled={!hasPromptAudio}
          onPress={onReplayPrompt}
          style={[
            styles.speakerButton,
            {
              width: 146.13 * scale,
              height: 146.26 * scale,
              opacity: hasPromptAudio ? 1 : 0.45,
            },
          ]}
        >
          <Image source={lessonImages.speaker} style={StyleSheet.absoluteFill} contentFit="contain" />
        </Pressable>
        <View style={[styles.textGroup, { marginLeft: 24 * scale }]}>
          {lines.map((line, index) => (
            <Text
              key={`${line}-${index}`}
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[
                styles.targetText,
                {
                  fontSize: 55.42 * scale,
                  lineHeight: 66 * scale,
                },
              ]}
            >
              {line}
            </Text>
          ))}
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
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speakerButton: {
    overflow: 'hidden',
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  textGroup: {
    flex: 1,
    justifyContent: 'center',
  },
  targetText: {
    color: '#FD7A0D',
    fontWeight: '600',
  },
});
