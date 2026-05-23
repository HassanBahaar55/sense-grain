'use client';

import {
  createContext, useContext, useState, useEffect,
  type ReactNode,
} from 'react';
import { liveEngine, type LiveSensorReading, type LiveAlert } from '@/lib/liveEngine';
import { subscribeToReadings, subscribeToAlerts } from '@/lib/firestoreService';
import { setLiveOverride } from '@/lib/dataEngine';
import { seedFirestoreIfEmpty } from '@/lib/firestoreSeeder';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveDataContextValue {
  readings:   Record<string, LiveSensorReading>;
  liveAlerts: LiveAlert[];
  tick:       number;
  isRunning:  boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const LiveDataContext = createContext<LiveDataContextValue>({
  readings: {}, liveAlerts: [], tick: 0, isRunning: false,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const [readings,   setReadings]   = useState<Record<string, LiveSensorReading>>({});
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [tick,       setTick]       = useState(0);
  const [isRunning,  setIsRunning]  = useState(false);

  useEffect(() => {
    // 1. Start simulation — UI ticks every 30s, Firestore sync every 60s
    liveEngine.start(10000, 60000);
    setIsRunning(true);

    // Seed Firestore on first login (no-op if already seeded)
    seedFirestoreIfEmpty().catch(() => {});

    // 2. Also drive local UI from simulation directly (smooth, instant updates)
    const unsubLocal = liveEngine.subscribe((newReadings, newAlerts, newTick) => {
      setReadings({ ...newReadings });
      setLiveAlerts([...newAlerts]);
      setTick(newTick);
      setLiveOverride(newReadings);
    });

    // 3. Subscribe to Firestore — mobile app writes here too; keeps all platforms synced
    //    If Firestore has newer data (e.g. from another device), it overrides local state
    const unsubFirestoreReadings = subscribeToReadings((firestoreReadings) => {
      if (Object.keys(firestoreReadings).length > 0) {
        setReadings(firestoreReadings);
        setTick(t => t + 1);
        setLiveOverride(firestoreReadings);
      }
    });

    const unsubFirestoreAlerts = subscribeToAlerts((firestoreAlerts) => {
      if (firestoreAlerts.length > 0) {
        setLiveAlerts(firestoreAlerts);
      }
    });

    return () => {
      unsubLocal();
      unsubFirestoreReadings();
      unsubFirestoreAlerts();
      liveEngine.stop();
      setIsRunning(false);
    };
  }, []);

  return (
    <LiveDataContext.Provider value={{ readings, liveAlerts, tick, isRunning }}>
      {children}
    </LiveDataContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLiveData(): LiveDataContextValue {
  return useContext(LiveDataContext);
}

/** Returns live reading for a specific warehouse, or null if not yet available */
export function useLiveWarehouse(warehouseId: string): LiveSensorReading | null {
  const { readings } = useLiveData();
  return readings[warehouseId] ?? null;
}

/** Returns only unresolved live alerts */
export function useActiveAlerts(): LiveAlert[] {
  const { liveAlerts } = useLiveData();
  return liveAlerts.filter(a => !a.resolved);
}
