import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getWechatAppId, getWechatUniversalLink } from '@/lib/env';

const RESULT_ERROR_CODE_OK = 0;
const RESULT_ERROR_CODE_USER_CANCEL = -2;

type WechatAuthResultEvent = {
  errorCode: number;
  errorMessage?: string;
  code?: string;
};

type WechatSubscription = {
  remove: () => void;
};

type WechatModule = {
  isRegistered: boolean;
  registerApp: (appId: string, universalLink: string) => Promise<boolean>;
  isWXAppInstalled: () => Promise<boolean>;
  sendAuthRequest: (scope: string, state: string) => Promise<boolean>;
  addListener: (
    eventName: 'onAuthResult',
    listener: (event: WechatAuthResultEvent) => void,
  ) => WechatSubscription;
};

let registerPromise: Promise<boolean> | null = null;
let modulePromise: Promise<WechatModule | null> | null = null;

function isRunningInExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

async function loadWechatModule(): Promise<WechatModule | null> {
  if (!modulePromise) {
    modulePromise = import('expo-wechat-no-pay')
      .then((module) => module.default as WechatModule)
      .catch(() => null);
  }

  return modulePromise;
}

export function isWechatLoginSupported(): boolean {
  if (isRunningInExpoGo()) {
    return false;
  }

  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function ensureWechatRegistered(): Promise<boolean> {
  if (!isWechatLoginSupported()) {
    return false;
  }

  const ExpoWeChat = await loadWechatModule();
  if (!ExpoWeChat) {
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

  const ExpoWeChat = await loadWechatModule();
  if (!ExpoWeChat) {
    return false;
  }

  await ensureWechatRegistered();
  return ExpoWeChat.isWXAppInstalled();
}

function waitForWechatAuthResult(
  ExpoWeChat: WechatModule,
  timeoutMs = 120_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      subscription.remove();
      reject(new Error('微信授权超时，请重试'));
    }, timeoutMs);

    const subscription = ExpoWeChat.addListener('onAuthResult', (event) => {
      subscription.remove();
      clearTimeout(timeoutId);

      if (event.errorCode === RESULT_ERROR_CODE_OK && event.code) {
        resolve(event.code);
        return;
      }

      if (event.errorCode === RESULT_ERROR_CODE_USER_CANCEL) {
        reject(new Error('已取消微信授权'));
        return;
      }

      reject(new Error(event.errorMessage || '微信授权失败'));
    });
  });
}

export async function requestWechatAuthCode(): Promise<string> {
  if (isRunningInExpoGo()) {
    throw new Error('Expo Go 不包含微信原生模块。请使用 development build 或正式包测试微信登录。');
  }

  if (!isWechatLoginSupported()) {
    throw new Error('请在 iOS/Android 真机中使用微信登录');
  }

  const ExpoWeChat = await loadWechatModule();
  if (!ExpoWeChat) {
    throw new Error('当前安装包未包含微信原生模块，请重新构建 development build 或正式包');
  }

  const installed = await isWechatInstalled();
  if (!installed) {
    throw new Error('请先安装微信');
  }

  const authPromise = waitForWechatAuthResult(ExpoWeChat);
  const sent = await ExpoWeChat.sendAuthRequest('snsapi_userinfo', 'funtalk_mobile_login');
  if (!sent) {
    throw new Error('无法发起微信授权，请稍后重试');
  }

  return authPromise;
}
