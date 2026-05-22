'use client';

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type NotifType = 'critical' | 'warning' | 'resolved' | 'system' | 'prediction';

export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  time: Date;
  read: boolean;
  warehouse?: string;
}

interface State {
  selectedDate: Date;
  isLive: boolean;
  liveTick: number;
  notifications: AppNotification[];
}

type Action =
  | { type: 'SET_DATE'; date: Date }
  | { type: 'TOGGLE_LIVE' }
  | { type: 'TICK' }
  | { type: 'MARK_READ'; id: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'CLEAR'; id: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'ADD'; notification: AppNotification };

// ─── Seed data ──────────────────────────────────────────────────────────────

const SEED: AppNotification[] = [
  {
    id: 'n1',
    type: 'critical',
    title: 'Critical Temperature Alert',
    message: 'Warehouse A – Bay 3 temperature exceeded 32°C threshold.',
    time: new Date(Date.now() - 4 * 60_000),
    read: false,
    warehouse: 'WH-A',
  },
  {
    id: 'n2',
    type: 'warning',
    title: 'High Humidity Warning',
    message: 'Warehouse B – Humidity at 71%, above safe limit of 70%.',
    time: new Date(Date.now() - 18 * 60_000),
    read: false,
    warehouse: 'WH-B',
  },
  {
    id: 'n3',
    type: 'prediction',
    title: 'Spoilage Risk Forecast',
    message: 'Warehouse C grain batch at 68% spoilage risk in next 14 days.',
    time: new Date(Date.now() - 45 * 60_000),
    read: false,
    warehouse: 'WH-C',
  },
  {
    id: 'n4',
    type: 'resolved',
    title: 'Alert Resolved',
    message: 'Warehouse D moisture levels returned to normal range.',
    time: new Date(Date.now() - 2 * 3600_000),
    read: true,
    warehouse: 'WH-D',
  },
  {
    id: 'n5',
    type: 'system',
    title: 'System Update Complete',
    message: 'Sensor firmware v2.4.1 deployed to all 24 monitoring points.',
    time: new Date(Date.now() - 5 * 3600_000),
    read: true,
  },
];

const LIVE_POOL: Omit<AppNotification, 'id' | 'time' | 'read'>[] = [
  { type: 'warning', title: 'CO₂ Level Rising', message: 'Warehouse A – CO₂ at 1,850 ppm, approaching warning threshold.', warehouse: 'WH-A' },
  { type: 'critical', title: 'Sensor Offline', message: 'Warehouse B – Sensor S3 stopped reporting. Check connection.', warehouse: 'WH-B' },
  { type: 'resolved', title: 'Temperature Normalized', message: 'Warehouse C – Temperature back within safe range (24.8°C).', warehouse: 'WH-C' },
  { type: 'prediction', title: 'Optimal Aeration Window', message: 'Ideal aeration conditions predicted for next 6 hours.', warehouse: 'WH-A' },
];

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_DATE':      return { ...state, selectedDate: action.date };
    case 'TOGGLE_LIVE':   return { ...state, isLive: !state.isLive };
    case 'TICK':          return { ...state, liveTick: state.liveTick + 1 };
    case 'MARK_READ':     return { ...state, notifications: state.notifications.map(n => n.id === action.id ? { ...n, read: true } : n) };
    case 'MARK_ALL_READ': return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) };
    case 'CLEAR':         return { ...state, notifications: state.notifications.filter(n => n.id !== action.id) };
    case 'CLEAR_ALL':     return { ...state, notifications: [] };
    case 'ADD':           return { ...state, notifications: [action.notification, ...state.notifications].slice(0, 20) };
    default:              return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface HeaderCtx {
  selectedDate: Date;
  isLive: boolean;
  liveTick: number;
  notifications: AppNotification[];
  unreadCount: number;
  setDate: (d: Date) => void;
  toggleLive: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
}

const Ctx = createContext<HeaderCtx>({
  selectedDate: new Date(),
  isLive: true,
  liveTick: 0,
  notifications: [],
  unreadCount: 0,
  setDate: () => {},
  toggleLive: () => {},
  markRead: () => {},
  markAllRead: () => {},
  clearNotification: () => {},
  clearAll: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    selectedDate: new Date(),
    isLive: true,
    liveTick: 0,
    notifications: SEED,
  });

  const poolIdx = useRef(0);

  // Realtime tick every 5 s while Live is on
  useEffect(() => {
    if (!state.isLive) return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), 5000);
    return () => clearInterval(id);
  }, [state.isLive]);

  // Inject a new notification every 30 s while Live is on
  useEffect(() => {
    if (!state.isLive) return;
    const id = setInterval(() => {
      const item = LIVE_POOL[poolIdx.current % LIVE_POOL.length];
      poolIdx.current++;
      dispatch({
        type: 'ADD',
        notification: { ...item, id: `live-${Date.now()}`, time: new Date(), read: false },
      });
    }, 30_000);
    return () => clearInterval(id);
  }, [state.isLive]);

  const setDate            = useCallback((d: Date)    => dispatch({ type: 'SET_DATE', date: d }), []);
  const toggleLive         = useCallback(()           => dispatch({ type: 'TOGGLE_LIVE' }), []);
  const markRead           = useCallback((id: string) => dispatch({ type: 'MARK_READ', id }), []);
  const markAllRead        = useCallback(()           => dispatch({ type: 'MARK_ALL_READ' }), []);
  const clearNotification  = useCallback((id: string) => dispatch({ type: 'CLEAR', id }), []);
  const clearAll           = useCallback(()           => dispatch({ type: 'CLEAR_ALL' }), []);

  return (
    <Ctx.Provider value={{
      selectedDate: state.selectedDate,
      isLive: state.isLive,
      liveTick: state.liveTick,
      notifications: state.notifications,
      unreadCount: state.notifications.filter(n => !n.read).length,
      setDate,
      toggleLive,
      markRead,
      markAllRead,
      clearNotification,
      clearAll,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useHeader = () => useContext(Ctx);
