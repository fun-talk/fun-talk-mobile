const WEB_CANVAS_WIDTH = 3325;
const WEB_CANVAS_HEIGHT = 1536;
const LANDSCAPE_TABLET_MIN_WIDTH = 900;
const LANDSCAPE_TABLET_MIN_HEIGHT = 600;

export type NativeLessonLayoutInput = {
  width: number;
  height: number;
};

export type NativeLessonLayout = {
  width: number;
  height: number;
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
  isLandscapeTablet: boolean;
};

export function computeNativeLessonLayout(input: NativeLessonLayoutInput): NativeLessonLayout {
  const width = Math.max(1, input.width);
  const height = Math.max(1, input.height);
  const isLandscapeTablet =
    width >= LANDSCAPE_TABLET_MIN_WIDTH &&
    height >= LANDSCAPE_TABLET_MIN_HEIGHT &&
    width > height;

  if (!isLandscapeTablet) {
    return {
      width,
      height,
      scale: Math.min(width / WEB_CANVAS_WIDTH, height / WEB_CANVAS_HEIGHT),
      canvasWidth: width,
      canvasHeight: height,
      isLandscapeTablet,
    };
  }

  const scale = Math.min(width / WEB_CANVAS_WIDTH, height / WEB_CANVAS_HEIGHT);
  return {
    width,
    height,
    scale,
    canvasWidth: WEB_CANVAS_WIDTH * scale,
    canvasHeight: WEB_CANVAS_HEIGHT * scale,
    isLandscapeTablet,
  };
}
