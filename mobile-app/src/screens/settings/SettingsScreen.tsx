import React, {useState, useCallback} from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Circle, Line, Path, Polyline, Rect} from 'react-native-svg';
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
  purple: '#8b5cf6',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'general' | 'notifications' | 'sensors' | 'security' | 'appearance';

interface Profile {
  name: string;
  email: string;
  department: string;
  initials: string;
}

interface Preferences {
  language: string;
  timezone: string;
  dateFormat: string;
  tempUnit: string;
}

interface SensorThreshold {
  id: string;
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  alertEnabled: boolean;
  accentColor: string;
}

// ─── Default data ─────────────────────────────────────────────────────────────

const DEFAULT_PROFILE: Profile = {
  name: 'Admin User',
  email: 'admin@sensegrain.com',
  department: 'Operations',
  initials: 'A',
};

const DEFAULT_PREFS: Preferences = {
  language: 'English',
  timezone: '(GMT+05:00) Asia/Karachi',
  dateFormat: 'May 21, 2026',
  tempUnit: '°C',
};

const APP_TOGGLES = [
  {id: 'autoRefresh', label: 'Auto Refresh Data', desc: 'Refresh dashboard data every 60 seconds', on: true, accentColor: C.primary},
  {id: 'predictiveAlerts', label: 'Predictive Alerts', desc: 'AI-powered risk predictions before threshold breach', on: true, accentColor: C.purple},
  {id: 'emailReports', label: 'Daily Email Reports', desc: 'Receive a morning summary report to your email', on: true, accentColor: C.amber},
  {id: 'soundAlerts', label: 'Sound Alerts', desc: 'Play a chime for critical notifications', on: false, accentColor: C.blue},
];

const NOTIF_CHANNELS = [
  {id: 'email', label: 'Email Alerts', desc: 'Critical alerts to admin@sensegrain.com', on: true, accentColor: C.amber},
  {id: 'sms', label: 'SMS Alerts', desc: 'Text messages for critical sensor events', on: false, accentColor: C.blue},
  {id: 'push', label: 'Push Notifications', desc: 'Device push alerts', on: true, accentColor: C.purple},
  {id: 'inapp', label: 'In-App Notifications', desc: 'Badge and panel alerts inside the app', on: true, accentColor: '#14b8a6'},
];

const NOTIF_PREFS = [
  {id: 'critical', label: 'Critical Alerts', desc: 'Temperature spikes, spoilage risk, offline sensors', on: true, accentColor: C.red},
  {id: 'high', label: 'High Severity', desc: 'Alerts requiring prompt attention within 1 hour', on: true, accentColor: '#f97316'},
  {id: 'medium', label: 'Medium Severity', desc: 'Moderate issues to monitor and review', on: true, accentColor: C.amber},
  {id: 'info', label: 'System Info', desc: 'Routine status updates and system messages', on: false, accentColor: '#6b7280'},
  {id: 'digest', label: 'Weekly Digest', desc: 'Summary email every Monday at 08:00 AM', on: true, accentColor: C.primary},
];

const DEFAULT_THRESHOLDS: SensorThreshold[] = [
  {id: 'temp', label: 'Temperature', value: 32, unit: '°C', min: 25, max: 45, step: 0.5, alertEnabled: true, accentColor: C.amber},
  {id: 'humidity', label: 'Humidity', value: 70, unit: '%', min: 50, max: 95, step: 1, alertEnabled: true, accentColor: C.blue},
  {id: 'moisture', label: 'Moisture', value: 14, unit: '%', min: 10, max: 20, step: 0.5, alertEnabled: true, accentColor: '#14b8a6'},
  {id: 'co2', label: 'CO₂ Level', value: 600, unit: 'ppm', min: 400, max: 1200, step: 10, alertEnabled: true, accentColor: C.purple},
  {id: 'aqi', label: 'Air Quality (AQI)', value: 100, unit: 'AQI', min: 50, max: 300, step: 5, alertEnabled: false, accentColor: '#f97316'},
  {id: 'capacity', label: 'Storage Capacity', value: 90, unit: '%', min: 70, max: 99, step: 1, alertEnabled: true, accentColor: C.primary},
];

const MOCK_SESSIONS = [
  {id: 'cur', device: 'Sense Grain Mobile App', location: 'Karachi, PK', time: 'Active now', current: true},
  {id: 's2', device: 'Chrome · Windows 10', location: 'Lahore, PK', time: 'Yesterday, 11:30 PM', current: false},
  {id: 's3', device: 'Firefox · MacBook', location: 'Islamabad, PK', time: '3 days ago', current: false},
];

const MOCK_HISTORY = [
  {id: 1, device: 'Mobile App · Android', location: 'Karachi, PK', time: 'Today, 09:14 AM', status: 'success'},
  {id: 2, device: 'Chrome · Windows 10', location: 'Lahore, PK', time: 'Yesterday, 11:30 PM', status: 'success'},
  {id: 3, device: 'Mobile App · Android', location: 'Karachi, PK', time: 'May 20, 08:45 AM', status: 'success'},
  {id: 4, device: 'Chrome · Windows 10', location: 'Karachi, PK', time: 'May 18, 03:21 PM', status: 'failed'},
  {id: 5, device: 'Firefox · MacBook', location: 'Islamabad, PK', time: 'May 17, 10:00 AM', status: 'success'},
];

