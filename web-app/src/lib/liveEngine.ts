/**
 * Live sensor simulation engine.
 * Physics-based model with realistic correlations between metrics.
 * Runs in the browser only; never imported on the server.
 *
 * Firestore sync: each tick writes readings + alerts to Firebase so the
 * mobile app (and any other client) stays in real-time sync with zero
 * extra infrastructure — no Cloud Functions, no billing upgrade needed.
 */

export interface LiveSensorReading {
  warehouseId:  string;
  temperature:  number; // °C
  humidity:     number; // %
  moisture:     number; // %
  co2:          number; // ppm
  aqi:          number;
  capacity:     number; // % used
  spoilageRisk: number; // 0–100
  health:       number; // 0–100
  status:       'good' | 'medium' | 'high';
  trend:        'up' | 'down' | 'stable';
  lastUpdate:   number; // Date.now()
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

// ─── Base configs per warehouse ───────────────────────────────────────────────
// Base values set well below thresholds so alerts only fire during actual spikes,
// not continuously. Thresholds: temp 29°C medium / 32°C critical, humidity 65% / 72%.

const WH_CONFIGS = [
  { id: 'WH-A', baseTemp: 25.5, baseHum: 57, baseMoist: 10.8, baseCO2: 488, baseAQI: 33, baseCap: 72, drift: 0.0   },
  { id: 'WH-B', baseTemp: 27.0, baseHum: 61, baseMoist: 11.8, baseCO2: 512, baseAQI: 40, baseCap: 67, drift: 0.07  },
  { id: 'WH-C', baseTemp: 26.0, baseHum: 55, baseMoist: 10.5, baseCO2: 502, baseAQI: 37, baseCap: 81, drift: -0.05 },
  { id: 'WH-D', baseTemp: 27.5, baseHum: 62, baseMoist: 12.0, baseCO2: 518, baseAQI: 43, baseCap: 61, drift: 0.10  },
  { id: 'WH-E', baseTemp: 26.5, baseHum: 58, baseMoist: 11.2, baseCO2: 506, baseAQI: 35, baseCap: 70, drift: 0.02  },
  { id: 'WH-F', baseTemp: 27.2, baseHum: 61, baseMoist: 11.8, baseCO2: 522, baseAQI: 41, baseCap: 73, drift: 0.05  },
  { id: 'WH-G', baseTemp: 25.8, baseHum: 54, baseMoist: 10.8, baseCO2: 483, baseAQI: 31, baseCap: 52, drift: -0.02 },
];

// ─── Alert thresholds ─────────────────────────────────────────────────────────

const THR = {
  temp:     { medium: 29,  high: 32   },
  humidity: { medium: 65,  high: 72   },
  moisture: { medium: 13,  high: 15   },
  co2:      { medium: 550, high: 650  },
  aqi:      { medium: 50,  high: 80   },
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/** Box-Muller Gaussian random */
function gauss(mean: number, std: number): number {
  const u = Math.max(1e-10, Math.random());
  const v = Math.random();
  return mean + Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
}

/** Circadian temperature offset — peaks at 15:00, low at 03:00 */
function circadian(): number {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  return Math.sin(((h - 9) / 12) * Math.PI) * 1.8;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class LiveEngine {
  private readings:      Record<string, LiveSensorReading> = {};
  private alerts:        LiveAlert[] = [];
  private listeners:     Set<Listener> = new Set();
  private timer:         ReturnType<typeof setInterval> | null = null;
  private syncTimer:     ReturnType<typeof setInterval> | null = null;
  private tickCount    = 0;
  private alertCooldown: Map<string, number> = new Map();
  private readonly COOLDOWN_MS = 20 * 60 * 1000;
  // Check alerts every 6th tick (every ~60s at 10s interval) to reduce noise
  private readonly ALERT_CHECK_EVERY = 6;
  lastTickAt = 0; // exposed so UI can show "last checked X ago"

  constructor() {
    // Seed initial state from base configs
    for (const cfg of WH_CONFIGS) {
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

  // ── Physics tick ────────────────────────────────────────────────────────────

  private tick() {
    this.tickCount++;
    this.lastTickAt = Date.now();
    const circ = circadian();

    for (const cfg of WH_CONFIGS) {
      const s = this.readings[cfg.id];
      if (!s) continue;

      const prevTemp = s.temperature;

      // ── Temperature: Gaussian walk + circadian + slow drift + mean-reversion ──
      const tempTarget = cfg.baseTemp + circ + cfg.drift * this.tickCount * 0.01;
      s.temperature = clamp(
        +(s.temperature + gauss(0, 0.12) + (tempTarget - s.temperature) * 0.04).toFixed(1),
        cfg.baseTemp - 5, cfg.baseTemp + 9,
      );

      // ── Humidity: inversely correlated with temp + own walk ──────────────────
      const tempRise = s.temperature - prevTemp;
      s.humidity = clamp(
        Math.round(s.humidity + gauss(0, 0.4) - tempRise * 0.6 + (cfg.baseHum - s.humidity) * 0.03),
        40, 94,
      );

      // ── Moisture: very slow drift ────────────────────────────────────────────
      s.moisture = clamp(
        +(s.moisture + gauss(0, 0.025) + (cfg.baseMoist - s.moisture) * 0.015).toFixed(1),
        9, 16.5,
      );

      // ── CO₂: capacity + activity based + slow walk ───────────────────────────
      const capContrib = (s.capacity - 60) * 0.04;
      s.co2 = clamp(
        Math.round(s.co2 + gauss(0, 2.5) + capContrib + (cfg.baseCO2 - s.co2) * 0.02),
        400, 850,
      );

      // ── AQI: driven by CO₂ spike + temp heat ────────────────────────────────
      const co2Factor  = Math.max(0, s.co2  - cfg.baseCO2)  * 0.05;
      const tempFactor = Math.max(0, s.temperature - 28)    * 1.1;
      s.aqi = clamp(
        Math.round(cfg.baseAQI + co2Factor + tempFactor + gauss(0, 1)),
        20, 120,
      );

      // ── Capacity: very slow drift every 10 ticks ────────────────────────────
      if (this.tickCount % 10 === 0) {
        s.capacity = clamp(s.capacity + Math.round(gauss(0, 0.3)), 25, 98);
      }

      // ── Trend direction ───────────────────────────────────────────────────────
      const delta = s.temperature - prevTemp;
      s.trend = delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'stable';

      this.recalcDerived(cfg.id);
      // Skip tick 1 — let Firestore bootstrap first so we don't flash stale engine alerts.
      // After that, check every ALERT_CHECK_EVERY ticks (~60s).
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
          const dateStr = new Date().toISOString().slice(0, 10);
          // Stable ID: same alert type on same day = same doc (no duplicates across restarts)
          const stableId = `${whId}_${c.param.toLowerCase().replace(/[^a-z0-9]/g, '')}_${c.sev}_${dateStr}`;
          const newAlert: LiveAlert = {
            id: stableId,
            warehouseId: whId, param: c.param,
            value: c.value, unit: c.unit, threshold: c.thr,
            severity: c.sev, message: c.msg,
            timestamp: Date.now(), resolved: false,
          };
          this.alerts.push(newAlert);
          // Write to alertHistory immediately (not via queue) so it persists before next sync
          this.writeAlertHistory(newAlert, undefined);
        }
      }

      // Auto-resolve if back below 95% of threshold; start cooldown
      if (c.value < c.thr * 0.95 && dup) {
        const resolvedAt = Date.now();
        this.alerts = this.alerts.map(a =>
          a.id === dup.id ? { ...a, resolved: true } : a,
        );
        this.alertCooldown.set(cooldownKey, resolvedAt);
        this.writeAlertHistory({ ...dup, resolved: true }, resolvedAt);
      }
    }

    // Keep last 40 alerts
    if (this.alerts.length > 40) this.alerts = this.alerts.slice(-40);
  }

  private notify() {
    this.listeners.forEach(fn => fn({ ...this.readings }, [...this.alerts], this.tickCount));
  }

  // ── Immediate alertHistory write (fire-and-forget) ──────────────────────────

  private async writeAlertHistory(alert: LiveAlert, resolvedAt: number | undefined) {
    try {
      const { getFirestore, doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const firebaseApp = (await import('@/config/firebase')).default;
      const db = getFirestore(firebaseApp);
      await setDoc(doc(db, 'alertHistory', alert.id), {
        ...alert,
        triggeredAt: alert.timestamp,
        resolvedAt:  resolvedAt ?? null,
        date:        new Date(alert.timestamp).toISOString().slice(0, 10),
        updatedAt:   serverTimestamp(),
      }, { merge: true });
    } catch {
      // Non-fatal — will retry on next sync
    }
  }

  // ── Firestore sync (readings + current alert state) ─────────────────────────

  private async syncToFirestore() {
    try {
      const { getFirestore, doc, setDoc, deleteDoc, serverTimestamp } = await import('firebase/firestore');
      const firebaseApp = (await import('@/config/firebase')).default;
      const db = getFirestore(firebaseApp);

      // Sensor readings
      const writes = Object.values(this.readings).map(r =>
        setDoc(doc(db, 'warehouseReadings', r.warehouseId), {
          ...r,
          updatedAt: serverTimestamp(),
        }),
      );

      // Active alerts → upsert into `alerts` collection
      const active   = this.alerts.filter(a => !a.resolved);
      const resolved = this.alerts.filter(a =>  a.resolved);

      const alertWrites  = active.map(a =>
        setDoc(doc(db, 'alerts', a.id), { ...a, updatedAt: serverTimestamp() }),
      );
      // Resolved alerts → DELETE from `alerts` (they live in alertHistory already)
      const alertDeletes = resolved.map(a =>
        deleteDoc(doc(db, 'alerts', a.id)),
      );

      await Promise.all([...writes, ...alertWrites, ...alertDeletes]);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.warn('[liveEngine] Firestore sync skipped:', err);
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  start(uiIntervalMs = 30000, syncIntervalMs = 60000) {
    if (this.timer) return;
    this.timer     = setInterval(() => { this.tick(); }, uiIntervalMs);
    this.syncTimer = setInterval(() => { this.syncToFirestore(); }, syncIntervalMs);
    setTimeout(() => { this.tick(); }, 3000);   // delay first tick — let Firestore bootstrap first
    setTimeout(() => { this.syncToFirestore(); }, 5000);
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

  /** Pre-populate alerts from Firestore so engine continues from last known state. */
  loadPersistedAlerts(existing: LiveAlert[]) {
    for (const a of existing) {
      if (!a.resolved && !this.alerts.find(x => x.id === a.id)) {
        this.alerts.push({ ...a });
      }
    }
  }
}

// Singleton — one engine for the whole app
export const liveEngine = new LiveEngine();
