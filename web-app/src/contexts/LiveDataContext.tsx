'use client';

/**
 * LiveDataContext.
 *
 * Cloud Functions write per-sensor readings to `accounts/{uid}/sensorReadings`
 * every minute, and a computed warehouse-level cache to `accounts/{uid}/warehouseReadings`.
 * The UI subscribes to the computed cache for real-time dashboard data.
 * The client-side liveEngine is permanently disabled.
 */

import {
  createContext, useContext, useState, useEffect,
  type ReactNode,
} from 'react';
import { onSnapshot, collection, query, where, getFirestore } from 'firebase/firestore';
import firebaseApp from '@/config/firebase';
import { col } from '@/lib/accountDb';
import type { LiveSensorReading, LiveAlert } from '@/lib/liveEngine';
import { subscribeToReadings, subscribeToAlerts } from '@/lib/firestoreService';
import { setLiveOverride } from '@/lib/dataEngine';
import { seedUserData } from '@/lib/firestoreSeeder';
import { useAuth } from '@/contexts/AuthContext';

const db = getFirestore(firebaseApp);

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
    if (!uid) { setReadings({}); setLiveAlerts([]); return; }

    setIsRunning(true);

    // Seed user data on first login (no-op for already-seeded accounts)
    seedUserData(uid, user?.email ?? '').catch(() => {});

    // Track which warehouse doc IDs have at least one active sensor
    // so we never display stale readings from warehouses with no active hardware.
    let activeSensorWhIds = new Set<string>();

    const unsubSensors = onSnapshot(
      query(collection(db, col.sensors(uid)), where('status', '==', 'active')),
      (snap) => {
        activeSensorWhIds = new Set(snap.docs.map(d => d.data().warehouseId as string));
      },
    );

    const unsubReadings = subscribeToReadings(uid, (firestoreReadings) => {
      // Only surface readings for warehouses that have at least one active sensor
      const filtered = activeSensorWhIds.size > 0
        ? Object.fromEntries(
            Object.entries(firestoreReadings).filter(([whId]) => activeSensorWhIds.has(whId)),
          )
        : {};
      setReadings(filtered);
      setTick(t => t + 1);
      setLiveOverride(filtered);
    });

    const unsubAlerts = subscribeToAlerts(uid, (firestoreAlerts) => {
      setLiveAlerts(firestoreAlerts);
    });

    return () => {
      unsubSensors();
      unsubReadings();
      unsubAlerts();
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
