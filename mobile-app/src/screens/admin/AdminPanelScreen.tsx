import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Circle, Path, Polyline, Rect} from 'react-native-svg';
import {
  subscribeToAllUsers,
  subscribeToResourceRequests,
  fetchUserDetail,
  approveUser,
  rejectUser,
  approveWarehouseRequest,
  approveZoneRequest,
  approveResourceRequest,
  rejectWarehouseRequest,
  rejectZoneRequest,
  rejectResourceRequest,
  adminDeleteSensor,
  adminDeleteZone,
  adminDeleteWarehouse,
  adminDeleteUser,
  adminToggleSensor,
  setUserTickInterval,
} from '../../lib/adminService';
import type {UserProfile, ResourceRequest, AdminUserDetail} from '../../lib/adminService';
import {fontWeight} from '../../theme/tokens';

// ─── Design constants ─────────────────────────────────────────────────────────

const C = {
  primary: '#1f5135',
  primaryDark: '#174028',
  bg: '#f6f8f3',
  white: '#ffffff',
  textPrimary: '#172118',
  textSecondary: '#5e6b5f',
  textMuted: '#8e9b8f',
  border: '#e5e7eb',
  bgMuted: '#f8fafc',
  red: '#ef4444',
  amber: '#f59e0b',
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#8b5cf6',
};

type Tab = 'users' | 'requests';

const TICK_OPTIONS = [
  {label: '10 seconds', value: 10},
  {label: '30 seconds', value: 30},
  {label: '1 minute', value: 60},
  {label: '5 minutes', value: 300},
  {label: '10 minutes', value: 600},
  {label: '30 minutes', value: 1800},
];

// ─── Helper icons ─────────────────────────────────────────────────────────────

function IconUsers() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="inherit" />
      <Circle cx="9" cy="7" r="4" stroke="inherit" />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="inherit" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="inherit" />
    </Svg>
  );
}

function IconRequests() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <Rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="inherit" />
      <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="inherit" />
    </Svg>
  );
}

function IconCheck() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth={2.5}>
      <Polyline points="20 6 9 17 4 12" stroke={C.green} />
    </Svg>
  );
}

function IconX() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth={2.5}>
      <Path d="M18 6 6 18M6 6l12 12" stroke={C.red} />
    </Svg>
  );
}

function IconTrash() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth={2}>
      <Polyline points="3 6 5 6 21 6" stroke={C.red} />
      <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={C.red} />
    </Svg>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function StatusBadge({status}: {status: string}) {
  const map: Record<string, {bg: string; text: string; label: string}> = {
    pending:  {bg: '#fef3c7', text: C.amber,   label: 'Pending'},
    approved: {bg: '#dcfce7', text: C.green,   label: 'Approved'},
    rejected: {bg: '#fee2e2', text: C.red,     label: 'Rejected'},
    active:   {bg: '#dcfce7', text: C.green,   label: 'Active'},
    inactive: {bg: '#f3f4f6', text: C.textMuted, label: 'Inactive'},
  };
  const s = map[status] ?? {bg: '#f3f4f6', text: C.textMuted, label: status};
  return (
    <View style={[styles.badge, {backgroundColor: s.bg}]}>
      <Text style={[styles.badgeText, {color: s.text}]}>{s.label}</Text>
    </View>
  );
}

function SectionHead({title, count}: {title: string; count: number}) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.countBadge}>
        <Text style={styles.countText}>{count}</Text>
      </View>
    </View>
  );
}

