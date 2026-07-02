import Toast from 'react-native-toast-message';

const TOAST_DURATION = 3000;

export function showErrorToast(message: string) {
  Toast.show({
    type: 'error',
    text1: message,
    position: 'top',
    visibilityTime: TOAST_DURATION,
    topOffset: 60,
  });
}

export function showSuccessToast(message: string) {
  Toast.show({
    type: 'success',
    text1: message,
    position: 'top',
    visibilityTime: TOAST_DURATION,
    topOffset: 60,
  });
}

export function showInfoToast(message: string) {
  Toast.show({
    type: 'info',
    text1: message,
    position: 'top',
    visibilityTime: 2500,
    topOffset: 60,
  });
}
