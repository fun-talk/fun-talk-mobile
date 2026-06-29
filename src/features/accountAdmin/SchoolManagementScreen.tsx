import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth';
import { LoginColors, LoginWeights } from '@/features/auth/components/LoginConstants';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import {
  fetchSchoolManagement,
  mergeAdminClasses,
  mergeAdminSchool,
  type SchoolManagement,
  type SchoolManagementPendingClass,
  type SchoolManagementPendingSchool,
} from '@/features/auth/services/accountApi';

import { AccountConsoleShell, Panel, SecondaryButton } from './AccountConsoleShell';

export function SchoolManagementScreen() {
  const { apiClient } = useAuth();
  const [management, setManagement] = useState<SchoolManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [mergingKey, setMergingKey] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchSchoolManagement(apiClient);
      setManagement(result.management);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : '加载学校信息失败');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const confirmMergeClass = (item: SchoolManagementPendingClass) => {
    Alert.alert(
      '确认合并班级',
      `确认将「${item.source_class_name}」合并到「${item.target_class_name}」？将影响 ${item.student_count} 名学生。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '合并',
          onPress: async () => {
            setMergingKey(`class-${item.source_class_id}`);
            try {
              await mergeAdminClasses(apiClient, item.source_class_id, item.target_class_id);
              showSuccessToast(`已合并班级：${item.source_class_name} → ${item.target_class_name}`);
              await loadData();
            } catch (error) {
              showErrorToast(error instanceof Error ? error.message : '合并失败');
            } finally {
              setMergingKey('');
            }
          },
        },
      ],
    );
  };

  const confirmMergeSchool = (item: SchoolManagementPendingSchool) => {
    Alert.alert(
      '确认合并学校',
      `确认将学校「${item.school_name}」合并到当前学校？将影响 ${item.student_count} 名学生、${item.teacher_count} 名老师。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '合并',
          onPress: async () => {
            setMergingKey(`school-${item.school_id}`);
            try {
              await mergeAdminSchool(apiClient, item.school_id);
              showSuccessToast(`已合并学校：${item.school_name}`);
              await loadData();
            } catch (error) {
              showErrorToast(error instanceof Error ? error.message : '合并失败');
            } finally {
              setMergingKey('');
            }
          },
        },
      ],
    );
  };

  return (
    <AccountConsoleShell title="学校信息管理" active="admin-schools">
      <Panel>
        {loading || !management ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.subtitle}>加载中...</Text>
          </View>
        ) : (
          <>
            <View style={styles.stats}>
              <Stat label="学校名" value={management.school.name} />
              <Stat label="管理员数量" value={String(management.school.admin_count)} />
              <Stat label="老师数量" value={String(management.school.teacher_count)} />
              <Stat label="学生数量" value={String(management.school.student_count)} />
            </View>

            <SectionTitle title="班级列表" />
            <ScrollView horizontal>
              <View style={styles.table}>
                <TableHeader columns={['班级名', '所属老师', '学生数量', '创建时间']} />
                {management.classes.map((item) => (
                  <View key={item.id} style={styles.row}>
                    <Text style={styles.cell}>{item.name}</Text>
                    <Text style={styles.cell}>{item.teacher_names.join('、') || '—'}</Text>
                    <Text style={styles.cell}>{item.student_count}</Text>
                    <Text style={styles.cell}>{new Date(item.created_at * 1000).toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <SectionTitle title="待合并记录" />
            {management.pending_classes.length === 0 && management.pending_schools.length === 0 ? (
              <Text style={styles.subtitle}>暂无待合并记录</Text>
            ) : (
              <ScrollView horizontal>
                <View style={styles.table}>
                  <TableHeader columns={['类型', '相似名称', '合并目标', '影响学生', '操作']} />
                  {management.pending_schools.map((item) => (
                    <View key={`school-${item.school_id}`} style={styles.row}>
                      <Text style={styles.cell}>学校</Text>
                      <Text style={styles.cell}>{item.school_name}</Text>
                      <Text style={styles.cell}>{management.school.name}</Text>
                      <Text style={styles.cell}>{item.student_count}</Text>
                      <View style={styles.cell}>
                        <SecondaryButton
                          label={mergingKey === `school-${item.school_id}` ? '合并中...' : '合并'}
                          onPress={() => confirmMergeSchool(item)}
                          disabled={Boolean(mergingKey)}
                        />
                      </View>
                    </View>
                  ))}
                  {management.pending_classes.map((item) => (
                    <View key={`class-${item.source_class_id}`} style={styles.row}>
                      <Text style={styles.cell}>班级</Text>
                      <Text style={styles.cell}>{item.source_class_name}</Text>
                      <Text style={styles.cell}>{item.target_class_name}</Text>
                      <Text style={styles.cell}>{item.student_count}</Text>
                      <View style={styles.cell}>
                        <SecondaryButton
                          label={mergingKey === `class-${item.source_class_id}` ? '合并中...' : '合并'}
                          onPress={() => confirmMergeClass(item)}
                          disabled={Boolean(mergingKey)}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

            <SectionTitle title="合并记录" />
            <ScrollView horizontal>
              <View style={styles.table}>
                <TableHeader columns={['类型', '合并前', '合并后', '影响老师', '影响学生', '时间']} />
                {management.merge_records.length === 0 ? (
                  <Text style={styles.empty}>暂无合并记录</Text>
                ) : (
                  management.merge_records.map((item) => (
                    <View key={item.id} style={styles.row}>
                      <Text style={styles.cell}>{item.merge_type}</Text>
                      <Text style={styles.cell}>{item.source_label}</Text>
                      <Text style={styles.cell}>{item.target_label}</Text>
                      <Text style={styles.cell}>{item.affected_teacher_count}</Text>
                      <Text style={styles.cell}>{item.affected_student_count}</Text>
                      <Text style={styles.cell}>{new Date(item.created_at * 1000).toLocaleString()}</Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </>
        )}
      </Panel>
    </AccountConsoleShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text selectable style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function TableHeader({ columns }: { columns: string[] }) {
  return (
    <View style={[styles.row, styles.headerRow]}>
      {columns.map((column) => (
        <Text key={column} style={[styles.cell, styles.headerCell]}>{column}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 20,
  },
  subtitle: {
    color: LoginColors.textMuted,
    fontWeight: LoginWeights.medium,
  },
  stats: {
    flexDirection: 'row',
    gap: 14,
  },
  stat: {
    flex: 1,
    minWidth: 160,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LoginColors.line,
    backgroundColor: '#f8fafc',
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
    textAlign: 'center',
  },
  statLabel: {
    marginTop: 4,
    color: LoginColors.textMuted,
    fontWeight: LoginWeights.bold,
  },
  sectionTitle: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
  },
  table: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LoginColors.line,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: LoginColors.line,
    backgroundColor: LoginColors.white,
  },
  headerRow: {
    backgroundColor: '#f8fafc',
  },
  cell: {
    width: 170,
    padding: 12,
    color: LoginColors.text,
  },
  headerCell: {
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.textLabel,
  },
  empty: {
    width: 1020,
    padding: 18,
    color: LoginColors.textMuted,
    fontWeight: LoginWeights.bold,
  },
});
