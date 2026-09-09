export type WebViewMicrophonePermissionResult = {
  granted: boolean;
  canAskAgain?: boolean;
};

export async function ensureWebViewMicrophonePermission(
  platformOS: string,
  requestPermission: () => Promise<WebViewMicrophonePermissionResult>,
): Promise<WebViewMicrophonePermissionResult> {
  if (platformOS !== 'android') {
    return { granted: true };
  }
  return requestPermission();
}
