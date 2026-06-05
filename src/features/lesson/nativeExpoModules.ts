export type NativeExpoSpeechModule = typeof import('expo-speech');
export type NativeExpoFileSystemModule = typeof import('expo-file-system');

let expoSpeechPromise: Promise<NativeExpoSpeechModule> | null = null;
let expoFileSystemPromise: Promise<NativeExpoFileSystemModule> | null = null;

export async function loadNativeExpoSpeech(): Promise<NativeExpoSpeechModule> {
  expoSpeechPromise ??= import('expo-speech');
  return expoSpeechPromise;
}

export async function loadNativeExpoFileSystem(): Promise<NativeExpoFileSystemModule> {
  expoFileSystemPromise ??= import('expo-file-system');
  return expoFileSystemPromise;
}
