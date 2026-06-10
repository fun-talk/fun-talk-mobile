export type NativeExpoFileSystemModule = typeof import('expo-file-system');

let expoFileSystemPromise: Promise<NativeExpoFileSystemModule> | null = null;

export async function loadNativeExpoFileSystem(): Promise<NativeExpoFileSystemModule> {
  expoFileSystemPromise ??= import('expo-file-system');
  return expoFileSystemPromise;
}
