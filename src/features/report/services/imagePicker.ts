import * as ImagePicker from 'expo-image-picker';

import type { ReportImage } from '../types';

export async function requestImagePickerPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/**
 * Pick a single image from the media library and return it as a Base64-encoded
 * string alongside the local preview URI.
 *
 * The Base64 payload is what gets sent to the backend; the local URI is kept
 * only for in-app thumbnail previews.
 */
export async function pickReportImage(): Promise<ReportImage | null> {
  const hasPermission = await requestImagePickerPermission();
  if (!hasPermission) {
    throw new Error('需要相册权限才能上传截图，请在系统设置中开启。');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: false,
    aspect: [4, 3],
    // Keep quality moderate so the resulting Base64 payload stays small.
    quality: 0.6,
    allowsMultipleSelection: false,
    // Request Base64 data so we can embed images directly in the JSON payload.
    base64: true,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  if (!asset.base64) {
    throw new Error('无法读取图片数据，请重试或选择其他图片。');
  }

  const fileName = asset.uri.split('/').pop() || 'screenshot.jpg';
  return {
    uri: asset.uri,
    base64: asset.base64,
    name: fileName,
    type: asset.mimeType || 'image/jpeg',
    width: asset.width,
    height: asset.height,
  };
}
