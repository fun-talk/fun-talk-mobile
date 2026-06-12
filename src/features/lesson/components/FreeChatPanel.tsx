import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { localImage } from '@/lib/assets/localImage';
import type { RecordingControllerState } from '../recordingController';
import { getFreeChatPanelViewState } from '../freeChatPanelState';

type FreeChatPanelProps = {
  assistantPlaybackPending: boolean;
  state: RecordingControllerState;
  scale: number;
};

const freeChatImages = {
  mic: localImage(require('@/assets/images/lesson/mic_icon.png')),
};

export function FreeChatPanel({ assistantPlaybackPending, state, scale }: FreeChatPanelProps) {
  const viewState = getFreeChatPanelViewState({ assistantPlaybackPending, state });

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
              opacity: viewState.iconOpacity,
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
                  backgroundColor: viewState.dotColor,
                  opacity: viewState.showPulse ? 1 : 0.88,
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
              {viewState.statusText}
            </Text>
          </View>
          <Text
            style={[
              styles.helperText,
              {
                marginTop: 10 * scale,
                fontSize: 20 * scale,
                lineHeight: 24 * scale,
              },
            ]}
          >
            {viewState.helperText}
          </Text>
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
