import { MAP_WIDTH } from '@/shared/courseHomeMap';

export type ClampSize = {
  min: number;
  vw: number;
  max: number;
};

export function clampByViewport({ min, vw, max }: ClampSize, viewportWidth: number): number {
  return Math.min(max, Math.max(min, viewportWidth * vw));
}

export function isLandscapeTablet(viewportWidth: number, viewportHeight: number): boolean {
  return viewportWidth >= 768 && viewportWidth > viewportHeight;
}

export function computeMapPixelHeight(
  viewportWidth: number,
  viewportHeight: number,
  mapHeight: number,
): number {
  const aspectHeight = (viewportWidth * mapHeight) / MAP_WIDTH;
  return Math.max(viewportHeight, aspectHeight);
}

export function computeNodeWidth(viewportWidth: number): number {
  return Math.max(62, viewportWidth * 0.0662);
}

export function computeFoxWidth(viewportWidth: number): number {
  return Math.max(70, viewportWidth * 0.0656);
}

export function computeReportWidth(viewportWidth: number, landscapeTablet: boolean): number {
  if (landscapeTablet) {
    return Math.min(196, viewportWidth * 0.18);
  }
  return Math.min(180, viewportWidth * 0.24);
}

export function computeHelloMaxWidth(viewportWidth: number, landscapeTablet: boolean): number {
  if (landscapeTablet) {
    return Math.min(420, viewportWidth * 0.46);
  }
  return Math.min(460, viewportWidth * 0.58);
}

export function computeContinueWidth(viewportWidth: number): number {
  return Math.min(280, viewportWidth * 0.68);
}

export function computeTipWidth(viewportWidth: number): number {
  return Math.max(160, viewportWidth * 0.102);
}
