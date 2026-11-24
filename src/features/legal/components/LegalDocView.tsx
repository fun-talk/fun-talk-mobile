import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getWebBaseUrl } from '@/lib/env';

import {
  LEGAL_DOCS,
  buildLegalDocUrl,
  isAllowedLegalNavigation,
  type LegalDocType,
} from '../legalDocs';
import { BUNDLED_LEGAL_DOCS } from '../legalDocsBundled.generated';
import { LegalColors } from './legalStyles';

/** Show the bundled copy if the online page has not finished loading by then. */
const ONLINE_LOAD_TIMEOUT_MS = 8000;

type LegalDocViewProps = {
  type: LegalDocType;
  onClose: () => void;
  closeLabel?: string;
};

/**
 * Shows 用户协议 / 隐私政策 / 儿童隐私政策 exactly as published on the website
 * (the URL submitted to app stores). If the page cannot be loaded, the
 * build-time copy of the same HTML file is shown instead, so the document
 * always opens.
 */
export function LegalDocView({ type, onClose, closeLabel = '返回' }: LegalDocViewProps) {
  const insets = useSafeAreaInsets();
  const webBaseUrl = getWebBaseUrl();
  const remoteUrl = buildLegalDocUrl(type, webBaseUrl);
  const doc = LEGAL_DOCS[type];

  const [bundledFor, setBundledFor] = useState<LegalDocType | null>(null);
  const useBundled = bundledFor === type;
  const loadedRef = useRef(false);

  const showBundled = useCallback(() => {
    setBundledFor(type);
  }, [type]);

  useEffect(() => {
    if (useBundled) return;
    loadedRef.current = false;
    const timer = setTimeout(() => {
      if (!loadedRef.current) showBundled();
    }, ONLINE_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [remoteUrl, showBundled, useBundled]);

  const source = useMemo(
    () =>
      useBundled ? { html: BUNDLED_LEGAL_DOCS[type], baseUrl: remoteUrl } : { uri: remoteUrl },
    [remoteUrl, type, useBundled],
  );

  const handleShouldStart = useCallback(
    (request: WebViewNavigation & { isTopFrame?: boolean }) => {
      if (request.isTopFrame === false) return true;
      return isAllowedLegalNavigation(request.url, webBaseUrl);
    },
    [webBaseUrl],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          hitSlop={12}
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
        >
          <Text style={styles.closeText}>‹ {closeLabel}</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {doc.title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <WebView
        key={useBundled ? `${type}:bundled` : `${type}:online`}
        style={styles.webview}
        source={source}
        originWhitelist={['https://*', 'http://*', 'about:*']}
        onShouldStartLoadWithRequest={handleShouldStart}
        setSupportMultipleWindows={false}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={LegalColors.accent} />
          </View>
        )}
        onLoadEnd={() => {
          loadedRef.current = true;
        }}
        onError={() => {
          if (!useBundled) showBundled();
        }}
        onHttpError={(event) => {
          if (!useBundled && event.nativeEvent.statusCode >= 400) showBundled();
        }}
      />
      <View style={{ height: insets.bottom, backgroundColor: LegalColors.pageBg }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LegalColors.surface,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LegalColors.line,
    backgroundColor: LegalColors.surface,
  },
  closeButton: {
    minWidth: 88,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  pressed: {
    opacity: 0.6,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '700',
    color: LegalColors.link,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: LegalColors.text,
  },
  headerSpacer: {
    minWidth: 88,
  },
  webview: {
    flex: 1,
    backgroundColor: LegalColors.pageBg,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LegalColors.pageBg,
  },
});
