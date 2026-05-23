'use client';

import {
  createContext, useContext, useState, useEffect,
  type ReactNode,
} from 'react';
import { liveEngine, type LiveSensorReading, type LiveAlert } from '@/lib/liveEngine';
import { subscribeToReadings, subscribeToAlerts } from '@/lib/firestoreService';
import { setLiveOverride } from '@/lib/dataEngine';
import { seedUserData } from '@/lib/firestoreSeeder';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveDataContextValue {
  readings:   Record<string, LiveSensorReading>;
  liveAlerts: LiveAlert[];
  tick:       number;
  isRunning:  boolean;
  uid:        string | null;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const LiveDataContext = createContext<LiveDataContextValue>({
  readings: {}, liveAlerts: [], tick: 0, isRunning: false, uid: null,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid      = user?.uid ?? null;

  const [readings,   setReadings]   = useState<Record<string, LiveSensorReading>>({});
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [tick,       setTick]       = useState(0);
  const [isRunning,  setIsRunning]  = useState(false);

  useEffect(() => {
    if (!uid) return;

    // Tell the engine which user is logged in — all Firestore writes go to /accounts/{uid}/
    liveEngine.setUid(uid);
    liveEngine.start(10000, 120000);
    setIsRunning(true);

    // Seed this user's data on first login (no-op if already seeded)
    seedUserData(uid, user?.email ?? '').catch(() => {});

    let alertsBootstrapped   = false;
    let readingsBootstrapped = false;

    // Drive local UI from simulation (fast, 10s refresh)
    const unsubLocal = liveEngine.subscribe((newReadings, newAlerts, newTick) => {
      setReadings({ ...newReadings });
      setLiveAlerts(prev => {
        if (!alertsBootstrapped) return prev;
        return [...newAlerts];
      });
      setTick(newTick);
      setLiveOverride(newReadings);
    });

    // Subscribe to Firestore per-user collections — survives page refresh
    const unsubReadings = subscribeToReadings(uid, (firestoreReadings) => {
      if (Object.keys(firestoreReadings).length > 0) {
        setReadings(firestoreReadings);
        setTick(t => t + 1);
        setLiveOverride(firestoreReadings);
        if (!readingsBootstrapped) {
          liveEngine.loadPersistedReadings(
            firestoreReadings as Record<string, LiveSensorReading>,
          );
          readingsBootstrapped = true;
        }
      }
    });

    const unsubAlerts = subscribeToAlerts(uid, (firestoreAlerts) => {
      if (firestoreAlerts.length > 0) {
        setLiveAlerts(firestoreAlerts);
        if (!alertsBootstrapped) {
          liveEngine.loadPersistedAlerts(firestoreAlerts as LiveAlert[]);
          alertsBootstrapped = true;
        }
      } else {
        alertsBootstrapped = true;
      }
    });

    return () => {
      unsubLocal();
      unsubReadings();
      unsubAlerts();
      liveEngine.stop();
      liveEngine.setUid(null);
      setIsRunning(false);
    };
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <LiveDataContext.Provider value={{ readings, liveAlerts, tick, isRunning, uid }}>
      {children}
    </LiveDataContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLiveData(): LiveDataContextValue {
  return useContext(LiveDataContext);
}

export function useLiveWarehouse(warehouseId: string): LiveSensorReading | null {
  const { readings } = useLiveData();
  return readings[warehouseId] ?? null;
}

export function useActiveAlerts(): LiveAlert[] {
  const { liveAlerts } = useLiveData();
  return liveAlerts.filter(a => !a.resolved);
}
