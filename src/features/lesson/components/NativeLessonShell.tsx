import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { courseHomeImages } from '@/features/courses/assets/courseHomeAssets';

import type { NativeLessonDefinition } from '../nativeLessonTypes';
import type { NativeLessonControllerView } from '../nativeLessonController';
import { useNativeLessonScale } from '../hooks/useNativeLessonScale';

type NativeLessonShellProps = {
  lesson: NativeLessonDefinition;
  courseNumber?: string;
  totalCourses?: string;
  controllerView: NativeLessonControllerView;
  onNext: () => void;
  onPauseToggle: () => void;
  onFallback: () => void;
  onExit: () => void;
};

const WEB_CANVAS_WIDTH = 3325;
const WEB_CANVAS_HEIGHT = 1536;
const COMPACT_CANVAS_WIDTH = 1180;

function scaled(value: number, scale: number): number {
  return value * scale;
}

export function NativeLessonShell({
  lesson,
  courseNumber,
  totalCourses,
  controllerView,
  onNext,
  onPauseToggle,
  onFallback,
  onExit,
}: NativeLessonShellProps) {
  const layout = useNativeLessonScale();
  const canvasWidth = layout.isLandscapeTablet
    ? layout.canvasWidth
    : Math.max(layout.width, COMPACT_CANVAS_WIDTH);
  const scale = canvasWidth / WEB_CANVAS_WIDTH;
  const canvasHeight = WEB_CANVAS_HEIGHT * scale;
  const progressLabel =
    courseNumber && totalCourses
      ? `课程 ${courseNumber} / ${totalCourses} · ${controllerView.title}`
      : controllerView.title;
  const mediaIsImage = controllerView.media?.type === 'image';
  const phaseLabel = `${controllerView.phase} · ${controllerView.lifecycle}`;
  const displayText =
    controllerView.text ||
    controllerView.screenText ||
    (controllerView.phase === 'end' ? '课程完成' : controllerView.title);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onExit} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>返回课程</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {lesson.metadata.title}
          </Text>
          <Text numberOfLines={1} style={styles.headerSubtitle}>
            {progressLabel}
          </Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onFallback} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>WebView</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.viewport}
        contentContainerStyle={[
          styles.viewportContent,
          layout.isLandscapeTablet && { minHeight: layout.height - 56 },
        ]}
      >
        <ScrollView
          horizontal={!layout.isLandscapeTablet}
          showsHorizontalScrollIndicator={!layout.isLandscapeTablet}
          contentContainerStyle={styles.horizontalContent}
        >
          <View style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}>
            {controllerView.backgroundImageUrl ? (
              <Image
                source={{ uri: controllerView.backgroundImageUrl }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
              />
            ) : null}
            <View style={styles.backgroundDim} />

            <Image
              source={courseHomeImages.fox}
              style={[
                styles.fox,
                {
                  left: scaled(760, scale),
                  top: scaled(520, scale),
                  width: scaled(270, scale),
                  height: scaled(320, scale),
                },
              ]}
              contentFit="contain"
            />

            <View
              style={[
                styles.mediaBackdrop,
                {
                  left: scaled(1265, scale),
                  top: scaled(49, scale),
                  width: scaled(1307, scale),
                  height: scaled(856, scale),
                  borderRadius: scaled(47, scale),
                },
              ]}
            />
            <View
              style={[
                styles.mediaFrame,
                {
                  left: scaled(1302, scale),
                  top: scaled(111, scale),
                  width: scaled(1236, scale),
                  height: scaled(720, scale),
                  borderRadius: scaled(46, scale),
                  padding: scaled(30, scale),
                },
              ]}
            >
              <View style={styles.mediaInner}>
                {controllerView.media?.url && mediaIsImage ? (
                  <Image
                    source={{ uri: controllerView.media.url }}
                    style={styles.mediaImage}
                    contentFit="contain"
                  />
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <Text style={[styles.videoPlaceholderTitle, { fontSize: scaled(44, scale) }]}>
                      课程媒体
                    </Text>
                    <Text style={[styles.videoPlaceholderText, { fontSize: scaled(24, scale) }]}>
                      {controllerView.media?.type === 'video'
                        ? '视频将在媒体阶段播放'
                        : '等待当前媒体内容'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View
              style={[
                styles.speechCard,
                {
                  left: scaled(1265, scale),
                  top: scaled(949, scale),
                  width: scaled(1307, scale),
                  height: scaled(518, scale),
                  borderRadius: scaled(16, scale),
                },
              ]}
            >
              <View
                style={[
                  styles.hintBubble,
                  {
                    top: scaled(34, scale),
                    left: scaled(150, scale),
                    right: scaled(150, scale),
                    minHeight: scaled(110, scale),
                    borderRadius: scaled(20, scale),
                    paddingHorizontal: scaled(34, scale),
                    paddingVertical: scaled(18, scale),
                  },
                ]}
              >
                <Text style={[styles.hintText, { fontSize: scaled(30, scale), lineHeight: scaled(42, scale) }]}>
                  {displayText}
                </Text>
              </View>

              <Image
                source={courseHomeImages.fox}
                style={[
                  styles.avatar,
                  {
                    left: scaled(38, scale),
                    bottom: scaled(38, scale),
                    width: scaled(102, scale),
                    height: scaled(102, scale),
                    borderRadius: scaled(51, scale),
                  },
                ]}
                contentFit="cover"
              />
              <View
                style={[
                  styles.kidAvatar,
                  {
                    right: scaled(38, scale),
                    bottom: scaled(38, scale),
                    width: scaled(102, scale),
                    height: scaled(102, scale),
                    borderRadius: scaled(51, scale),
                  },
                ]}
              >
                <Text style={[styles.kidAvatarText, { fontSize: scaled(38, scale) }]}>孩</Text>
              </View>
            </View>
          </View>
          {controllerView.isPaused ? (
            <View style={styles.pauseOverlay}>
              <View style={styles.pausePanel}>
                <Text style={styles.pauseTitle}>课程暂停</Text>
                <Text style={styles.pauseText}>点击底部“恢复课程”继续</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </ScrollView>

      <View style={styles.bottomControls}>
        <Pressable style={styles.startButton} onPress={onPauseToggle}>
          <Text style={styles.startButtonText}>
            {controllerView.isPaused ? '恢复课程' : '暂停课程'}
          </Text>
        </Pressable>
        <Pressable style={styles.controlButton}>
          <Text style={styles.controlButtonText}>{phaseLabel}</Text>
        </Pressable>
        <Pressable
          style={[
            styles.controlButtonPurple,
            !controllerView.canGoNext && styles.disabledButton,
          ]}
          disabled={!controllerView.canGoNext}
          onPress={onNext}
        >
          <Text style={styles.controlButtonText}>跳到下一步</Text>
        </Pressable>
        <Pressable style={styles.transcriptButton}>
          <Text style={styles.controlButtonText}>
            {controllerView.index + 1} / {controllerView.total}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080d18',
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.14)',
    backgroundColor: '#080d18',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  headerButton: {
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
  },
  headerButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  headerTitle: {
    maxWidth: '100%',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  headerSubtitle: {
    marginTop: 2,
    maxWidth: '100%',
    color: '#cbd5e1',
    fontSize: 11,
  },
  viewport: {
    flex: 1,
  },
  viewportContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalContent: {
    alignItems: 'center',
  },
  canvas: {
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  backgroundDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.34)',
  },
  fox: {
    position: 'absolute',
    zIndex: 6,
  },
  mediaBackdrop: {
    position: 'absolute',
    zIndex: 4,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  mediaFrame: {
    position: 'absolute',
    zIndex: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(0,0,0,0.88)',
  },
  mediaInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#05070a',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  videoPlaceholderTitle: {
    color: '#f8fafc',
    fontWeight: '900',
  },
  videoPlaceholderText: {
    marginTop: 8,
    color: '#cbd5e1',
    textAlign: 'center',
  },
  speechCard: {
    position: 'absolute',
    zIndex: 8,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  hintBubble: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f4d2a2',
    backgroundColor: '#fff0d8',
  },
  hintText: {
    color: '#92400e',
    fontWeight: '700',
    textAlign: 'center',
  },
  avatar: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#b8ecff',
    backgroundColor: '#fff7ed',
  },
  kidAvatar: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#b8ecff',
    backgroundColor: '#fde7d3',
  },
  kidAvatarText: {
    color: '#9a3412',
    fontWeight: '900',
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  pausePanel: {
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.92)',
    paddingHorizontal: 34,
    paddingVertical: 24,
  },
  pauseTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  pauseText: {
    marginTop: 8,
    color: '#cbd5e1',
    fontSize: 14,
  },
  bottomControls: {
    minHeight: 58,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
    backgroundColor: '#080d18',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  startButton: {
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#64748b',
    paddingHorizontal: 16,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  controlButton: {
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#3f324f',
    paddingHorizontal: 16,
  },
  controlButtonPurple: {
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(216,180,254,0.5)',
    backgroundColor: '#2e2148',
    paddingHorizontal: 16,
  },
  transcriptButton: {
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(103,232,249,0.55)',
    backgroundColor: '#12333e',
    paddingHorizontal: 16,
  },
  disabledButton: {
    opacity: 0.45,
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
