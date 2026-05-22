'use client';

import {
  createContext, useContext, useState, useEffect,
  type ReactNode,
} from 'react';
import { liveEngine, type LiveSensorReading, type LiveAlert } from '@/lib/liveEngine';
import { setLiveOverride } from '@/lib/dataEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveDataContextValue {
  readings:    Record<string, LiveSensorReading>;
  liveAlerts:  LiveAlert[];
  tick:        number;
  isRunning:   boolean;
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
    // Start engine
    liveEngine.start(7000);
    setIsRunning(true);

    // Subscribe to updates
    const unsub = liveEngine.subscribe((newReadings, newAlerts, newTick) => {
      setReadings({ ...newReadings });
      setLiveAlerts([...newAlerts]);
      setTick(newTick);
      // Also push into dataEngine so all existing hooks get live values
      setLiveOverride(newReadings);
    });

    return () => {
      unsub();
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

// ─── Hook ─────────────────────────────────────────────────────────────────────

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
