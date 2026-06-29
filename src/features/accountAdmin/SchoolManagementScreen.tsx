import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/features/auth';
import { LoginColors, LoginWeights } from '@/features/auth/components/LoginConstants';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import {
  approveMergeRequest,
  cancelMergeRequest,
  createMergeRequest,
  fetchIncomingMergeRequests,
  fetchNotifications,
  fetchOutgoingMergeRequests,
  fetchSchoolManagement,
  markNotificationRead,
  rejectMergeRequest,
  type MergeRequestRow,
  type NotificationRow,
  type SchoolManagement,
} from '@/features/auth/services/accountApi';

import { AccountConsoleShell, Panel, SecondaryButton } from './AccountConsoleShell';

const STATUS_LABELS: Record<string, string> = {
  pending: '等待确认',
  approved: '已批准',
  rejected: '已拒绝',
  cancelled: '已取消',
  expired: '已过期',
};

export function SchoolManagementScreen() {
  const { apiClient } = useAuth();
  const [management, setManagement] = useState<SchoolManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [mergingKey, setMergingKey] = useState('');

  // Merge school modal
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  // Requests
  const [incoming, setIncoming] = useState<MergeRequestRow[]>([]);
  const [outgoing, setOutgoing] = useState<MergeRequestRow[]>([]);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [showNotifModal, setShowNotifModal] = useState(false);

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

  const loadRequests = useCallback(async () => {
    try {
      const inc = await fetchIncomingMergeRequests(apiClient);
      setIncoming(inc.requests);
    } catch { /* ignore */ }
    try {
      const out = await fetchOutgoingMergeRequests(apiClient);
      setOutgoing(out.requests);
    } catch { /* ignore */ }
  }, [apiClient]);

  const loadNotifications = useCallback(async () => {
    try {
      const result = await fetchNotifications(apiClient);
      setNotifications(result.notifications);
    } catch { /* ignore */ }
  }, [apiClient]);

  useEffect(() => {
    void loadData();
    void loadRequests();
    void loadNotifications();
  }, [loadData, loadRequests, loadNotifications]);

  const refreshAll = useCallback(() => {
    void loadData();
    void loadRequests();
    void loadNotifications();
  }, [loadData, loadRequests, loadNotifications]);

  // -- School merge request ----------------------------------------------

  const handleSendMergeRequest = async () => {
    if (!phoneInput.trim()) return;
    setSendingRequest(true);
    try {
      const result = await createMergeRequest(apiClient, phoneInput.trim());
      showSuccessToast(`合并请求已发送（ID: ${result.request.id}），等待对方管理员确认`);
      setShowMergeModal(false);
      setPhoneInput('');
      await refreshAll();
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : '发送失败');
    } finally {
      setSendingRequest(false);
    }
  };

  // -- Incoming request actions -----------------------------------------

  const handleApprove = (req: MergeRequestRow) => {
    Alert.alert(
      '确认批准合并',
      `确认将学校「${req.requesting_school_name || '未知'}」合并到当前学校？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '批准合并',
          onPress: async () => {
            setMergingKey(`approve-${req.id}`);
            try {
              const result = await approveMergeRequest(apiClient, req.id);
              showSuccessToast(`合并完成：${result.record.target_label}`);
              await refreshAll();
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

  const handleReject = (req: MergeRequestRow) => {
    Alert.alert(
      '确认拒绝',
      `确认拒绝学校「${req.requesting_school_name || '未知'}」的合并请求？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '拒绝',
          onPress: async () => {
            setMergingKey(`reject-${req.id}`);
            try {
              await rejectMergeRequest(apiClient, req.id);
              showSuccessToast('已拒绝合并请求');
              await refreshAll();
            } catch (error) {
              showErrorToast(error instanceof Error ? error.message : '操作失败');
            } finally {
              setMergingKey('');
            }
          },
        },
      ],
    );
  };

  const handleCancel = (req: MergeRequestRow) => {
    Alert.alert(
      '确认取消',
      '确认取消该合并请求？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '取消请求',
          onPress: async () => {
            setMergingKey(`cancel-${req.id}`);
            try {
              await cancelMergeRequest(apiClient, req.id);
              showSuccessToast('已取消合并请求');
              await refreshAll();
            } catch (error) {
              showErrorToast(error instanceof Error ? error.message : '取消失败');
            } finally {
              setMergingKey('');
            }
          },
        },
      ],
    );
  };

  // -- Notifications ----------------------------------------------------

  const handleNotifPress = async (notif: NotificationRow) => {
    if (!notif.is_read) {
      try { await markNotificationRead(apiClient, notif.id); } catch {}
      await loadNotifications();
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // -- Render -----------------------------------------------------------

  return (
    <AccountConsoleShell title="学校信息管理" active="admin-schools">
      {/* Top action bar */}
      <View style={styles.notifBar}>
        <Pressable style={styles.mergeBtn} onPress={() => { setPhoneInput(''); setShowMergeModal(true); }}>
          <Text style={styles.mergeBtnText}>合并学校</Text>
        </Pressable>
        <Pressable
          style={styles.notifBell}
          onPress={() => { setShowNotifModal(true); void loadNotifications(); }}
        >
          <Text style={styles.notifBellIcon}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

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

            {/* -- Incoming merge requests ------------------------------- */}
            <SectionTitle title={`收到的合并请求${incoming.length > 0 ? ` (${incoming.length})` : ''}`} />
            <ScrollView horizontal>
              <View style={styles.table}>
                <TableHeader columns={['请求方学校', '请求方管理员', '请求时间', '操作']} />
                {incoming.length === 0 ? (
                  <Text style={styles.empty}>暂无收到的合并请求</Text>
                ) : (
                  incoming.map((req) => (
                    <View key={req.id} style={styles.row}>
                      <Text style={styles.cell}>{req.requesting_school_name || '—'}</Text>
                      <Text style={styles.cell}>{req.requesting_admin_name || req.requesting_admin_phone || '—'}</Text>
                      <Text style={styles.cell}>{new Date(req.created_at * 1000).toLocaleString()}</Text>
                      <View style={[styles.cell, styles.actionCell]}>
                        <SecondaryButton
                          label={mergingKey === `approve-${req.id}` ? '处理中…' : '批准'}
                          onPress={() => handleApprove(req)}
                          disabled={Boolean(mergingKey)}
                        />
                        <SecondaryButton
                          label={mergingKey === `reject-${req.id}` ? '处理中…' : '拒绝'}
                          onPress={() => handleReject(req)}
                          disabled={Boolean(mergingKey)}
                        />
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>

            {/* -- Outgoing merge requests ------------------------------- */}
            <SectionTitle title="发出的合并请求" />
            <ScrollView horizontal>
              <View style={styles.table}>
                <TableHeader columns={['目标学校', '目标管理员手机', '状态', '发起时间', '操作']} />
                {outgoing.length === 0 ? (
                  <Text style={styles.empty}>暂无发出的合并请求</Text>
                ) : (
                  outgoing.map((req) => (
                    <View key={req.id} style={styles.row}>
                      <Text style={styles.cell}>{req.target_school_name || '—'}</Text>
                      <Text style={styles.cell}>{req.target_admin_phone || '—'}</Text>
                      <Text style={styles.cell}>{STATUS_LABELS[req.status] || req.status}</Text>
                      <Text style={styles.cell}>{new Date(req.created_at * 1000).toLocaleString()}</Text>
                      <View style={[styles.cell, styles.actionCell]}>
                        {req.status === 'pending' && (
                          <SecondaryButton
                            label={mergingKey === `cancel-${req.id}` ? '取消中…' : '取消'}
                            onPress={() => handleCancel(req)}
                            disabled={Boolean(mergingKey)}
                          />
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>

            {/* -- Merge history ---------------------------------------- */}
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

      {/* -- Merge school phone modal --------------------------------- */}
      <Modal visible={showMergeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>合并学校</Text>
            <Text style={styles.modalHint}>
              请输入对方学校管理员的手机号，系统将向其发送合并请求确认。
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="请输入对方管理员手机号"
              placeholderTextColor={LoginColors.textMuted}
              value={phoneInput}
              onChangeText={setPhoneInput}
              keyboardType="phone-pad"
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setShowMergeModal(false)}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, (sendingRequest || !phoneInput.trim()) && styles.disabled]}
                onPress={() => void handleSendMergeRequest()}
                disabled={sendingRequest || !phoneInput.trim()}
              >
                <Text style={styles.modalConfirmText}>
                  {sendingRequest ? '发送中…' : '发送合并请求'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* -- Notifications modal --------------------------------------- */}
      <Modal visible={showNotifModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.notifModal}>
            <View style={styles.notifModalHeader}>
              <Text style={styles.modalTitle}>站内通知</Text>
              <Pressable onPress={() => setShowNotifModal(false)}>
                <Text style={styles.notifCloseBtn}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.notifList}>
              {notifications.length === 0 ? (
                <Text style={[styles.subtitle, { padding: 20, textAlign: 'center' }]}>暂无通知</Text>
              ) : (
                notifications.map((n) => (
                  <Pressable
                    key={n.id}
                    style={[styles.notifItem, !n.is_read && styles.notifUnread]}
                    onPress={() => handleNotifPress(n)}
                  >
                    <View style={styles.notifItemHeader}>
                      {!n.is_read && <View style={styles.notifDot} />}
                      <Text style={styles.notifItemTitle}>{n.title}</Text>
                    </View>
                    <Text style={styles.notifItemBody}>{n.message}</Text>
                    <Text style={styles.notifItemTime}>
                      {new Date(n.created_at * 1000).toLocaleString()}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  bold: {
    fontWeight: LoginWeights.extraBold,
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
  actionCell: {
    flexDirection: 'row',
    gap: 6,
    width: 200,
  },
  empty: {
    width: 850,
    padding: 18,
    color: LoginColors.textMuted,
    fontWeight: LoginWeights.bold,
  },

  // Top action bar
  notifBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 10,
  },
  // Merge button
  mergeBtn: {
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  mergeBtnText: {
    color: '#fff',
    fontWeight: LoginWeights.extraBold,
    fontSize: 14,
  },
  notifBell: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: LoginColors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBellIcon: {
    fontSize: 22,
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: LoginWeights.extraBold,
  },

  // Notifications modal
  notifModal: {
    width: '90%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  notifModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: LoginColors.line,
  },
  notifCloseBtn: {
    fontSize: 18,
    color: LoginColors.textMuted,
    fontWeight: LoginWeights.bold,
  },
  notifList: {
    flexGrow: 0,
  },
  notifItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  notifUnread: {
    backgroundColor: '#eff6ff',
  },
  notifItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#3b82f6',
  },
  notifItemTitle: {
    fontSize: 15,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
  },
  notifItemBody: {
    fontSize: 13,
    color: LoginColors.textLabel,
    marginTop: 4,
    lineHeight: 18,
  },
  notifItemTime: {
    fontSize: 11,
    color: LoginColors.textMuted,
    marginTop: 6,
  },

  // Merge request modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
    marginBottom: 12,
  },
  modalDesc: {
    fontSize: 15,
    color: LoginColors.textLabel,
    lineHeight: 22,
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 13,
    color: LoginColors.textMuted,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: LoginColors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: LoginColors.text,
    backgroundColor: '#f8fafc',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalCancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: LoginColors.secondaryBg,
    borderWidth: 1,
    borderColor: LoginColors.secondaryBorder,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: LoginWeights.bold,
    color: LoginColors.secondaryText,
  },
  modalConfirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: LoginColors.primaryStart,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: LoginWeights.extraBold,
    color: '#fff',
  },
  disabled: {
    opacity: 0.55,
  },
});
