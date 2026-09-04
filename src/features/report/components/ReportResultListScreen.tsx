import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoginColors, LoginSizes, LoginWeights } from '@/features/auth/components/LoginConstants';

import { REPORT_TYPE_OPTIONS } from '../types';
import { useLocalReports } from '../hooks/useLocalReports';

const STATUS_LABELS: Record<string, string> = {
  resolved: '已处理',
  rejected: '已驳回',
};

const REPORT_RESULTS_ROUTE = '/(app)/report-results';

export function ReportResultListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reports, isLoading, refresh } = useLocalReports();

  const handledReports = reports
    .filter((r) => r.status === 'resolved' || r.status === 'rejected')
    .sort(
      (a, b) =>
        new Date(b.resolved_at || b.submitted_at).getTime() -
        new Date(a.resolved_at || a.submitted_at).getTime(),
    );

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>举报处理结果</Text>
        <Pressable style={styles.closeBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="返回">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <Text style={styles.intro}>
          这里展示您过往已处理完成的举报记录，按处理时间由近到远排列。
        </Text>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={LoginColors.primaryEnd} />
          </View>
        ) : handledReports.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>暂无已处理的举报记录</Text>
            <Text style={styles.emptyHint}>
              进行中的举报请在「投诉与建议」页面查看
            </Text>
            <Pressable style={styles.refreshBtn} onPress={() => refresh()}>
              <Text style={styles.refreshBtnText}>刷新</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {handledReports.map((report) => {
              const typeLabel =
                REPORT_TYPE_OPTIONS.find((o) => o.value === report.report_type)?.label || report.report_type;
              const resolvedAt = report.resolved_at || report.submitted_at;
              return (
                <Pressable
                  key={report.report_id}
                  style={styles.card}
                  onPress={() => router.push(`${REPORT_RESULTS_ROUTE}/${report.report_id}` as Href)}
                >
                  <View style={styles.row}>
                    <Text style={styles.type}>{typeLabel}</Text>
                    <Text
                      style={[
                        styles.status,
                        report.status === 'resolved' && styles.statusResolved,
                        report.status === 'rejected' && styles.statusRejected,
                      ]}
                    >
                      {STATUS_LABELS[report.status] || report.status}
                    </Text>
                  </View>
                  <Text style={styles.content} numberOfLines={2}>
                    {report.content}
                  </Text>
                  <Text style={styles.meta}>处理时间：{formatDate(resolvedAt)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LoginColors.skyBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: LoginColors.line,
    backgroundColor: LoginColors.white,
  },
  headerTitle: {
    fontSize: LoginSizes.titleFontSize,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: LoginColors.modalCloseBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.textMuted,
  },
  scroll: {
    flex: 1,
  },
  intro: {
    fontSize: 14,
    lineHeight: 22,
    color: LoginColors.textMuted,
    marginTop: 16,
    marginBottom: 16,
  },
  loading: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  empty: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: LoginColors.textMuted,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 13,
    color: LoginColors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  refreshBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: LoginColors.primaryEnd,
  },
  refreshBtnText: {
    fontSize: 14,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.white,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: LoginColors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: LoginColors.line,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  type: {
    fontSize: 15,
    fontWeight: LoginWeights.bold,
    color: LoginColors.text,
  },
  status: {
    fontSize: 13,
    fontWeight: LoginWeights.bold,
    color: LoginColors.textMuted,
  },
  statusResolved: {
    color: LoginColors.success,
  },
  statusRejected: {
    color: LoginColors.error,
  },
  content: {
    fontSize: 14,
    color: LoginColors.textMuted,
    lineHeight: 20,
    marginBottom: 10,
  },
  meta: {
    fontSize: 12,
    color: LoginColors.textMuted,
  },
});
