/**
 * Live sensor simulation engine.
 * Physics-based model with realistic correlations between metrics.
 * Runs in the browser; writes to Firestore so all data persists permanently.
 *
 * Per-user architecture: call setUid(uid) after login.
 * All Firestore writes go to /accounts/{uid}/... so no two users share data.
 *
 * Alerts: stored permanently in alertHistory — never auto-deleted.
 * Active (unresolved) alerts also live in /accounts/{uid}/alerts/.
 */

export interface LiveSensorReading {
  warehouseId:  string;
  temperature:  number;   // °C
  humidity:     number;   // %
  moisture:     number;   // %
  co2:          number;   // ppm
  aqi:          number;
  capacity:     number;   // % used
  spoilageRisk: number;   // 0–100
  health:       number;   // 0–100
  status:       'good' | 'medium' | 'high';
  trend:        'up' | 'down' | 'stable';
  lastUpdate:   number;   // Date.now()
}

export interface LiveAlert {
  id:          string;
  warehouseId: string;
  param:       string;
  value:       number;
  unit:        string;
  threshold:   number;
  severity:    'critical' | 'high' | 'medium';
  message:     string;
  timestamp:   number;
  resolved:    boolean;
}

type Listener = (
  readings: Record<string, LiveSensorReading>,
  alerts:   LiveAlert[],
  tick:     number,
) => void;

// ─── Default warehouse configs (used until user has their own warehouses) ──────

export const DEFAULT_WH_CONFIGS = [
  { id: 'WH-A', baseTemp: 25.5, baseHum: 57, baseMoist: 10.8, baseCO2: 488, baseAQI: 33, baseCap: 72, drift: 0.0   },
  { id: 'WH-B', baseTemp: 27.0, baseHum: 61, baseMoist: 11.8, baseCO2: 512, baseAQI: 40, baseCap: 67, drift: 0.07  },
  { id: 'WH-C', baseTemp: 26.0, baseHum: 55, baseMoist: 10.5, baseCO2: 502, baseAQI: 37, baseCap: 81, drift: -0.05 },
  { id: 'WH-D', baseTemp: 27.5, baseHum: 62, baseMoist: 12.0, baseCO2: 518, baseAQI: 43, baseCap: 61, drift: 0.10  },
];

// ─── Alert thresholds ─────────────────────────────────────────────────────────

