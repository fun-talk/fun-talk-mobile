import { Platform } from 'react-native';
import ExpoWeChat, { ResultErrorCode } from 'expo-wechat-no-pay';

import { getWechatAppId, getWechatUniversalLink } from '@/lib/env';

let registerPromise: Promise<boolean> | null = null;

export function isWechatLoginSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function ensureWechatRegistered(): Promise<boolean> {
  if (!isWechatLoginSupported()) {
    return false;
  }

  if (ExpoWeChat.isRegistered) {
    return true;
  }

  if (!registerPromise) {
    registerPromise = ExpoWeChat.registerApp(getWechatAppId(), getWechatUniversalLink()).finally(
      () => {
        registerPromise = null;
      },
    );
  }

  return registerPromise;
}

export async function isWechatInstalled(): Promise<boolean> {
  if (!isWechatLoginSupported()) {
    return false;
  }

  await ensureWechatRegistered();
  return ExpoWeChat.isWXAppInstalled();
}

function waitForWechatAuthResult(timeoutMs = 120_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      subscription.remove();
      reject(new Error('微信授权超时，请重试'));
    }, timeoutMs);

    const subscription = ExpoWeChat.addListener('onAuthResult', (event) => {
      subscription.remove();
      clearTimeout(timeoutId);

      if (event.errorCode === ResultErrorCode.ok && event.code) {
        resolve(event.code);
        return;
      }

      if (event.errorCode === ResultErrorCode.userCancel) {
        reject(new Error('已取消微信授权'));
        return;
      }

      reject(new Error(event.errorMessage || '微信授权失败'));
    });
  });
}

export async function requestWechatAuthCode(): Promise<string> {
  if (!isWechatLoginSupported()) {
    throw new Error('请在 iOS/Android 真机中使用微信登录');
  }

  const installed = await isWechatInstalled();
  if (!installed) {
    throw new Error('请先安装微信');
  }

  const authPromise = waitForWechatAuthResult();
  const sent = await ExpoWeChat.sendAuthRequest('snsapi_userinfo', 'funtalk_mobile_login');
  if (!sent) {
    throw new Error('无法发起微信授权，请稍后重试');
  }

  return authPromise;
}
