'use client';

/**
 * LiveDataContext.
 *
 * Target architecture: Cloud Function `simulateSensorData` writes readings
 * every minute to `accounts/{uid}/warehouseReadings`. The UI listens via
 * onSnapshot. This is what runs in production once the Firebase project is
 * on the Blaze plan and `firebase deploy --only functions` succeeds.
 *
 * Fallback (current default): the browser-side LiveEngine ticks locally and
 * mirrors readings to Firestore so users still see live data. When the
 * Cloud Function is deployed, set NEXT_PUBLIC_DISABLE_CLIENT_ENGINE=1 in
 * Vercel and redeploy — the engine stops and Firestore becomes the source
 * of truth.
 */

import {
  createContext, useContext, useState, useEffect, useRef,
  type ReactNode,
} from 'react';
import { liveEngine, DEFAULT_WH_CONFIGS, type LiveSensorReading, type LiveAlert } from '@/lib/liveEngine';
import { subscribeToWarehouses, subscribeToReadings, subscribeToAlerts } from '@/lib/firestoreService';
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

const CLIENT_ENGINE_DISABLED = process.env.NEXT_PUBLIC_DISABLE_CLIENT_ENGINE === '1';

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid      = user?.uid ?? null;

  const [readings,   setReadings]   = useState<Record<string, LiveSensorReading>>({});
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [tick,       setTick]       = useState(0);
  const [isRunning,  setIsRunning]  = useState(false);

  // True after the first Firestore readings snapshot arrives — at that point
  // Firestore is the sole source of truth and liveEngine readings are ignored.
  const firestoreLoadedRef = useRef(false);

  useEffect(() => {
    firestoreLoadedRef.current = false;
    if (!uid) return;

    setIsRunning(true);

    // Seed this user's data on first login (no-op if already seeded)
    seedUserData(uid, user?.email ?? '').catch(() => {});

    let alertsBootstrapped   = false;
    let readingsBootstrapped = false;

    // Subscribe to the user's warehouses so liveEngine simulates only THEIR
    // actual warehouses (not the hardcoded defaults).
    const DEFAULT_MAP = Object.fromEntries(DEFAULT_WH_CONFIGS.map(c => [c.id, c]));
    const unsubWarehouses = subscribeToWarehouses(uid, (warehouses) => {
      if (CLIENT_ENGINE_DISABLED) return;
      const activeWarehouses = warehouses.filter(w => w.status === 'active');
      const engineConfigs = activeWarehouses.map(wh => {
        const engineId = wh.liveEngineId ?? wh.id;
        return DEFAULT_MAP[engineId] ?? {
          id: engineId,
          baseTemp: 26.0, baseHum: 58, baseMoist: 11.0,
          baseCO2: 500, baseAQI: 36, baseCap: 70, drift: 0.0,
        };
      });
      liveEngine.setWarehouseConfigs(engineConfigs);
    });

    // Start the client engine only if the Cloud Function is not yet deployed.
    // Engine starts empty and is configured by the warehouse subscription above.
    let unsubLocal: (() => void) | null = null;
    if (!CLIENT_ENGINE_DISABLED) {
      liveEngine.setUid(uid);
      liveEngine.start(10000, 120000);

      unsubLocal = liveEngine.subscribe((newReadings, newAlerts, newTick) => {
        // Only use liveEngine readings before Firestore has sent its first snapshot.
        // After that, Firestore is the single source of truth.
        if (!firestoreLoadedRef.current) {
          setReadings({ ...newReadings });
          setLiveOverride(newReadings);
        }
        setLiveAlerts(prev => {
          if (!alertsBootstrapped) return prev;
          return [...newAlerts];
        });
        setTick(newTick);
      });
    }

    // Firestore subscriptions — always override liveEngine once data arrives.
    // An empty snapshot ({}) correctly clears the dashboard for accounts with
    // no warehouses; the old "length > 0" guard was causing fake WH-A…D to
    // persist for every user.
    const unsubReadings = subscribeToReadings(uid, (firestoreReadings) => {
      firestoreLoadedRef.current = true;
      setReadings(firestoreReadings);
      setTick(t => t + 1);
      setLiveOverride(firestoreReadings);
      if (!readingsBootstrapped) {
        liveEngine.loadPersistedReadings(firestoreReadings);
        readingsBootstrapped = true;
      }
    });

    const unsubAlerts = subscribeToAlerts(uid, (firestoreAlerts) => {
      setLiveAlerts(firestoreAlerts);
      if (!alertsBootstrapped) {
        liveEngine.loadPersistedAlerts(firestoreAlerts);
        alertsBootstrapped = true;
      }
    });

    return () => {
      unsubWarehouses();
      if (unsubLocal) unsubLocal();
      unsubReadings();
      unsubAlerts();
      if (!CLIENT_ENGINE_DISABLED) {
        liveEngine.stop();
        liveEngine.setUid(null);
        liveEngine.setWarehouseConfigs([]);
      }
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
