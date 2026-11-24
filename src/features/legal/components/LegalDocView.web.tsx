import { createElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LEGAL_DOCS, type LegalDocType } from '../legalDocs';
import { BUNDLED_LEGAL_DOCS } from '../legalDocsBundled.generated';
import { LegalColors } from './legalStyles';

/**
 * Runs inside the srcdoc frame: hide the page's own top bar, and keep links
 * in place — a srcdoc document resolves "#s2" against the parent app URL, so
 * table-of-contents links are scrolled by hand and other links are ignored.
 */
const SRCDOC_SCRIPT = `  <script>
    document.documentElement.classList.add('in-app');
    document.addEventListener('click', function (event) {
      var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
      if (!link) return;
      event.preventDefault();
      var href = link.getAttribute('href') || '';
      if (href.charAt(0) === '#') {
        var target = document.getElementById(href.slice(1));
        if (target) target.scrollIntoView();
      }
    });
  </script>`;

type LegalDocViewProps = {
  type: LegalDocType;
  onClose: () => void;
  closeLabel?: string;
};

/**
 * Web build: react-native-webview is native-only, and a cross-origin iframe
 * cannot tell us when the page failed to load. Render the build-time copy of
 * the published page (byte-identical to fun-talk-web/public/legal) so the
 * document always opens.
 */
export function LegalDocView({ type, onClose, closeLabel = '返回' }: LegalDocViewProps) {
  const doc = LEGAL_DOCS[type];
  const html = BUNDLED_LEGAL_DOCS[type].replace('<head>', `<head>\n${SRCDOC_SCRIPT}`);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>‹ {closeLabel}</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {doc.title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      {createElement('iframe', {
        srcDoc: html,
        title: doc.title,
        style: { flex: 1, width: '100%', border: 0, backgroundColor: LegalColors.pageBg },
      })}
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
  },
  closeButton: {
    minWidth: 88,
    paddingVertical: 8,
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
});