// ─── Shared primitives ────────────────────────────────────────────────────────

function Card({children, style}: {children: React.ReactNode; style?: object}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function SectionHead({title, subtitle}: {title: string; subtitle?: string}) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function Toggle({enabled, onChange}: {enabled: boolean; onChange: () => void}) {
  return (
    <TouchableOpacity
      style={[styles.toggle, enabled ? styles.toggleOn : styles.toggleOff]}
      onPress={onChange}
      activeOpacity={0.8}>
      <View style={[styles.toggleThumb, enabled ? styles.toggleThumbOn : styles.toggleThumbOff]} />
    </TouchableOpacity>
  );
}

function RowItem({
  label,
  desc,
  accentColor,
  children,
}: {
  label: string;
  desc: string;
  accentColor: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.rowItem}>
      <View style={[styles.rowAccent, {backgroundColor: accentColor}]} />
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{desc}</Text>
      </View>
      {children}
    </View>
  );
}

function ModalWrapper({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalBox} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Line x1="18" y1="6" x2="6" y2="18" stroke="#9ca3af" strokeWidth={2.5} strokeLinecap="round" />
                <Line x1="6" y1="6" x2="18" y2="18" stroke="#9ca3af" strokeWidth={2.5} strokeLinecap="round" />
              </Svg>
            </TouchableOpacity>
          </View>
          {children}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

function EditProfileModal({
  visible,
  profile,
  onSave,
  onClose,
}: {
  visible: boolean;
  profile: Profile;
  onSave: (p: Profile) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [dept, setDept] = useState(profile.department);

  const handleSave = () => {
    const initials = name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || 'U';
    onSave({name, email, department: dept, initials});
    onClose();
  };

  return (
    <ModalWrapper visible={visible} onClose={onClose} title="Edit Profile">
      <View style={styles.modalBody}>
        <View style={styles.avatarCenter}>
          <View style={styles.avatarLg}>
            <Text style={styles.avatarLgText}>{profile.initials}</Text>
          </View>
        </View>
        {[
          {label: 'Full Name', value: name, set: setName, placeholder: 'Enter your name'},
          {label: 'Email Address', value: email, set: setEmail, placeholder: 'Enter email'},
          {label: 'Department', value: dept, set: setDept, placeholder: 'Enter department'},
        ].map(({label, value, set, placeholder}) => (
          <View key={label} style={styles.formField}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
              style={styles.fieldInput}
              value={value}
              onChangeText={set}
              placeholder={placeholder}
              placeholderTextColor="#d1d5db"
            />
          </View>
        ))}
      </View>
      <View style={styles.modalFooter}>
        <TouchableOpacity style={styles.btnPrimary} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>Save Changes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnGhost} onPress={onClose} activeOpacity={0.85}>
          <Text style={styles.btnGhostText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ModalWrapper>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────

function ChangePasswordModal({visible, onClose}: {visible: boolean; onClose: () => void}) {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [conf, setConf] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = () => {
    setErr('');
    if (!cur) return setErr('Enter your current password.');
    if (next.length < 8) return setErr('New password must be at least 8 characters.');
    if (next !== conf) return setErr('Passwords do not match.');
    setDone(true);
    setTimeout(() => {setCur(''); setNext(''); setConf(''); setDone(false); onClose();}, 1800);
  };

  return (
    <ModalWrapper visible={visible} onClose={onClose} title="Change Password">
      {done ? (
        <View style={styles.successBody}>
          <View style={styles.successIcon}>
            <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
              <Polyline points="20 6 9 17 4 12" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <Text style={styles.successTitle}>Password Updated</Text>
          <Text style={styles.successSub}>Your password has been changed successfully.</Text>
        </View>
      ) : (
        <View style={styles.modalBody}>
          {[
            {label: 'Current Password', value: cur, set: setCur},
            {label: 'New Password', value: next, set: setNext},
            {label: 'Confirm New Password', value: conf, set: setConf},
          ].map(({label, value, set}) => (
            <View key={label} style={styles.formField}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                style={styles.fieldInput}
                value={value}
                onChangeText={set}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#d1d5db"
              />
            </View>
          ))}
          {err ? <Text style={styles.errorText}>{err}</Text> : null}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>Update Password</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnGhost} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ModalWrapper>
  );
}

// ─── 2FA Modal ────────────────────────────────────────────────────────────────

function TwoFAModal({
  visible,
  enabled,
  onClose,
  onToggle,
}: {
  visible: boolean;
  enabled: boolean;
  onClose: () => void;
  onToggle: () => void;
}) {
  const [code, setCode] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [err, setErr] = useState('');

  const handleConfirm = () => {
    if (code.length < 6) return setErr('Enter the 6-digit code from your authenticator app.');
    setConfirmed(true);
    setTimeout(() => {onToggle(); setCode(''); setConfirmed(false); setErr(''); onClose();}, 1500);
  };

  return (
    <ModalWrapper visible={visible} onClose={onClose} title={`${enabled ? 'Disable' : 'Enable'} Two-Factor Auth`}>
      {confirmed ? (
        <View style={styles.successBody}>
          <View style={styles.successIcon}>
            <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
              <Polyline points="20 6 9 17 4 12" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <Text style={styles.successTitle}>2FA {enabled ? 'Disabled' : 'Enabled'}</Text>
        </View>
      ) : (
        <View style={styles.modalBody}>
          {!enabled ? (
            <View style={styles.qrBox}>
              <Text style={styles.qrText}>Scan with Google Authenticator or Authy</Text>
              <View style={styles.qrPlaceholder}>
                <Text style={styles.qrCode}>■■ ■ ■■{'\n'}■ ■■■ ■{'\n'}■■ ■ ■■</Text>
              </View>
              <Text style={styles.qrSecret}>Secret: JBSW Y3DP EHPK 3PXP</Text>
            </View>
          ) : (
            <Text style={styles.twoFaDesc}>Enter your current authenticator code to confirm disabling 2FA.</Text>
          )}
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Authenticator Code</Text>
            <TextInput
              style={[styles.fieldInput, styles.codeInput]}
              value={code}
              onChangeText={v => setCode(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor="#d1d5db"
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
          {err ? <Text style={styles.errorText}>{err}</Text> : null}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.btnPrimary, enabled && {backgroundColor: C.red}]}
              onPress={handleConfirm}
              activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>{enabled ? 'Disable 2FA' : 'Verify & Enable'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnGhost} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ModalWrapper>
  );
}

// ─── Active Sessions Modal ────────────────────────────────────────────────────

function ActiveSessionsModal({visible, onClose}: {visible: boolean; onClose: () => void}) {
  const [sessions, setSessions] = useState(MOCK_SESSIONS);

  const terminate = (id: string) => setSessions(s => s.filter(x => x.id !== id));
  const terminateAll = () => setSessions(s => s.filter(x => x.current));

  return (
    <ModalWrapper visible={visible} onClose={onClose} title="Active Sessions">
      <View style={styles.modalBody}>
        {sessions.map(s => (
          <View key={s.id} style={styles.sessionRow}>
            <View style={styles.sessionInfo}>
              <View style={styles.sessionNameRow}>
                <Text style={styles.sessionDevice}>{s.device}</Text>
                {s.current && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Current</Text>
                  </View>
                )}
              </View>
              <Text style={styles.sessionMeta}>{s.location} · {s.time}</Text>
            </View>
            {!s.current && (
              <TouchableOpacity style={styles.endBtn} onPress={() => terminate(s.id)} activeOpacity={0.8}>
                <Text style={styles.endBtnText}>End</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <View style={styles.modalFooter}>
          {sessions.filter(s => !s.current).length > 0 && (
            <TouchableOpacity style={styles.btnDanger} onPress={terminateAll} activeOpacity={0.85}>
              <Text style={styles.btnDangerText}>End All Other Sessions</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.btnGhost} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.btnGhostText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ModalWrapper>
  );
}

// ─── Login History Modal ──────────────────────────────────────────────────────

function LoginHistoryModal({visible, onClose}: {visible: boolean; onClose: () => void}) {
  return (
    <ModalWrapper visible={visible} onClose={onClose} title="Login History">
      <ScrollView style={styles.historyScroll}>
        {MOCK_HISTORY.map(h => (
          <View key={h.id} style={styles.historyRow}>
            <View style={[styles.historyDot, {backgroundColor: h.status === 'success' ? '#22c55e' : C.red}]} />
            <View style={styles.historyInfo}>
              <Text style={styles.historyDevice}>{h.device}</Text>
              <Text style={styles.historyMeta}>{h.location} · {h.time}</Text>
            </View>
            <View style={[styles.historyBadge, {backgroundColor: h.status === 'success' ? '#f0fdf4' : '#fef2f2'}]}>
              <Text style={[styles.historyBadgeText, {color: h.status === 'success' ? '#16a34a' : C.red}]}>
                {h.status === 'success' ? 'Success' : 'Failed'}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={[styles.modalFooter, {paddingHorizontal: 16, paddingBottom: 16}]}>
        <TouchableOpacity style={styles.btnGhost} onPress={onClose} activeOpacity={0.85}>
          <Text style={styles.btnGhostText}>Close</Text>
        </TouchableOpacity>
      </View>
    </ModalWrapper>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  visible,
  title,
  desc,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  desc: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [done, setDone] = useState(false);
  const handle = () => {setDone(true); setTimeout(() => {onConfirm(); setDone(false); onCancel();}, 1500);};

  return (
    <ModalWrapper visible={visible} onClose={onCancel} title={title}>
      {done ? (
        <View style={styles.successBody}>
          <View style={styles.successIcon}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Polyline points="20 6 9 17 4 12" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <Text style={styles.successTitle}>Done</Text>
        </View>
      ) : (
        <View style={styles.modalBody}>
          <Text style={styles.confirmDesc}>{desc}</Text>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.btnDanger} onPress={handle} activeOpacity={0.85}>
              <Text style={styles.btnDangerText}>{confirmLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnGhost} onPress={onCancel} activeOpacity={0.85}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ModalWrapper>
  );
}

// ─── Tab: General ─────────────────────────────────────────────────────────────

function GeneralTab() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [appToggles, setAppToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(APP_TOGGLES.map(t => [t.id, t.on])),
  );
  const [saved, setSaved] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const handleSave = () => {setSaved(true); setTimeout(() => setSaved(false), 2000);};

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <EditProfileModal
        visible={showEditProfile}
        profile={profile}
        onSave={p => setProfile(p)}
        onClose={() => setShowEditProfile(false)}
      />

      {/* Profile card */}
      <Card>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.profileNameRow}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>Super Admin</Text></View>
            </View>
            <Text style={styles.profileEmail}>{profile.email} · {profile.department}</Text>
            <Text style={styles.profileLastLogin}>Last login: Today at 09:14 AM</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.editProfileBtn} onPress={() => setShowEditProfile(true)} activeOpacity={0.8}>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={C.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={C.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={styles.editProfileBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </Card>

      {/* Preferences */}
      <Card>
        <SectionHead title="Preferences" subtitle="Regional and display settings" />
        {[
          {label: 'Language', value: prefs.language, options: ['English', 'Urdu', 'Arabic', 'French'], field: 'language' as keyof Preferences},
          {label: 'Temperature', value: prefs.tempUnit, options: ['°C', '°F', 'K'], field: 'tempUnit' as keyof Preferences},
        ].map(({label, value, options, field}) => (
          <View key={label} style={styles.prefRow}>
            <Text style={styles.prefLabel}>{label}</Text>
            <View style={styles.prefOptions}>
              {options.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.prefChip, value === opt && styles.prefChipActive]}
                  onPress={() => setPrefs(p => ({...p, [field]: opt}))}
                  activeOpacity={0.7}>
                  <Text style={[styles.prefChipText, value === opt && styles.prefChipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.saveBtnSaved]}
          onPress={handleSave}
          activeOpacity={0.85}>
          <Text style={[styles.saveBtnText, saved && styles.saveBtnTextSaved]}>
            {saved ? '✓ Saved' : 'Save Preferences'}
          </Text>
        </TouchableOpacity>
      </Card>

      {/* App toggles */}
      <Card>
        <SectionHead title="Application" subtitle="System behaviour and automation" />
        {APP_TOGGLES.map(t => (
          <RowItem key={t.id} label={t.label} desc={t.desc} accentColor={t.accentColor}>
            <Toggle enabled={appToggles[t.id] ?? t.on} onChange={() => setAppToggles(p => ({...p, [t.id]: !p[t.id]}))} />
          </RowItem>
        ))}
      </Card>

      <View style={styles.tabSpacer} />
    </ScrollView>
  );
}

// ─── Tab: Notifications ───────────────────────────────────────────────────────

function NotificationsTab() {
  const [channels, setChannels] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_CHANNELS.map(c => [c.id, c.on])),
  );
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_PREFS.map(p => [p.id, p.on])),
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {setSaved(true); setTimeout(() => setSaved(false), 2000);};

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Card>
        <SectionHead title="Notification Channels" subtitle="Choose how you receive alerts" />
        {NOTIF_CHANNELS.map(c => (
          <RowItem key={c.id} label={c.label} desc={c.desc} accentColor={c.accentColor}>
            <Toggle enabled={channels[c.id] ?? c.on} onChange={() => setChannels(p => ({...p, [c.id]: !p[c.id]}))} />
          </RowItem>
        ))}
      </Card>

      <Card>
        <SectionHead title="Alert Preferences" subtitle="Which severity levels trigger notifications" />
        {NOTIF_PREFS.map(p => (
          <RowItem key={p.id} label={p.label} desc={p.desc} accentColor={p.accentColor}>
            <Toggle enabled={prefs[p.id] ?? p.on} onChange={() => setPrefs(prev => ({...prev, [p.id]: !prev[p.id]}))} />
          </RowItem>
        ))}
      </Card>

      <TouchableOpacity
        style={[styles.saveBtn, styles.saveBtnMargin, saved && styles.saveBtnSaved]}
        onPress={handleSave}
        activeOpacity={0.85}>
        <Text style={[styles.saveBtnText, saved && styles.saveBtnTextSaved]}>
          {saved ? '✓ Saved' : 'Save Notification Settings'}
        </Text>
      </TouchableOpacity>

      <View style={styles.tabSpacer} />
    </ScrollView>
  );
}

// ─── Tab: Sensors ─────────────────────────────────────────────────────────────

function SensorsTab() {
  const [thresholds, setThresholds] = useState<SensorThreshold[]>(DEFAULT_THRESHOLDS);
  const [saved, setSaved] = useState(false);

  const adjust = useCallback((id: string, delta: number) => {
    setThresholds(prev =>
      prev.map(t => {
        if (t.id !== id) return t;
        const newVal = Math.min(t.max, Math.max(t.min, parseFloat((t.value + delta).toFixed(2))));
        return {...t, value: newVal};
      }),
    );
    setSaved(false);
  }, []);

  const toggleAlert = useCallback((id: string) => {
    setThresholds(prev => prev.map(t => t.id === id ? {...t, alertEnabled: !t.alertEnabled} : t));
  }, []);

  const handleSave = () => {setSaved(true); setTimeout(() => setSaved(false), 2000);};

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.sensorHeader}>
        <View>
          <Text style={styles.sensorHeaderTitle}>Sensors & Thresholds</Text>
          <Text style={styles.sensorHeaderSub}>Set alert trigger values for each sensor</Text>
        </View>
        <TouchableOpacity
          style={[styles.saveBtnSm, saved && styles.saveBtnSmSaved]}
          onPress={handleSave}
          activeOpacity={0.85}>
          <Text style={[styles.saveBtnSmText, saved && styles.saveBtnSmTextSaved]}>
            {saved ? '✓ Saved' : 'Save All'}
          </Text>
        </TouchableOpacity>
      </View>

      {thresholds.map(t => (
        <View key={t.id} style={[styles.sensorCard, {borderLeftColor: t.accentColor}]}>
          <View style={styles.sensorCardHeader}>
            <Text style={styles.sensorLabel}>{t.label}</Text>
            <Toggle enabled={t.alertEnabled} onChange={() => toggleAlert(t.id)} />
          </View>
          <View style={styles.sensorControls}>
            <Text style={styles.sensorTrigger}>Alert when &gt;</Text>
            <TouchableOpacity
              style={[styles.sensorBtn, !t.alertEnabled && styles.sensorBtnDisabled]}
              onPress={() => t.alertEnabled && adjust(t.id, -t.step)}
              activeOpacity={0.7}>
              <Text style={styles.sensorBtnText}>−</Text>
            </TouchableOpacity>
            <View style={[styles.sensorValueBox, !t.alertEnabled && styles.sensorValueBoxDisabled]}>
              <Text style={[styles.sensorValue, !t.alertEnabled && styles.sensorValueDisabled]}>
                {t.value}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.sensorBtn, !t.alertEnabled && styles.sensorBtnDisabled]}
              onPress={() => t.alertEnabled && adjust(t.id, t.step)}
              activeOpacity={0.7}>
              <Text style={styles.sensorBtnText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.sensorUnit}>{t.unit}</Text>
            <View style={[styles.sensorStatusBadge, {backgroundColor: t.alertEnabled ? `${t.accentColor}18` : '#f3f4f6'}]}>
              <Text style={[styles.sensorStatusText, {color: t.alertEnabled ? t.accentColor : '#9ca3af'}]}>
                {t.alertEnabled ? 'Active' : 'Muted'}
              </Text>
            </View>
          </View>
        </View>
      ))}

      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="12" r="10" stroke={C.blue} strokeWidth={2} />
              <Line x1="12" y1="16" x2="12" y2="12" stroke={C.blue} strokeWidth={2} strokeLinecap="round" />
              <Line x1="12" y1="8" x2="12.01" y2="8" stroke={C.blue} strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Thresholds apply globally</Text>
            <Text style={styles.infoDesc}>Changes saved here update alert thresholds across all warehouses.</Text>
          </View>
        </View>
      </Card>

      <View style={styles.tabSpacer} />
    </ScrollView>
  );
}

// ─── Tab: Security ────────────────────────────────────────────────────────────

function SecurityTab() {
  const [twoFa, setTwoFa] = useState(true);
  type SecurityModal = 'password' | '2fa' | 'sessions' | 'history' | 'revokeKeys' | 'signOutAll' | null;
  const [modal, setModal] = useState<SecurityModal>(null);

  const actions = [
    {label: 'Change Password', desc: 'Update your account password regularly for security', accentColor: C.primary, actionLabel: 'Change', key: 'password' as SecurityModal},
    {label: 'Two-Factor Auth', desc: 'Extra security layer via authenticator app', accentColor: '#22c55e', actionLabel: twoFa ? 'Disable' : 'Enable', key: '2fa' as SecurityModal, badge: twoFa ? 'Enabled' : null},
    {label: 'Active Sessions', desc: 'View and terminate active login sessions', accentColor: C.blue, actionLabel: 'Manage', key: 'sessions' as SecurityModal},
    {label: 'Login History', desc: 'Review recent sign-in activity', accentColor: C.amber, actionLabel: 'View', key: 'history' as SecurityModal},
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <ChangePasswordModal visible={modal === 'password'} onClose={() => setModal(null)} />
      <TwoFAModal visible={modal === '2fa'} enabled={twoFa} onClose={() => setModal(null)} onToggle={() => setTwoFa(v => !v)} />
      <ActiveSessionsModal visible={modal === 'sessions'} onClose={() => setModal(null)} />
      <LoginHistoryModal visible={modal === 'history'} onClose={() => setModal(null)} />
      <ConfirmDialog
        visible={modal === 'revokeKeys'}
        title="Revoke All API Keys"
        desc="All existing API keys will be permanently invalidated. Any integrations using them will stop working immediately."
        confirmLabel="Revoke All Keys"
        onConfirm={() => {}}
        onCancel={() => setModal(null)}
      />
      <ConfirmDialog
        visible={modal === 'signOutAll'}
        title="Sign Out All Devices"
        desc="You will be signed out from all browsers and devices, including this one. You'll need to log in again."
        confirmLabel="Sign Out All"
        onConfirm={() => {}}
        onCancel={() => setModal(null)}
      />

      <Card>
        <SectionHead title="Security Settings" subtitle="Manage password, authentication and sessions" />
        {actions.map(item => (
          <View key={item.label} style={styles.securityRow}>
            <View style={[styles.securityAccent, {backgroundColor: item.accentColor}]} />
            <View style={styles.securityContent}>
              <Text style={styles.securityLabel}>{item.label}</Text>
              <Text style={styles.securityDesc}>{item.desc}</Text>
            </View>
            {item.badge ? (
              <View style={styles.enabledBadge}><Text style={styles.enabledBadgeText}>{item.badge}</Text></View>
            ) : null}
            <TouchableOpacity
              style={[styles.actionBtn, item.label === 'Two-Factor Auth' && twoFa && styles.actionBtnDanger]}
              onPress={() => setModal(item.key)}
              activeOpacity={0.8}>
              <Text style={[styles.actionBtnText, item.label === 'Two-Factor Auth' && twoFa && styles.actionBtnTextDanger]}>
                {item.actionLabel}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </Card>

      {/* Danger zone */}
      <Card>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <Text style={styles.dangerDesc}>These actions are irreversible. Proceed with caution.</Text>
        <View style={styles.dangerBtns}>
          <TouchableOpacity style={styles.btnDanger} onPress={() => setModal('revokeKeys')} activeOpacity={0.85}>
            <Text style={styles.btnDangerText}>Revoke All API Keys</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnDanger} onPress={() => setModal('signOutAll')} activeOpacity={0.85}>
            <Text style={styles.btnDangerText}>Sign Out All Devices</Text>
          </TouchableOpacity>
        </View>
      </Card>

      <View style={styles.tabSpacer} />
    </ScrollView>
  );
}

// ─── Tab: Appearance ─────────────────────────────────────────────────────────

type ThemeChoice = 'light' | 'dark' | 'system';

const THEME_OPTIONS: {id: ThemeChoice; label: string}[] = [
  {id: 'light', label: 'Light'},
  {id: 'dark', label: 'Dark'},
  {id: 'system', label: 'System'},
];

function AppearanceTab() {
  const [theme, setTheme] = useState<ThemeChoice>('light');
  const [compactTables, setCompactTables] = useState(true);
  const [showWarehouseIds, setShowWarehouseIds] = useState(false);
  const [density, setDensity] = useState('Normal');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {setSaved(true); setTimeout(() => setSaved(false), 2000);};

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Card>
        <SectionHead title="Theme" subtitle="Choose your preferred appearance mode" />
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.themeChip, theme === t.id && styles.themeChipActive]}
              onPress={() => setTheme(t.id)}
              activeOpacity={0.75}>
              <Text style={[styles.themeChipText, theme === t.id && styles.themeChipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.themeNote}>
          {theme === 'system' ? 'Automatically matches your device dark/light mode.'
            : theme === 'dark' ? 'Dark mode — reduces eye strain in low-light environments.'
            : 'Light mode — optimized for bright environments.'}
        </Text>
      </Card>

      <Card>
        <SectionHead title="Display" subtitle="Layout and density preferences" />
        <RowItem label="Compact data tables" desc="Use smaller row heights in tables" accentColor={C.primary}>
          <Toggle enabled={compactTables} onChange={() => setCompactTables(v => !v)} />
        </RowItem>
        <RowItem label="Show warehouse IDs" desc="Display WH-A style IDs alongside names" accentColor={C.blue}>
          <Toggle enabled={showWarehouseIds} onChange={() => setShowWarehouseIds(v => !v)} />
        </RowItem>
        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>Data density</Text>
          <View style={styles.prefOptions}>
            {['Compact', 'Normal', 'Comfortable'].map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.prefChip, density === opt && styles.prefChipActive]}
                onPress={() => setDensity(opt)}
                activeOpacity={0.7}>
                <Text style={[styles.prefChipText, density === opt && styles.prefChipTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.saveBtnSaved]}
          onPress={handleSave}
          activeOpacity={0.85}>
          <Text style={[styles.saveBtnText, saved && styles.saveBtnTextSaved]}>
            {saved ? '✓ Saved' : 'Save Display Settings'}
          </Text>
        </TouchableOpacity>
      </Card>

      <View style={styles.tabSpacer} />
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const TABS: {key: Tab; label: string}[] = [
  {key: 'general', label: 'General'},
  {key: 'notifications', label: 'Alerts'},
  {key: 'sensors', label: 'Sensors'},
  {key: 'security', label: 'Security'},
  {key: 'appearance', label: 'Appearance'},
];

export default function SettingsScreen() {
  const [tab, setTab] = useState<Tab>('general');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Account, notifications, sensors & appearance</Text>
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.75}>
            <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab content */}
      <View style={styles.tabContent}>
        {tab === 'general' && <GeneralTab />}
        {tab === 'notifications' && <NotificationsTab />}
        {tab === 'sensors' && <SensorsTab />}
        {tab === 'security' && <SecurityTab />}
        {tab === 'appearance' && <AppearanceTab />}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: C.bg},
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {fontSize: 18, fontWeight: fontWeight.bold, color: C.textPrimary, letterSpacing: -0.3},
  headerSubtitle: {fontSize: 12, color: C.textSecondary, marginTop: 1},

  // Tab bar
  tabBar: {backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', maxHeight: 46, flexShrink: 0},
  tabBarContent: {paddingHorizontal: 12, gap: 4, alignItems: 'center', paddingVertical: 7},
  tabBtn: {paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20},
  tabBtnActive: {backgroundColor: C.primary},
  tabBtnText: {fontSize: 12, fontWeight: fontWeight.semibold, color: C.textSecondary},
  tabBtnTextActive: {color: C.white},

  tabContent: {flex: 1},

  // Card
  card: {
    marginHorizontal: 14,
    marginTop: 14,
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 6,
  },

  // Section head
  sectionHead: {marginBottom: 12},
  sectionTitle: {fontSize: 14, fontWeight: fontWeight.bold, color: C.textPrimary},
  sectionSubtitle: {fontSize: 11, color: C.textMuted, marginTop: 2},

  // Toggle
  toggle: {width: 36, height: 20, borderRadius: 10, padding: 2, justifyContent: 'center'},
  toggleOn: {backgroundColor: C.primary},
  toggleOff: {backgroundColor: '#d1d5db'},
  toggleThumb: {width: 16, height: 16, borderRadius: 8, backgroundColor: C.white, elevation: 2, shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: {width: 0, height: 1}, shadowRadius: 2},
  toggleThumbOn: {alignSelf: 'flex-end'},
  toggleThumbOff: {alignSelf: 'flex-start'},

  // Row item
  rowItem: {flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f8fafc', gap: 12},
  rowAccent: {width: 4, height: 36, borderRadius: 2, flexShrink: 0},
  rowContent: {flex: 1},
  rowLabel: {fontSize: 12.5, fontWeight: fontWeight.semibold, color: C.textPrimary},
  rowDesc: {fontSize: 10.5, color: C.textMuted, marginTop: 2},

  // Profile
  profileRow: {flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14},
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: {fontSize: 20, fontWeight: fontWeight.bold, color: C.white},
  profileInfo: {flex: 1},
  profileNameRow: {flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap'},
  profileName: {fontSize: 15, fontWeight: fontWeight.bold, color: C.textPrimary},
  adminBadge: {backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: '#bbf7d0'},
  adminBadgeText: {fontSize: 9, fontWeight: fontWeight.bold, color: C.primary},
  profileEmail: {fontSize: 11, color: C.textMuted, marginTop: 3},
  profileLastLogin: {fontSize: 10, color: '#d1d5db', marginTop: 2},
  editProfileBtn: {flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start'},
  editProfileBtnText: {fontSize: 12, fontWeight: fontWeight.semibold, color: C.primary},

  // Avatar (modal)
  avatarLg: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarLgText: {fontSize: 26, fontWeight: fontWeight.bold, color: C.white},
  avatarCenter: {alignItems: 'center', marginBottom: 16},

  // Prefs
  prefRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc', flexWrap: 'wrap', gap: 8},
  prefLabel: {fontSize: 12, fontWeight: fontWeight.semibold, color: C.textSecondary},
  prefOptions: {flexDirection: 'row', gap: 6, flexWrap: 'wrap'},
  prefChip: {paddingHorizontal: 11, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: C.bgMuted},
  prefChipActive: {backgroundColor: C.primary, borderColor: C.primary},
  prefChipText: {fontSize: 11, fontWeight: fontWeight.semibold, color: C.textSecondary},
  prefChipTextActive: {color: C.white},

  // Save buttons
  saveBtn: {marginTop: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center'},
  saveBtnSaved: {backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0'},
  saveBtnText: {fontSize: 12.5, fontWeight: fontWeight.semibold, color: C.white},
  saveBtnTextSaved: {color: '#16a34a'},
  saveBtnMargin: {marginHorizontal: 14, marginTop: 14},
  saveBtnSm: {paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: C.primary},
  saveBtnSmSaved: {backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0'},
  saveBtnSmText: {fontSize: 11, fontWeight: fontWeight.semibold, color: C.white},
  saveBtnSmTextSaved: {color: '#16a34a'},

  // Modal
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20},
  modalBox: {backgroundColor: C.white, borderRadius: 20, width: '100%', maxWidth: 400, overflow: 'hidden', elevation: 24, shadowColor: '#000', shadowOpacity: 0.25, shadowOffset: {width: 0, height: 8}, shadowRadius: 20},
  modalHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9'},
  modalTitle: {fontSize: 14, fontWeight: fontWeight.bold, color: C.textPrimary},
  modalClose: {width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#f8fafc'},
  modalBody: {padding: 16, gap: 12},
  modalFooter: {flexDirection: 'row', gap: 10, marginTop: 4},
  formField: {gap: 6},
  fieldLabel: {fontSize: 11, fontWeight: fontWeight.semibold, color: C.textSecondary},
  fieldInput: {height: 38, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: C.bgMuted, fontSize: 13, color: C.textPrimary},
  codeInput: {textAlign: 'center', fontSize: 16, fontWeight: fontWeight.bold, letterSpacing: 6},
  errorText: {fontSize: 11, fontWeight: fontWeight.semibold, color: C.red},
  confirmDesc: {fontSize: 12, color: C.textSecondary, lineHeight: 17},

  // Buttons
  btnPrimary: {flex: 1, paddingVertical: 9, borderRadius: 11, backgroundColor: C.primary, alignItems: 'center'},
  btnPrimaryText: {fontSize: 12, fontWeight: fontWeight.semibold, color: C.white},
  btnGhost: {paddingHorizontal: 16, paddingVertical: 9, borderRadius: 11, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center'},
  btnGhostText: {fontSize: 12, fontWeight: fontWeight.semibold, color: C.textSecondary},
  btnDanger: {flex: 1, paddingVertical: 8, borderRadius: 11, borderWidth: 1, borderColor: '#fecaca', alignItems: 'center'},
  btnDangerText: {fontSize: 12, fontWeight: fontWeight.semibold, color: C.red},

  // Success
  successBody: {padding: 32, alignItems: 'center', gap: 10},
  successIcon: {width: 56, height: 56, borderRadius: 28, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'center', justifyContent: 'center'},
  successTitle: {fontSize: 14, fontWeight: fontWeight.bold, color: C.textPrimary},
  successSub: {fontSize: 11, color: C.textMuted, textAlign: 'center'},

  // Sessions
  sessionRow: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: C.bgMuted, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)', marginBottom: 8},
  sessionInfo: {flex: 1},
  sessionNameRow: {flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap'},
  sessionDevice: {fontSize: 12, fontWeight: fontWeight.semibold, color: C.textPrimary},
  sessionMeta: {fontSize: 10, color: C.textMuted, marginTop: 2},
  currentBadge: {backgroundColor: '#f0fdf4', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: '#bbf7d0'},
  currentBadgeText: {fontSize: 9, fontWeight: fontWeight.bold, color: '#16a34a'},
  endBtn: {paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#fecaca'},
  endBtnText: {fontSize: 11, fontWeight: fontWeight.semibold, color: C.red},

  // History
  historyScroll: {maxHeight: 280, paddingHorizontal: 16, paddingTop: 8},
  historyRow: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: C.bgMuted, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)'},
  historyDot: {width: 8, height: 8, borderRadius: 4, flexShrink: 0},
  historyInfo: {flex: 1},
  historyDevice: {fontSize: 11, fontWeight: fontWeight.semibold, color: C.textPrimary},
  historyMeta: {fontSize: 10, color: C.textMuted, marginTop: 1},
  historyBadge: {paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999},
  historyBadgeText: {fontSize: 9, fontWeight: fontWeight.bold},

  // 2FA
  qrBox: {alignItems: 'center', gap: 8},
  qrText: {fontSize: 11, color: C.textSecondary, textAlign: 'center'},
  qrPlaceholder: {width: 120, height: 120, backgroundColor: '#111827', borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  qrCode: {color: C.white, fontSize: 22, lineHeight: 30, textAlign: 'center'},
  qrSecret: {fontSize: 10, color: C.textMuted, fontFamily: 'monospace'},
  twoFaDesc: {fontSize: 11, color: C.textSecondary, lineHeight: 16},

  // Sensor
  sensorHeader: {flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4},
  sensorHeaderTitle: {fontSize: 15, fontWeight: fontWeight.bold, color: C.textPrimary},
  sensorHeaderSub: {fontSize: 11, color: C.textMuted, marginTop: 2},
  sensorCard: {
    marginHorizontal: 14,
    marginTop: 10,
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: {width: 0, height: 1},
    shadowRadius: 4,
  },
  sensorCardHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10},
  sensorLabel: {fontSize: 13, fontWeight: fontWeight.bold, color: C.textPrimary},
  sensorControls: {flexDirection: 'row', alignItems: 'center', gap: 6},
  sensorTrigger: {fontSize: 10.5, color: C.textMuted, marginRight: 4},
  sensorBtn: {width: 30, height: 30, borderRadius: 8, backgroundColor: C.bgMuted, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center'},
  sensorBtnDisabled: {opacity: 0.4},
  sensorBtnText: {fontSize: 18, color: C.textPrimary, lineHeight: 22},
  sensorValueBox: {minWidth: 52, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: C.bgMuted, alignItems: 'center'},
  sensorValueBoxDisabled: {opacity: 0.4},
  sensorValue: {fontSize: 14, fontWeight: fontWeight.bold, color: C.textPrimary, textAlign: 'center'},
  sensorValueDisabled: {color: '#d1d5db'},
  sensorUnit: {fontSize: 11, fontWeight: fontWeight.semibold, color: C.textSecondary},
  sensorStatusBadge: {marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999},
  sensorStatusText: {fontSize: 10, fontWeight: fontWeight.bold},

  // Info card
  infoCard: {marginTop: 10},
  infoRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 10},
  infoIcon: {width: 28, height: 28, borderRadius: 8, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center'},
  infoContent: {flex: 1},
  infoTitle: {fontSize: 11.5, fontWeight: fontWeight.semibold, color: C.textPrimary},
  infoDesc: {fontSize: 10.5, color: C.textMuted, marginTop: 2, lineHeight: 15},

  // Security
  securityRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc', gap: 12},
  securityAccent: {width: 4, height: 36, borderRadius: 2, flexShrink: 0},
  securityContent: {flex: 1},
  securityLabel: {fontSize: 12.5, fontWeight: fontWeight.semibold, color: C.textPrimary},
  securityDesc: {fontSize: 10.5, color: C.textMuted, marginTop: 2},
  enabledBadge: {backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: '#bbf7d0'},
  enabledBadgeText: {fontSize: 9.5, fontWeight: fontWeight.bold, color: '#16a34a'},
  actionBtn: {paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb'},
  actionBtnDanger: {borderColor: '#fecaca'},
  actionBtnText: {fontSize: 11, fontWeight: fontWeight.semibold, color: C.textSecondary},
  actionBtnTextDanger: {color: C.red},
  dangerTitle: {fontSize: 13, fontWeight: fontWeight.bold, color: C.red, marginBottom: 4},
  dangerDesc: {fontSize: 11, color: C.textMuted, marginBottom: 14},
  dangerBtns: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},

  // Appearance
  themeRow: {flexDirection: 'row', gap: 8, marginBottom: 10},
  themeChip: {flex: 1, paddingVertical: 9, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center'},
  themeChipActive: {backgroundColor: C.primary},
  themeChipText: {fontSize: 12, fontWeight: fontWeight.semibold, color: C.textSecondary},
  themeChipTextActive: {color: C.white},
  themeNote: {fontSize: 10.5, color: C.textMuted, lineHeight: 15},

  tabSpacer: {height: 20},
});
