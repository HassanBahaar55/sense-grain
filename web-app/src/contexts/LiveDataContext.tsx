'use client';

import {
  createContext, useContext, useState, useEffect,
  type ReactNode,
} from 'react';
import { subscribeToReadings, subscribeToAlerts } from '@/lib/firestoreService';
import { setLiveOverride } from '@/lib/dataEngine';
import type { LiveSensorReading, LiveAlert } from '@/lib/liveEngine';

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
    setIsRunning(true);

    // Subscribe to Firestore — data now comes from the Cloud Function,
    // so web and mobile stay perfectly in sync with the same source of truth
    const unsubReadings = subscribeToReadings((newReadings) => {
      setReadings(newReadings);
      setTick(t => t + 1);
      // Push into dataEngine so all existing hooks get live values
      setLiveOverride(newReadings);
    });

    const unsubAlerts = subscribeToAlerts((newAlerts) => {
      setLiveAlerts(newAlerts);
    });

    return () => {
      unsubReadings();
      unsubAlerts();
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
