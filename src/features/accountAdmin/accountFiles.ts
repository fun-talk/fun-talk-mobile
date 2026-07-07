import { File, Paths } from 'expo-file-system';

import { getWebBaseUrl } from '@/lib/env';
import type { AccountExportFile, AccountPrintCard } from '@/features/auth/services/accountApi';

import { buildAccountCardsHtml } from './printCards';

type PrintModule = typeof import('expo-print');
type SharingModule = typeof import('expo-sharing');

async function loadPrintModule(): Promise<PrintModule> {
  try {
    return await import('expo-print');
  } catch (error) {
    throw new Error(
      '当前 Android 客户端未包含打印模块，请重新构建开发包后再使用打印功能。',
      { cause: error },
    );
  }
}

async function loadSharingModule(): Promise<SharingModule> {
  try {
    return await import('expo-sharing');
  } catch (error) {
    throw new Error(
      '当前 Android 客户端未包含分享模块，请重新构建开发包后再使用导出/分享功能。',
      { cause: error },
    );
  }
}

function safeFilename(filename: string): string {
  return filename.replace(/[\\/:"*?<>|]+/g, '_') || 'student_accounts.xlsx';
}

export function getAccountLoginUrl(): string {
  return `${getWebBaseUrl().replace(/\/$/, '')}/account/login`;
}

export async function shareExportFile(filePayload: AccountExportFile): Promise<string> {
  const Sharing = await loadSharingModule();
  const file = new File(Paths.cache, safeFilename(filePayload.filename));
  file.write(filePayload.bytes);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: filePayload.mimeType,
      dialogTitle: '分享学生账号 Excel',
      UTI: 'com.microsoft.excel.xlsx',
    });
  }
  return file.uri;
}

export async function printOrShareAccountCards(cards: AccountPrintCard[]): Promise<string | null> {
  const Print = await loadPrintModule();
  const Sharing = await loadSharingModule();
  const html = buildAccountCardsHtml(cards);
  try {
    await Print.printAsync({ html });
    return null;
  } catch {
    const pdf = await Print.printToFileAsync({ html, base64: false });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdf.uri, {
        mimeType: 'application/pdf',
        dialogTitle: '分享学生账号卡',
        UTI: 'com.adobe.pdf',
      });
    }
    return pdf.uri;
  }
}
