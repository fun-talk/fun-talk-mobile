import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LoginColors, LoginSizes, LoginWeights } from '@/features/auth/components/LoginConstants';

import { REPORT_TYPE_OPTIONS } from '../types';
import { useLocalReports } from '../hooks/useLocalReports';

const STATUS_LABELS: Record<string, string> = {
  pending: '待受理',
  processing: '处理中',
  resolved: '已处理',
  rejected: '已驳回',
};

type ReportHistoryListProps = {
  refreshKey?: number;
};

export function ReportHistoryList({ refreshKey }: ReportHistoryListProps) {
  const { reports, isLoading, refresh } = useLocalReports(refreshKey);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={LoginColors.primaryEnd} />
      </View>
    );
  }

  if (reports.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>我的举报记录</Text>
        <Pressable onPress={() => refresh()}>
          <Text style={styles.refreshText}>刷新</Text>
        </Pressable>
      </View>
      {reports.map((report) => {
        const typeLabel =
          REPORT_TYPE_OPTIONS.find((o) => o.value === report.report_type)?.label ||
          report.report_type;
        return (
          <View key={report.report_id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.type}>{typeLabel}</Text>
              <Text
                style={[
                  styles.status,
                  report.status === 'resolved' && styles.statusResolved,
                  report.status === 'rejected' && styles.statusRejected,
                  report.status === 'processing' && styles.statusProcessing,
                ]}
              >
                {STATUS_LABELS[report.status] || report.status}
              </Text>
            </View>
            <Text style={styles.content} numberOfLines={2}>
              {report.content}
            </Text>
            <Text style={styles.meta}>提交时间：{formatDate(report.submitted_at)}</Text>
            {report.result_message ? (
              <Text style={styles.result}>{report.result_message}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
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
  container: {
    marginTop: 8,
    marginBottom: 24,
  },
  loading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: LoginSizes.labelFontSize,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: LoginWeights.bold,
    color: LoginColors.primaryEnd,
  },
  card: {
    backgroundColor: LoginColors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: LoginColors.line,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  statusProcessing: {
    color: LoginColors.primaryEnd,
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
    marginBottom: 8,
  },
  meta: {
    fontSize: 12,
    color: LoginColors.textMuted,
  },
  result: {
    fontSize: 13,
    color: LoginColors.success,
    marginTop: 8,
    lineHeight: 18,
  },
});
