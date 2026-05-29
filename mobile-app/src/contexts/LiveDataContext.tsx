import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';

import type {
  ManagedWarehouse,
  ManagedZone,
  ManagedSensor,
  WarehouseReading,
  LiveSensorReading,
  LiveAlert,
  SensorHistoryEntry,
  ReportItem,
  ResourceRequest,
} from '../lib/accountDb';
import {
  subscribeToWarehouses,
  subscribeToZones,
  subscribeToSensors,
  subscribeToWarehouseReadings,
  subscribeToSensorReadings,
  subscribeToAlerts,
  subscribeToAlertHistory,
  subscribeToSensorHistory,
  subscribeToReports,
} from '../lib/firestoreService';
import {usePendingRequests} from '../lib/storageManagement';
import {useAuth} from '../app/AuthProvider';
import {useUser} from './UserContext';

// ─── Context type ─────────────────────────────────────────────────────────────

interface LiveDataContextValue {
  warehouses: ManagedWarehouse[];
  zones: ManagedZone[];
  sensors: ManagedSensor[];
  warehouseReadings: WarehouseReading[];
  sensorReadings: LiveSensorReading[];
  alerts: LiveAlert[];
  alertHistory: LiveAlert[];
  sensorHistory: SensorHistoryEntry[];
  reports: ReportItem[];
  pendingRequests: ResourceRequest[];
  loading: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const LiveDataContext = createContext<LiveDataContextValue>({
  warehouses: [],
  zones: [],
  sensors: [],
  warehouseReadings: [],
  sensorReadings: [],
  alerts: [],
  alertHistory: [],
  sensorHistory: [],
  reports: [],
  pendingRequests: [],
  loading: true,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LiveDataProvider({children}: {children: React.ReactNode}) {
  const {user} = useAuth();
  const {approvalStatus} = useUser();

  const [warehouses, setWarehouses] = useState<ManagedWarehouse[]>([]);
  const [zones, setZones] = useState<ManagedZone[]>([]);
  const [sensors, setSensors] = useState<ManagedSensor[]>([]);
  const [warehouseReadings, setWarehouseReadings] = useState<WarehouseReading[]>([]);
  const [sensorReadings, setSensorReadings] = useState<LiveSensorReading[]>([]);
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [alertHistory, setAlertHistory] = useState<LiveAlert[]>([]);
  const [sensorHistory, setSensorHistory] = useState<SensorHistoryEntry[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep warehouses in a ref so the warehouseReadings subscription can use them
  const warehousesRef = useRef<ManagedWarehouse[]>([]);
  warehousesRef.current = warehouses;

  const pendingRequests = usePendingRequests(user?.uid);

  const uid = user?.uid;
  const isApproved = approvalStatus === 'approved';

  useEffect(() => {
    if (!uid || !isApproved) {
      setWarehouses([]);
      setZones([]);
      setSensors([]);
      setWarehouseReadings([]);
      setSensorReadings([]);
      setAlerts([]);
      setAlertHistory([]);
      setSensorHistory([]);
      setReports([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let resolved = 0;
    const total = 8;
    const tick = () => {
      resolved++;
      if (resolved >= total) setLoading(false);
    };

    const unsubWH  = subscribeToWarehouses(uid, rows => { setWarehouses(rows); tick(); });
    const unsubZ   = subscribeToZones(uid, rows => { setZones(rows); tick(); });
    const unsubS   = subscribeToSensors(uid, rows => { setSensors(rows); tick(); });
    const unsubSR  = subscribeToSensorReadings(uid, rows => { setSensorReadings(rows); tick(); });
    const unsubA   = subscribeToAlerts(uid, rows => { setAlerts(rows); tick(); });
    const unsubAH  = subscribeToAlertHistory(uid, rows => { setAlertHistory(rows); tick(); });
    const unsubSH  = subscribeToSensorHistory(uid, rows => { setSensorHistory(rows); tick(); });
    const unsubRep = subscribeToReports(uid, rows => { setReports(rows); tick(); });

    return () => {
      unsubWH(); unsubZ(); unsubS(); unsubSR();
      unsubA(); unsubAH(); unsubSH(); unsubRep();
    };
  }, [uid, isApproved]);

  // Warehouse readings depend on the warehouses list for name resolution.
  // Re-subscribe whenever warehouses change.
  useEffect(() => {
    if (!uid || !isApproved) {setWarehouseReadings([]); return;}
    const unsub = subscribeToWarehouseReadings(uid, warehouses, rows => setWarehouseReadings(rows));
    return unsub;
  }, [uid, isApproved, warehouses]);

  const value = useMemo<LiveDataContextValue>(
    () => ({
      warehouses, zones, sensors,
      warehouseReadings, sensorReadings,
      alerts, alertHistory, sensorHistory,
      reports, pendingRequests,
      loading,
    }),
    [
      warehouses, zones, sensors,
      warehouseReadings, sensorReadings,
      alerts, alertHistory, sensorHistory,
      reports, pendingRequests, loading,
    ],
  );

  return <LiveDataContext.Provider value={value}>{children}</LiveDataContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLiveData() {
  return useContext(LiveDataContext);
}
