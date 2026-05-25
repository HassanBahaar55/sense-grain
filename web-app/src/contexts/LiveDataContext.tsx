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
import { onSnapshot, collection, query, where, getFirestore } from 'firebase/firestore';
import firebaseApp from '@/config/firebase';
import { col } from '@/lib/accountDb';
import { liveEngine, DEFAULT_WH_CONFIGS, type LiveSensorReading, type LiveAlert } from '@/lib/liveEngine';
import { subscribeToWarehouses, subscribeToReadings, subscribeToAlerts } from '@/lib/firestoreService';
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

    // ── Sensor-gated engine ──────────────────────────────────────────────────
    // liveEngine only runs for warehouses that have at least one ACTIVE
    // (admin-approved) sensor. Warehouses with no approved sensors should
    // produce zero readings — showing fake data without real hardware is wrong.

    const DEFAULT_MAP = Object.fromEntries(DEFAULT_WH_CONFIGS.map(c => [c.id, c]));

    // Mutable state shared between the two subscriptions (warehouses + sensors).
    // Using plain let-variables inside the closure avoids React ref overhead.
    type WHShape = { id: string; status: string; liveEngineId?: string };
    let currentWarehouses: WHShape[]   = [];
    let activeSensorWhIds = new Set<string>(); // Firestore warehouse doc IDs with ≥1 active sensor

    // liveEngineIds of warehouses that are ready (active + have active sensors)
    const getReadyLiveIds = (): Set<string> =>
      new Set(
        currentWarehouses
          .filter(w => w.status === 'active' && activeSensorWhIds.has(w.id))
          .map(w => w.liveEngineId ?? w.id),
      );

    const applyEngineConfigs = () => {
      if (CLIENT_ENGINE_DISABLED) return;
      const readyIds = getReadyLiveIds();
      const configs = currentWarehouses
        .filter(w => w.status === 'active' && readyIds.has(w.liveEngineId ?? w.id))
        .map(wh => {
          const eid = wh.liveEngineId ?? wh.id;
          return DEFAULT_MAP[eid] ?? {
            id: eid, baseTemp: 26.0, baseHum: 58, baseMoist: 11.0,
            baseCO2: 500, baseAQI: 36, baseCap: 70, drift: 0.0,
          };
        });
      liveEngine.setWarehouseConfigs(configs);
    };

    const unsubWarehouses = subscribeToWarehouses(uid, (whs) => {
      currentWarehouses = whs;
      applyEngineConfigs();
    });

    // Subscribe to active (approved) sensors to know which warehouses are "live"
    const unsubSensors = onSnapshot(
      query(collection(db, col.sensors(uid)), where('status', '==', 'active')),
      (snap) => {
        activeSensorWhIds = new Set(snap.docs.map(d => d.data().warehouseId as string));
        applyEngineConfigs();
      },
    );

    // Start the client engine only if the Cloud Function is not yet deployed.
    let unsubLocal: (() => void) | null = null;
    if (!CLIENT_ENGINE_DISABLED) {
      liveEngine.setUid(uid);
      liveEngine.start(10000, 120000);

      unsubLocal = liveEngine.subscribe((newReadings, newAlerts, newTick) => {
        if (!firestoreLoadedRef.current) {
          // Filter engine readings to only include sensor-ready warehouses
          const readyIds = getReadyLiveIds();
          const filtered = readyIds.size > 0
            ? Object.fromEntries(Object.entries(newReadings).filter(([id]) => readyIds.has(id)))
            : {};
          setReadings(filtered);
          setLiveOverride(filtered);
        }
        setLiveAlerts(prev => {
          if (!alertsBootstrapped) return prev;
          return [...newAlerts];
        });
        setTick(newTick);
      });
    }

    // Firestore subscriptions — always override liveEngine once data arrives.
    // Filter to only warehouses with active sensors so stale readings from
    // previously sensor-less warehouses don't bleed through.
    const unsubReadings = subscribeToReadings(uid, (firestoreReadings) => {
      firestoreLoadedRef.current = true;
      const readyIds = getReadyLiveIds();
      const filtered = readyIds.size > 0
        ? Object.fromEntries(Object.entries(firestoreReadings).filter(([id]) => readyIds.has(id)))
        : {};
      setReadings(filtered);
      setTick(t => t + 1);
      setLiveOverride(filtered);
      if (!readingsBootstrapped) {
        liveEngine.loadPersistedReadings(filtered);
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
      unsubSensors();
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
