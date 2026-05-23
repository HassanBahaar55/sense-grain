'use client';

import {
  createContext, useContext, useState, useEffect,
  type ReactNode,
} from 'react';
import { liveEngine, type LiveSensorReading, type LiveAlert } from '@/lib/liveEngine';
import { subscribeToReadings, subscribeToAlerts } from '@/lib/firestoreService';
import { setLiveOverride } from '@/lib/dataEngine';
import { seedFirestoreIfEmpty, cleanupOldAlerts } from '@/lib/firestoreSeeder';

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
    // 1. Start simulation — UI ticks every 10s, Firestore sync every 2 min
    liveEngine.start(10000, 120000);
    setIsRunning(true);

    // Seed Firestore on first login (no-op if already seeded)
    seedFirestoreIfEmpty().catch(() => {});
    // Delete alertHistory + resolved alerts older than 7 days
    cleanupOldAlerts().catch(() => {});

    // Track whether we have pre-loaded Firestore alerts into the engine
    let alertsBootstrapped = false;

    // 2. Drive local UI from simulation directly (smooth, instant updates)
    //    During the warmup window (first 4 ticks / ~40s), don't let the engine
    //    overwrite alerts with an empty array — Firestore alerts are authoritative
    //    until the engine has had time to evaluate its own threshold checks.
    const unsubLocal = liveEngine.subscribe((newReadings, newAlerts, newTick) => {
      setReadings({ ...newReadings });
      setLiveAlerts(prev => {
        // Before Firestore has responded, NEVER let the engine overwrite UI alerts.
        // Engine tick 1 is skipped, but ticks 2-5 could still arrive before Firestore
        // if network is slow — keep prev (Firestore state) until bootstrap is confirmed.
        if (!alertsBootstrapped) return prev;
        return [...newAlerts];
      });
      setTick(newTick);
      setLiveOverride(newReadings);
    });

    // 3. Subscribe to Firestore — mobile app writes here too; keeps all platforms synced
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
        // Pre-populate engine once so it can properly dedup + resolve them
        if (!alertsBootstrapped) {
          liveEngine.loadPersistedAlerts(firestoreAlerts as import('@/lib/liveEngine').LiveAlert[]);
          alertsBootstrapped = true;
        }
      } else {
        alertsBootstrapped = true; // No Firestore alerts — engine is authoritative
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