const THR = {
  temp:     { medium: 29,  high: 32  },
  humidity: { medium: 65,  high: 72  },
  moisture: { medium: 13,  high: 15  },
  co2:      { medium: 550, high: 650 },
  aqi:      { medium: 50,  high: 80  },
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function gauss(mean: number, std: number): number {
  const u = Math.max(1e-10, Math.random());
  const v = Math.random();
  return mean + Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
}

function circadian(): number {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  return Math.sin(((h - 9) / 12) * Math.PI) * 1.8;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class LiveEngine {
  private uid:           string | null = null;
  private whConfigs:     typeof DEFAULT_WH_CONFIGS = [...DEFAULT_WH_CONFIGS];
  private readings:      Record<string, LiveSensorReading> = {};
  private alerts:        LiveAlert[] = [];
  private listeners:     Set<Listener> = new Set();
  private timer:         ReturnType<typeof setInterval> | null = null;
  private syncTimer:     ReturnType<typeof setInterval> | null = null;
  private tickCount    = 0;
  private alertCooldown: Map<string, number> = new Map();
  private readonly COOLDOWN_MS      = 20 * 60 * 1000; // 20 min between same alert
  private readonly ALERT_CHECK_EVERY = 6;              // check every 6th tick (~60s)
  lastTickAt = 0;

  constructor() {
    this.initReadings();
  }

  private initReadings() {
    this.readings = {};
    for (const cfg of this.whConfigs) {
      this.readings[cfg.id] = {
        warehouseId:  cfg.id,
        temperature:  +(cfg.baseTemp + gauss(0, 0.4)).toFixed(1),
        humidity:     Math.round(cfg.baseHum + gauss(0, 1.5)),
        moisture:     +(cfg.baseMoist + gauss(0, 0.2)).toFixed(1),
        co2:          Math.round(cfg.baseCO2 + gauss(0, 8)),
        aqi:          Math.round(cfg.baseAQI + gauss(0, 1.5)),
        capacity:     cfg.baseCap,
        spoilageRisk: 0,
        health:       100,
        status:       'good',
        trend:        'stable',
        lastUpdate:   Date.now(),
      };
      this.recalcDerived(cfg.id);
    }
  }

  /** Set the current user uid — all Firestore writes go to /accounts/{uid}/... */
  setUid(uid: string | null) {
    this.uid = uid;
  }

  /** Replace the warehouse configs (called when user's warehouses load from Firestore) */
  setWarehouseConfigs(configs: typeof DEFAULT_WH_CONFIGS) {
    this.whConfigs = configs.length > 0 ? configs : [...DEFAULT_WH_CONFIGS];
    // Add any new warehouse IDs to readings map without resetting existing ones
    for (const cfg of this.whConfigs) {
      if (!this.readings[cfg.id]) {
        this.readings[cfg.id] = {
          warehouseId:  cfg.id,
          temperature:  +(cfg.baseTemp + gauss(0, 0.4)).toFixed(1),
          humidity:     Math.round(cfg.baseHum + gauss(0, 1.5)),
          moisture:     +(cfg.baseMoist + gauss(0, 0.2)).toFixed(1),
          co2:          Math.round(cfg.baseCO2 + gauss(0, 8)),
          aqi:          Math.round(cfg.baseAQI + gauss(0, 1.5)),
          capacity:     cfg.baseCap,
          spoilageRisk: 0,
          health:       100,
          status:       'good',
          trend:        'stable',
          lastUpdate:   Date.now(),
        };
        this.recalcDerived(cfg.id);
      }
    }
    // Remove readings for warehouses no longer in configs
    const validIds = new Set(this.whConfigs.map(c => c.id));
    for (const id of Object.keys(this.readings)) {
      if (!validIds.has(id)) delete this.readings[id];
    }
  }

  // ── Physics tick ────────────────────────────────────────────────────────────

  private tick() {
    this.tickCount++;
    this.lastTickAt = Date.now();
    const circ = circadian();

    for (const cfg of this.whConfigs) {
      const s = this.readings[cfg.id];
      if (!s) continue;

      const prevTemp = s.temperature;

      const tempTarget = cfg.baseTemp + circ + cfg.drift * this.tickCount * 0.01;
      s.temperature = clamp(
        +(s.temperature + gauss(0, 0.12) + (tempTarget - s.temperature) * 0.04).toFixed(1),
        cfg.baseTemp - 5, cfg.baseTemp + 9,
      );

      const tempRise = s.temperature - prevTemp;
      s.humidity = clamp(
        Math.round(s.humidity + gauss(0, 0.4) - tempRise * 0.6 + (cfg.baseHum - s.humidity) * 0.03),
        40, 94,
      );

      s.moisture = clamp(
        +(s.moisture + gauss(0, 0.025) + (cfg.baseMoist - s.moisture) * 0.015).toFixed(1),
        9, 16.5,
      );

      const capContrib = (s.capacity - 60) * 0.04;
      s.co2 = clamp(
        Math.round(s.co2 + gauss(0, 2.5) + capContrib + (cfg.baseCO2 - s.co2) * 0.02),
        400, 850,
      );

      const co2Factor  = Math.max(0, s.co2  - cfg.baseCO2) * 0.05;
      const tempFactor = Math.max(0, s.temperature - 28)   * 1.1;
      s.aqi = clamp(
        Math.round(cfg.baseAQI + co2Factor + tempFactor + gauss(0, 1)),
        20, 120,
      );

      if (this.tickCount % 10 === 0) {
        s.capacity = clamp(s.capacity + Math.round(gauss(0, 0.3)), 25, 98);
      }

      const delta = s.temperature - prevTemp;
      s.trend = delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'stable';

      this.recalcDerived(cfg.id);

      if (this.tickCount > 1 && this.tickCount % this.ALERT_CHECK_EVERY === 0) {
        this.checkAlerts(cfg.id, s);
      }
    }

    this.notify();
  }

  // ── Derived metrics ─────────────────────────────────────────────────────────

  private recalcDerived(id: string) {
    const s = this.readings[id];
    if (!s) return;
    const tempFactor  = Math.max(0, (s.temperature - 25) / 10) * 40;
    const humFactor   = Math.max(0, (s.humidity - 55)    / 15) * 28;
    const moistFactor = Math.max(0, (s.moisture - 10)    /  5) * 22;
    const co2Factor   = Math.max(0, (s.co2 - 500)        / 150) * 10;
    s.spoilageRisk = clamp(Math.round(tempFactor + humFactor + moistFactor + co2Factor), 0, 100);
    s.health       = clamp(Math.round(100 - s.spoilageRisk * 0.65), 15, 100);
    s.status =
      s.temperature >= THR.temp.high || s.humidity >= THR.humidity.high || s.moisture >= THR.moisture.high
        ? 'high'
        : s.temperature >= THR.temp.medium || s.humidity >= THR.humidity.medium || s.moisture >= THR.moisture.medium
        ? 'medium'
        : 'good';
    s.lastUpdate = Date.now();
  }

  // ── Alert generation ────────────────────────────────────────────────────────

  private checkAlerts(whId: string, s: LiveSensorReading) {
    const checks: Array<{ param: string; value: number; unit: string; thr: number; sev: LiveAlert['severity']; msg: string }> = [
      { param: 'Temperature', value: s.temperature, unit: '°C',  thr: THR.temp.high,       sev: 'critical', msg: `Temperature critical at ${s.temperature.toFixed(1)}°C` },
      { param: 'Temperature', value: s.temperature, unit: '°C',  thr: THR.temp.medium,     sev: 'medium',   msg: `Temperature elevated at ${s.temperature.toFixed(1)}°C` },
      { param: 'Humidity',    value: s.humidity,    unit: '%',   thr: THR.humidity.high,   sev: 'high',     msg: `Humidity exceeded ${THR.humidity.high}% at ${s.humidity}%` },
      { param: 'Humidity',    value: s.humidity,    unit: '%',   thr: THR.humidity.medium, sev: 'medium',   msg: `Humidity warning at ${s.humidity}%` },
      { param: 'Moisture',    value: s.moisture,    unit: '%',   thr: THR.moisture.high,   sev: 'high',     msg: `Moisture critical at ${s.moisture.toFixed(1)}%` },
      { param: 'Moisture',    value: s.moisture,    unit: '%',   thr: THR.moisture.medium, sev: 'medium',   msg: `Moisture rising at ${s.moisture.toFixed(1)}%` },
      { param: 'CO₂',        value: s.co2,         unit: 'ppm', thr: THR.co2.medium,      sev: 'medium',   msg: `CO₂ elevated at ${s.co2} ppm` },
      { param: 'AQI',        value: s.aqi,         unit: '',    thr: THR.aqi.medium,      sev: 'medium',   msg: `Air quality index at ${s.aqi}` },
    ];

    for (const c of checks) {
      const cooldownKey = `${whId}:${c.param}:${c.sev}`;
      const dup = this.alerts.find(a => !a.resolved && a.warehouseId === whId && a.param === c.param && a.severity === c.sev);

      if (c.value > c.thr && !dup) {
        const lastResolved = this.alertCooldown.get(cooldownKey) ?? 0;
        if (Date.now() - lastResolved >= this.COOLDOWN_MS) {
          const dateStr  = new Date().toISOString().slice(0, 10);
          const stableId = `${whId}_${c.param.toLowerCase().replace(/[^a-z0-9]/g, '')}_${c.sev}_${dateStr}`;
          const newAlert: LiveAlert = {
            id: stableId, warehouseId: whId, param: c.param,
            value: c.value, unit: c.unit, threshold: c.thr,
            severity: c.sev, message: c.msg,
            timestamp: Date.now(), resolved: false,
          };
          this.alerts.push(newAlert);
          this.writeAlertHistory(newAlert, undefined);
          this.writeActiveAlert(newAlert);
        }
      }

      if (c.value < c.thr * 0.95 && dup) {
        const resolvedAt = Date.now();
        this.alerts = this.alerts.map(a => a.id === dup.id ? { ...a, resolved: true } : a);
        this.alertCooldown.set(cooldownKey, resolvedAt);
        // Update alertHistory with resolvedAt, remove from active alerts
        this.writeAlertHistory({ ...dup, resolved: true }, resolvedAt);
        this.deleteActiveAlert(dup.id);
      }
    }

    // Keep only last 100 alerts in memory
    if (this.alerts.length > 100) this.alerts = this.alerts.slice(-100);
  }

  private notify() {
    this.listeners.forEach(fn => fn({ ...this.readings }, [...this.alerts], this.tickCount));
  }

  // ── Firestore path helper ────────────────────────────────────────────────────

  private get basePath(): string {
    return this.uid ? `accounts/${this.uid}` : '__no_uid__';
  }

  // ── Immediate alertHistory write (permanent — never deleted) ─────────────────

  private async writeAlertHistory(alert: LiveAlert, resolvedAt: number | undefined) {
    if (!this.uid) return;
    try {
      const { getFirestore, doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const app = (await import('@/config/firebase')).default;
      const db  = getFirestore(app);
      await setDoc(doc(db, `${this.basePath}/alertHistory`, alert.id), {
        ...alert,
        triggeredAt: alert.timestamp,
        resolvedAt:  resolvedAt ?? null,
        date:        new Date(alert.timestamp).toISOString().slice(0, 10),
        updatedAt:   serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn('[liveEngine] writeAlertHistory failed:', err);
    }
  }

  private async writeActiveAlert(alert: LiveAlert) {
    if (!this.uid) return;
    try {
      const { getFirestore, doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const app = (await import('@/config/firebase')).default;
      const db  = getFirestore(app);
      await setDoc(doc(db, `${this.basePath}/alerts`, alert.id), { ...alert, updatedAt: serverTimestamp() });
    } catch (err) {
      console.warn('[liveEngine] writeActiveAlert failed:', err);
    }
  }

  private async deleteActiveAlert(alertId: string) {
    if (!this.uid) return;
    try {
      const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');
      const app = (await import('@/config/firebase')).default;
      const db  = getFirestore(app);
      // Remove from active alerts (they are already permanently in alertHistory)
      await deleteDoc(doc(db, `${this.basePath}/alerts`, alertId));
    } catch { /* non-fatal */ }
  }

  // ── Firestore sync (readings + active alerts every 2 min) ───────────────────

  private async syncToFirestore() {
    if (!this.uid) return;
    try {
      const { getFirestore, doc, setDoc, deleteDoc, serverTimestamp } = await import('firebase/firestore');
      const app = (await import('@/config/firebase')).default;
      const db  = getFirestore(app);
      const base = this.basePath;

      const readingWrites = Object.values(this.readings).map(r =>
        setDoc(doc(db, `${base}/warehouseReadings`, r.warehouseId), { ...r, updatedAt: serverTimestamp() }),
      );

      const active   = this.alerts.filter(a => !a.resolved);
      const resolved = this.alerts.filter(a =>  a.resolved);

      const alertWrites  = active.map(a =>
        setDoc(doc(db, `${base}/alerts`, a.id), { ...a, updatedAt: serverTimestamp() }),
      );
      // Resolved → remove from active alerts (still in alertHistory permanently)
      const alertDeletes = resolved.map(a =>
        deleteDoc(doc(db, `${base}/alerts`, a.id)),
      );

      await Promise.all([...readingWrites, ...alertWrites, ...alertDeletes]);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.warn('[liveEngine] sync skipped:', err);
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  start(uiIntervalMs = 10000, syncIntervalMs = 120000) {
    if (this.timer) return;
    this.timer     = setInterval(() => this.tick(), uiIntervalMs);
    this.syncTimer = setInterval(() => this.syncToFirestore(), syncIntervalMs);
    setTimeout(() => this.tick(), 3000);
    setTimeout(() => this.syncToFirestore(), 5000);
  }

  stop() {
    if (this.timer)     { clearInterval(this.timer);     this.timer     = null; }
    if (this.syncTimer) { clearInterval(this.syncTimer); this.syncTimer = null; }
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getReadings() { return { ...this.readings }; }
  getAlerts()   { return [...this.alerts]; }
  getTick()     { return this.tickCount; }

  loadPersistedAlerts(existing: LiveAlert[]) {
    for (const a of existing) {
      if (!a.resolved && !this.alerts.find(x => x.id === a.id)) {
        this.alerts.push({ ...a });
      }
    }
  }

  loadPersistedReadings(firestoreReadings: Record<string, LiveSensorReading>) {
    for (const [id, r] of Object.entries(firestoreReadings)) {
      if (this.readings[id] && r.temperature != null) {
        this.readings[id] = {
          ...this.readings[id],
          temperature:  r.temperature,
          humidity:     r.humidity,
          moisture:     r.moisture,
          co2:          r.co2,
          aqi:          r.aqi,
          capacity:     r.capacity,
          spoilageRisk: r.spoilageRisk,
          health:       r.health,
          status:       r.status,
          trend:        r.trend,
        };
      }
    }
  }
}

// Singleton — one engine per app session
export const liveEngine = new LiveEngine();
