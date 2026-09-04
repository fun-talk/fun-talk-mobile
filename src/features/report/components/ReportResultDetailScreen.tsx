import { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoginColors, LoginSizes, LoginWeights } from '@/features/auth/components/LoginConstants';

import { REPORT_TYPE_OPTIONS } from '../types';
import { useLocalReports } from '../hooks/useLocalReports';

const STATUS_LABELS: Record<string, string> = {
  resolved: '已处理',
  rejected: '已驳回',
};

export function ReportResultDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const { reports, isLoading, refresh } = useLocalReports();

  const report = reports.find((r) => r.report_id === reportId);

  useEffect(() => {
    if (!isLoading && !report) {
      refresh();
    }
  }, [isLoading, report, refresh]);

  const typeLabel = report
    ? REPORT_TYPE_OPTIONS.find((o) => o.value === report.report_type)?.label || report.report_type
    : '';

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>处理结果详情</Text>
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
        {isLoading || !report ? (
          <View style={styles.loading}>
            <ActivityIndicator color={LoginColors.primaryEnd} />
            <Text style={styles.loadingText}>加载中…</Text>
          </View>
        ) : (
          <View style={styles.card}>
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

            <View style={styles.section}>
              <Text style={styles.label}>举报内容</Text>
              <Text style={styles.body}>{report.content}</Text>
            </View>

            {report.target ? (
              <View style={styles.section}>
                <Text style={styles.label}>被举报对象</Text>
                <Text style={styles.body}>{report.target}</Text>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.label}>联系方式</Text>
              <Text style={styles.body}>{report.contact}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>提交时间</Text>
              <Text style={styles.body}>{formatDate(report.submitted_at)}</Text>
            </View>

            <View style={[styles.section, styles.resultSection]}>
              <Text style={styles.label}>处理结果</Text>
              <Text style={styles.resultBody}>
                {report.result_message || '暂无处理结果说明'}
              </Text>
            </View>

            {report.resolved_at ? (
              <View style={styles.section}>
                <Text style={styles.label}>处理时间</Text>
                <Text style={styles.body}>{formatDate(report.resolved_at)}</Text>
              </View>
            ) : null}
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
  loading: {
    paddingVertical: 64,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: LoginColors.textMuted,
  },
  card: {
    backgroundColor: LoginColors.white,
    borderRadius: 14,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: LoginColors.line,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: LoginColors.line,
  },
  type: {
    fontSize: 16,
    fontWeight: LoginWeights.extraBold,
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
  section: {
    marginBottom: 20,
  },
  resultSection: {
    backgroundColor: LoginColors.infoGreenBg,
    borderWidth: 1,
    borderColor: LoginColors.infoGreenBorder,
    borderRadius: 12,
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: LoginWeights.bold,
    color: LoginColors.textMuted,
    marginBottom: 6,
  },
  body: {
    fontSize: 15,
    fontWeight: '500',
    color: LoginColors.text,
    lineHeight: 22,
  },
  resultBody: {
    fontSize: 15,
    fontWeight: LoginWeights.semiBold,
    color: LoginColors.success,
    lineHeight: 22,
  },
});
