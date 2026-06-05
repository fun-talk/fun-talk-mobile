export type NativeExpoAvModule = typeof import('expo-av');

let expoAvPromise: Promise<NativeExpoAvModule> | null = null;

export async function loadNativeExpoAv(): Promise<NativeExpoAvModule> {
  expoAvPromise ??= import('expo-av');
  return expoAvPromise;
}

export type NativeExpoVideoRef = {
  playAsync: () => Promise<unknown>;
  unloadAsync: () => Promise<unknown>;
};
