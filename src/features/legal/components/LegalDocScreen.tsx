import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { parseLegalDocType } from '../legalDocs';
import { LegalDocView } from './LegalDocView';

/** Route screen: /legal?type=user|privacy|children (reachable logged in or out). */
export function LegalDocScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: string | string[] }>();
  const docType = parseLegalDocType(type) ?? 'privacy';

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);

  return <LegalDocView type={docType} onClose={handleClose} />;
}