function EmptyState({message}: {message: string}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

// ─── Reject Reason Modal ──────────────────────────────────────────────────────

function RejectModal({
  visible,
  title,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const handleConfirm = () => {
    if (!reason.trim()) {
      Alert.alert('Reason required', 'Please provide a rejection reason.');
      return;
    }
    onConfirm(reason.trim());
    setReason('');
  };
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.rejectModal}>
          <Text style={styles.rejectModalTitle}>{title}</Text>
          <TextInput
            style={styles.rejectInput}
            placeholder="Enter rejection reason..."
            placeholderTextColor={C.textMuted}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
          />
          <View style={styles.rejectActions}>
            <TouchableOpacity style={styles.btnSecondary} onPress={onCancel}>
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnDanger} onPress={handleConfirm}>
              <Text style={styles.btnDangerText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── User Detail Modal ────────────────────────────────────────────────────────

function UserDetailModal({
  uid,
  user,
  onClose,
}: {
  uid: string;
  user: UserProfile;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTick, setSelectedTick] = useState<number>(60);
  const [savingTick, setSavingTick] = useState(false);
  const [showTickMenu, setShowTickMenu] = useState(false);

  useEffect(() => {
    fetchUserDetail(uid)
      .then(d => {
        setDetail(d);
        setSelectedTick(d.tickIntervalSeconds);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [uid]);

  const handleSaveTick = async () => {
    setSavingTick(true);
    try {
      await setUserTickInterval(uid, selectedTick);
      Alert.alert('Saved', 'Tick interval updated.');
    } catch {
      Alert.alert('Error', 'Failed to update tick interval.');
    } finally {
      setSavingTick(false);
    }
  };

  const handleDeleteSensor = (sensorId: string, name: string) => {
    Alert.alert('Delete Sensor', `Delete "${name}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: async () => {
        try { await adminDeleteSensor(uid, sensorId); setDetail(prev => prev ? {...prev, sensors: prev.sensors.filter(s => s.id !== sensorId)} : prev); }
        catch { Alert.alert('Error', 'Failed to delete sensor.'); }
      }},
    ]);
  };

  const handleToggleSensor = async (sensorId: string, active: boolean) => {
    try {
      await adminToggleSensor(uid, sensorId, active);
      setDetail(prev => prev ? {...prev, sensors: prev.sensors.map(s => s.id === sensorId ? {...s, status: active ? 'active' : 'inactive'} : s)} : prev);
    } catch {
      Alert.alert('Error', 'Failed to toggle sensor.');
    }
  };

  const handleDeleteZone = (zoneId: string, name: string) => {
    Alert.alert('Delete Zone', `Delete "${name}" and all its sensors?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await adminDeleteZone(uid, zoneId);
          setDetail(prev => prev ? {...prev, zones: prev.zones.filter(z => z.id !== zoneId), sensors: prev.sensors.filter(s => s.zoneId !== zoneId)} : prev);
        } catch { Alert.alert('Error', 'Failed to delete zone.'); }
      }},
    ]);
  };

  const handleDeleteWarehouse = (warehouseId: string, name: string) => {
    Alert.alert('Delete Warehouse', `Delete "${name}" and ALL its zones and sensors?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await adminDeleteWarehouse(uid, warehouseId);
          setDetail(prev => prev ? {
            ...prev,
            warehouses: prev.warehouses.filter(w => w.id !== warehouseId),
            zones: prev.zones.filter(z => z.warehouseId !== warehouseId),
            sensors: prev.sensors.filter(s => s.warehouseId !== warehouseId),
          } : prev);
        } catch { Alert.alert('Error', 'Failed to delete warehouse.'); }
      }},
    ]);
  };

  const tickLabel = TICK_OPTIONS.find(o => o.value === selectedTick)?.label ?? `${selectedTick}s`;

  return (
    <Modal visible animationType="slide">
      <SafeAreaView style={styles.modalScreen}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>{user.displayName || user.email}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{marginTop: 40}} color={C.primary} />
        ) : (
          <ScrollView style={styles.modalBody} contentContainerStyle={{paddingBottom: 40}}>
            {/* User info */}
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{user.email}</Text>
              <Text style={styles.detailLabel}>Role</Text>
              <Text style={styles.detailValue}>{user.role ?? 'user'}</Text>
              <Text style={styles.detailLabel}>Status</Text>
              <StatusBadge status={user.approvalStatus} />
            </View>

            {/* Tick interval */}
            <View style={styles.detailCard}>
              <Text style={styles.detailSectionTitle}>Sensor Tick Interval</Text>
              <TouchableOpacity style={styles.tickSelector} onPress={() => setShowTickMenu(true)}>
                <Text style={styles.tickSelectorText}>{tickLabel}</Text>
                <Text style={styles.tickChevron}>▾</Text>
              </TouchableOpacity>
              {showTickMenu && (
                <View style={styles.tickMenu}>
                  {TICK_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.tickMenuItem, opt.value === selectedTick && styles.tickMenuItemActive]}
                      onPress={() => {setSelectedTick(opt.value); setShowTickMenu(false);}}>
                      <Text style={[styles.tickMenuText, opt.value === selectedTick && styles.tickMenuTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveTick} disabled={savingTick}>
                <Text style={styles.btnPrimaryText}>{savingTick ? 'Saving…' : 'Save Interval'}</Text>
              </TouchableOpacity>
            </View>

            {/* Warehouses, zones, sensors */}
            {detail && detail.warehouses.map(wh => {
              const whZones = detail.zones.filter(z => z.warehouseId === wh.id);
              return (
                <View key={wh.id} style={styles.detailCard}>
                  <View style={styles.detailCardHeader}>
                    <Text style={styles.detailSectionTitle}>{wh.name}</Text>
                    <TouchableOpacity onPress={() => handleDeleteWarehouse(wh.id, wh.name)}>
                      <IconTrash />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.detailMeta}>{wh.location} · {wh.capacity} MT capacity</Text>
                  {whZones.length === 0 && <Text style={styles.detailEmpty}>No zones</Text>}
                  {whZones.map(zone => {
                    const zoneSensors = detail.sensors.filter(s => s.zoneId === zone.id);
                    return (
                      <View key={zone.id} style={styles.zoneBlock}>
                        <View style={styles.zoneHeader}>
                          <Text style={styles.zoneName}>{zone.name}</Text>
                          <TouchableOpacity onPress={() => handleDeleteZone(zone.id, zone.name)}>
                            <IconTrash />
                          </TouchableOpacity>
                        </View>
                        {zoneSensors.length === 0 && <Text style={styles.detailEmpty}>No sensors</Text>}
                        {zoneSensors.map(sensor => (
                          <View key={sensor.id} style={styles.sensorRow}>
                            <View style={styles.sensorInfo}>
                              <Text style={styles.sensorName}>{sensor.name || sensor.type}</Text>
                              <StatusBadge status={sensor.status} />
                            </View>
                            <View style={styles.sensorActions}>
                              <TouchableOpacity
                                style={styles.toggleBtn}
                                onPress={() => handleToggleSensor(sensor.id, sensor.status !== 'active')}>
                                <Text style={styles.toggleBtnText}>
                                  {sensor.status === 'active' ? 'Disable' : 'Enable'}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => handleDeleteSensor(sensor.id, sensor.name || sensor.type)}>
                                <IconTrash />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                </View>
              );
            })}

            {/* Delete user */}
            <TouchableOpacity
              style={styles.btnDangerFull}
              onPress={() => Alert.alert('Delete User', `Permanently delete ${user.email} and all their data?`, [
                {text: 'Cancel', style: 'cancel'},
                {text: 'Delete', style: 'destructive', onPress: async () => {
                  try { await adminDeleteUser(uid); onClose(); }
                  catch { Alert.alert('Error', 'Failed to delete user.'); }
                }},
              ])}>
              <Text style={styles.btnDangerText}>Delete User & All Data</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Request Detail Modal ─────────────────────────────────────────────────────

function RequestDetailModal({
  req,
  onClose,
  onApprove,
  onReject,
}: {
  req: ResourceRequest;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const typeLabel = req.type === 'warehouse_creation'
    ? 'Warehouse Request'
    : req.type === 'zone_creation'
    ? 'Zone Request'
    : 'Sensor Request';

  return (
    <Modal visible animationType="slide">
      <SafeAreaView style={styles.modalScreen}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>{typeLabel}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalBody} contentContainerStyle={{paddingBottom: 40}}>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Requested by</Text>
            <Text style={styles.detailValue}>{req.userName} ({req.userEmail})</Text>
            <Text style={styles.detailLabel}>Status</Text>
            <StatusBadge status={req.status} />
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{new Date(req.createdAt).toLocaleString()}</Text>
          </View>

          {req.type === 'warehouse_creation' && (
            <View style={styles.detailCard}>
              <Text style={styles.detailSectionTitle}>Warehouse Details</Text>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailValue}>{req.warehouseName}</Text>
              <Text style={styles.detailLabel}>Capacity</Text>
              <Text style={styles.detailValue}>{req.warehouseCapacity} MT</Text>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{req.warehouseLocation}</Text>
              {req.zones && req.zones.length > 0 && (
                <>
                  <Text style={[styles.detailLabel, {marginTop: 12}]}>Zones & Sensors</Text>
                  {req.zones.map((zone, zi) => (
                    <View key={zi} style={styles.zoneBlock}>
                      <Text style={styles.zoneName}>{zone.name}</Text>
                      {zone.sensors.map((s, si) => (
                        <Text key={si} style={styles.sensorName}>• {s.name || s.type} ({s.type})</Text>
                      ))}
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {req.type === 'zone_creation' && (
            <View style={styles.detailCard}>
              <Text style={styles.detailSectionTitle}>Zone Details</Text>
              <Text style={styles.detailLabel}>Zone Name</Text>
              <Text style={styles.detailValue}>{req.zoneName}</Text>
            </View>
          )}

          {req.type === 'sensor_activation' && (
            <View style={styles.detailCard}>
              <Text style={styles.detailSectionTitle}>Sensor Details</Text>
              <Text style={styles.detailLabel}>Sensor Name</Text>
              <Text style={styles.detailValue}>{req.sensorName}</Text>
              <Text style={styles.detailLabel}>Sensor Type</Text>
              <Text style={styles.detailValue}>{req.sensorType}</Text>
            </View>
          )}

          {req.status === 'pending' && (
            <View style={styles.requestActions}>
              <TouchableOpacity style={styles.btnApprove} onPress={onApprove}>
                <IconCheck />
                <Text style={styles.btnApproveText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnReject} onPress={onReject}>
                <IconX />
                <Text style={styles.btnRejectText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}

          {req.status === 'rejected' && req.rejectedReason && (
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Rejection Reason</Text>
              <Text style={[styles.detailValue, {color: C.red}]}>{req.rejectedReason}</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Users tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [rejectingUid, setRejectingUid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAllUsers(u => {
      setUsers(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleApprove = async (uid: string) => {
    try {
      await approveUser(uid);
    } catch {
      Alert.alert('Error', 'Failed to approve user.');
    }
  };

  const handleReject = async (uid: string, reason: string) => {
    try {
      await rejectUser(uid, reason);
      setRejectingUid(null);
    } catch {
      Alert.alert('Error', 'Failed to reject user.');
    }
  };

  if (loading) return <ActivityIndicator style={{marginTop: 40}} color={C.primary} />;

  const pending  = users.filter(u => u.approvalStatus === 'pending');
  const approved = users.filter(u => u.approvalStatus === 'approved');
  const rejected = users.filter(u => u.approvalStatus === 'rejected');

  const renderUser = (user: UserProfile) => (
    <TouchableOpacity
      key={user.uid}
      style={styles.userCard}
      onPress={() => setSelectedUser(user)}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>
          {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.displayName || '—'}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>
      <StatusBadge status={user.approvalStatus} />
      {user.approvalStatus === 'pending' && (
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickApprove}
            onPress={e => {e.stopPropagation?.(); handleApprove(user.uid);}}>
            <IconCheck />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickReject}
            onPress={e => {e.stopPropagation?.(); setRejectingUid(user.uid);}}>
            <IconX />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={{paddingBottom: 40}}>
      <SectionHead title="Pending Approval" count={pending.length} />
      {pending.length === 0
        ? <EmptyState message="No pending users" />
        : pending.map(renderUser)}

      <SectionHead title="Approved" count={approved.length} />
      {approved.length === 0
        ? <EmptyState message="No approved users" />
        : approved.map(renderUser)}

      <SectionHead title="Rejected" count={rejected.length} />
      {rejected.length === 0
        ? <EmptyState message="No rejected users" />
        : rejected.map(renderUser)}

      {selectedUser && (
        <UserDetailModal
          uid={selectedUser.uid}
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}

      <RejectModal
        visible={!!rejectingUid}
        title="Reject User"
        onCancel={() => setRejectingUid(null)}
        onConfirm={reason => rejectingUid && handleReject(rejectingUid, reason)}
      />
    </ScrollView>
  );
}

// ─── Resource Requests tab ────────────────────────────────────────────────────

function RequestsTab() {
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<ResourceRequest | null>(null);
  const [rejectingReq, setRejectingReq] = useState<ResourceRequest | null>(null);

  useEffect(() => {
    const unsub = subscribeToResourceRequests(r => {
      setRequests(r);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleApprove = useCallback(async (req: ResourceRequest) => {
    try {
      if (req.type === 'warehouse_creation') {
        await approveWarehouseRequest(req);
      } else if (req.type === 'zone_creation') {
        await approveZoneRequest(req);
      } else if (req.type === 'sensor_activation' && req.sensorId) {
        await approveResourceRequest(req.id, req.uid, req.sensorId);
      }
      setSelectedReq(null);
      Alert.alert('Approved', 'Request approved and resources created.');
    } catch {
      Alert.alert('Error', 'Failed to approve request.');
    }
  }, []);

  const handleReject = useCallback(async (req: ResourceRequest, reason: string) => {
    try {
      if (req.type === 'warehouse_creation') {
        await rejectWarehouseRequest(req, reason);
      } else if (req.type === 'zone_creation') {
        await rejectZoneRequest(req, reason);
      } else if (req.type === 'sensor_activation' && req.sensorId) {
        await rejectResourceRequest(req.id, req.uid, req.sensorId, reason);
      }
      setRejectingReq(null);
      setSelectedReq(null);
    } catch {
      Alert.alert('Error', 'Failed to reject request.');
    }
  }, []);

  if (loading) return <ActivityIndicator style={{marginTop: 40}} color={C.primary} />;

  const pending  = requests.filter(r => r.status === 'pending');
  const reviewed = requests.filter(r => r.status !== 'pending');

  const renderRequest = (req: ResourceRequest) => {
    const typeLabel = req.type === 'warehouse_creation'
      ? 'Warehouse'
      : req.type === 'zone_creation'
      ? 'Zone'
      : 'Sensor';
    const nameLabel = req.type === 'warehouse_creation'
      ? req.warehouseName
      : req.type === 'zone_creation'
      ? req.zoneName
      : req.sensorName;

    return (
      <TouchableOpacity
        key={req.id}
        style={styles.requestCard}
        onPress={() => setSelectedReq(req)}>
        <View style={styles.requestType}>
          <Text style={styles.requestTypeText}>{typeLabel}</Text>
        </View>
        <View style={styles.requestBody}>
          <Text style={styles.requestName}>{nameLabel || '—'}</Text>
          <Text style={styles.requestUser}>{req.userName} · {req.userEmail}</Text>
          <Text style={styles.requestDate}>{new Date(req.createdAt).toLocaleDateString()}</Text>
        </View>
        <StatusBadge status={req.status} />
        {req.status === 'pending' && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickApprove}
              onPress={() => handleApprove(req)}>
              <IconCheck />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickReject}
              onPress={() => setRejectingReq(req)}>
              <IconX />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={{paddingBottom: 40}}>
      <SectionHead title="Pending" count={pending.length} />
      {pending.length === 0
        ? <EmptyState message="No pending requests" />
        : pending.map(renderRequest)}

      <SectionHead title="Reviewed" count={reviewed.length} />
      {reviewed.length === 0
        ? <EmptyState message="No reviewed requests" />
        : reviewed.map(renderRequest)}

      {selectedReq && (
        <RequestDetailModal
          req={selectedReq}
          onClose={() => setSelectedReq(null)}
          onApprove={() => handleApprove(selectedReq)}
          onReject={() => {setRejectingReq(selectedReq); setSelectedReq(null);}}
        />
      )}

      <RejectModal
        visible={!!rejectingReq}
        title={`Reject ${rejectingReq?.type === 'warehouse_creation' ? 'Warehouse' : rejectingReq?.type === 'zone_creation' ? 'Zone' : 'Sensor'} Request`}
        onCancel={() => setRejectingReq(null)}
        onConfirm={reason => rejectingReq && handleReject(rejectingReq, reason)}
      />
    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AdminPanelScreen() {
  const [tab, setTab] = useState<Tab>('users');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <Text style={styles.headerSubtitle}>Manage users & resource requests</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'users' && styles.tabBtnActive]}
          onPress={() => setTab('users')}>
          <View style={styles.tabBtnInner}>
            <View style={{opacity: tab === 'users' ? 1 : 0.5}}>
              <IconUsers />
            </View>
            <Text style={[styles.tabLabel, tab === 'users' && styles.tabLabelActive]}>Users</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'requests' && styles.tabBtnActive]}
          onPress={() => setTab('requests')}>
          <View style={styles.tabBtnInner}>
            <View style={{opacity: tab === 'requests' ? 1 : 0.5}}>
              <IconRequests />
            </View>
            <Text style={[styles.tabLabel, tab === 'requests' && styles.tabLabelActive]}>
              Resource Requests
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {tab === 'users' ? <UsersTab /> : <RequestsTab />}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: C.bg},
  header: {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border},
  headerTitle: {fontSize: 22, fontWeight: fontWeight.bold as any, color: C.textPrimary},
  headerSubtitle: {fontSize: 13, color: C.textSecondary, marginTop: 2},

  tabBar: {flexDirection: 'row', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border},
  tabBtn: {flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent'},
  tabBtnActive: {borderBottomColor: C.primary},
  tabBtnInner: {flexDirection: 'row', alignItems: 'center', gap: 6},
  tabLabel: {fontSize: 13, color: C.textSecondary, fontWeight: fontWeight.medium as any},
  tabLabelActive: {color: C.primary, fontWeight: fontWeight.semibold as any},

  tabContent: {flex: 1, padding: 16},

  sectionHead: {flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 8, gap: 8},
  sectionTitle: {fontSize: 14, fontWeight: fontWeight.semibold as any, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5},
  countBadge: {backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2},
  countText: {fontSize: 11, color: C.white, fontWeight: fontWeight.bold as any},

  emptyState: {padding: 16, backgroundColor: C.white, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center', marginBottom: 8},
  emptyText: {fontSize: 13, color: C.textMuted},

  badge: {borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3},
  badgeText: {fontSize: 11, fontWeight: fontWeight.semibold as any},

  // User card
  userCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border, gap: 10},
  userAvatar: {width: 38, height: 38, borderRadius: 19, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center'},
  userAvatarText: {color: C.white, fontSize: 16, fontWeight: fontWeight.bold as any},
  userInfo: {flex: 1},
  userName: {fontSize: 14, fontWeight: fontWeight.semibold as any, color: C.textPrimary},
  userEmail: {fontSize: 12, color: C.textSecondary, marginTop: 1},

  // Request card
  requestCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border, gap: 10},
  requestType: {backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4},
  requestTypeText: {fontSize: 11, color: C.blue, fontWeight: fontWeight.semibold as any},
  requestBody: {flex: 1},
  requestName: {fontSize: 14, fontWeight: fontWeight.semibold as any, color: C.textPrimary},
  requestUser: {fontSize: 11, color: C.textSecondary, marginTop: 2},
  requestDate: {fontSize: 11, color: C.textMuted, marginTop: 1},

  // Quick actions
  quickActions: {flexDirection: 'row', gap: 6},
  quickApprove: {width: 30, height: 30, borderRadius: 15, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center'},
  quickReject: {width: 30, height: 30, borderRadius: 15, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center'},

  // Request detail actions
  requestActions: {flexDirection: 'row', gap: 12, marginTop: 16},
  btnApprove: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#dcfce7', borderRadius: 10, paddingVertical: 12, borderWidth: 1, borderColor: '#bbf7d0'},
  btnApproveText: {color: '#15803d', fontWeight: fontWeight.semibold as any},
  btnReject: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fee2e2', borderRadius: 10, paddingVertical: 12, borderWidth: 1, borderColor: '#fecaca'},
  btnRejectText: {color: C.red, fontWeight: fontWeight.semibold as any},

  // Reject modal
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24},
  rejectModal: {backgroundColor: C.white, borderRadius: 16, padding: 24},
  rejectModalTitle: {fontSize: 16, fontWeight: fontWeight.bold as any, color: C.textPrimary, marginBottom: 12},
  rejectInput: {borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 14, color: C.textPrimary, minHeight: 80, textAlignVertical: 'top', marginBottom: 16},
  rejectActions: {flexDirection: 'row', gap: 12},
  btnSecondary: {flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center'},
  btnSecondaryText: {color: C.textSecondary, fontWeight: fontWeight.medium as any},
  btnDanger: {flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: C.red, alignItems: 'center'},
  btnDangerText: {color: C.white, fontWeight: fontWeight.semibold as any},
  btnDangerFull: {marginTop: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: C.red, alignItems: 'center'},

  // Modal screen (full-screen)
  modalScreen: {flex: 1, backgroundColor: C.bg},
  modalHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border},
  modalHeaderTitle: {fontSize: 18, fontWeight: fontWeight.bold as any, color: C.textPrimary},
  closeBtn: {padding: 6},
  closeBtnText: {fontSize: 18, color: C.textSecondary},
  modalBody: {flex: 1, padding: 16},

  // Detail card
  detailCard: {backgroundColor: C.white, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border},
  detailCardHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4},
  detailLabel: {fontSize: 11, color: C.textMuted, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5},
  detailValue: {fontSize: 14, color: C.textPrimary, marginTop: 2},
  detailSectionTitle: {fontSize: 15, fontWeight: fontWeight.semibold as any, color: C.textPrimary, marginBottom: 8},
  detailMeta: {fontSize: 12, color: C.textSecondary, marginBottom: 8},
  detailEmpty: {fontSize: 12, color: C.textMuted, fontStyle: 'italic', marginTop: 4},

  // Zone / sensor
  zoneBlock: {backgroundColor: C.bgMuted, borderRadius: 8, padding: 10, marginTop: 8},
  zoneHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6},
  zoneName: {fontSize: 13, fontWeight: fontWeight.semibold as any, color: C.textPrimary},
  sensorRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.border},
  sensorInfo: {flexDirection: 'row', alignItems: 'center', gap: 8},
  sensorName: {fontSize: 12, color: C.textSecondary},
  sensorActions: {flexDirection: 'row', alignItems: 'center', gap: 10},
  toggleBtn: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: C.border, backgroundColor: C.white},
  toggleBtnText: {fontSize: 11, color: C.textSecondary},

  // Tick interval
  tickSelector: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, backgroundColor: C.bgMuted, marginBottom: 8},
  tickSelectorText: {fontSize: 14, color: C.textPrimary},
  tickChevron: {fontSize: 14, color: C.textSecondary},
  tickMenu: {backgroundColor: C.white, borderRadius: 10, borderWidth: 1, borderColor: C.border, marginBottom: 8, overflow: 'hidden'},
  tickMenuItem: {padding: 12, borderBottomWidth: 1, borderBottomColor: C.border},
  tickMenuItemActive: {backgroundColor: '#f0fdf4'},
  tickMenuText: {fontSize: 14, color: C.textPrimary},
  tickMenuTextActive: {color: C.primary, fontWeight: fontWeight.semibold as any},

  // Buttons
  btnPrimary: {paddingVertical: 12, borderRadius: 10, backgroundColor: C.primary, alignItems: 'center'},
  btnPrimaryText: {color: C.white, fontWeight: fontWeight.semibold as any, fontSize: 14},
});
