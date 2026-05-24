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

const CLIENT_ENGINE_DISABLED = process.env.NEXT_PUBLIC_DISABLE_CLIENT_ENGINE === '1';

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

    setIsRunning(true);

    // Seed this user's data on first login (no-op if already seeded)
    seedUserData(uid, user?.email ?? '').catch(() => {});

    let alertsBootstrapped   = false;
    let readingsBootstrapped = false;

    // Start the client engine only if the Cloud Function is not yet deployed
    let unsubLocal: (() => void) | null = null;
    if (!CLIENT_ENGINE_DISABLED) {
      liveEngine.setUid(uid);
      liveEngine.start(10000, 120000);

      unsubLocal = liveEngine.subscribe((newReadings, newAlerts, newTick) => {
        setReadings({ ...newReadings });
        setLiveAlerts(prev => {
          if (!alertsBootstrapped) return prev;
          return [...newAlerts];
        });
        setTick(newTick);
        setLiveOverride(newReadings);
      });
    }

    // Firestore subscriptions — these take precedence when Cloud Function is live
    const unsubReadings = subscribeToReadings(uid, (firestoreReadings) => {
      if (Object.keys(firestoreReadings).length > 0) {
        setReadings(firestoreReadings);
        setTick(t => t + 1);
        setLiveOverride(firestoreReadings);
        if (!readingsBootstrapped) {
          liveEngine.loadPersistedReadings(firestoreReadings);
          readingsBootstrapped = true;
        }
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
      if (unsubLocal) unsubLocal();
      unsubReadings();
      unsubAlerts();
      if (!CLIENT_ENGINE_DISABLED) {
        liveEngine.stop();
        liveEngine.setUid(null);
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
