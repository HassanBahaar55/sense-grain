export type TrendDir   = 'up' | 'down' | 'stable' | 'slight-up';
export type RiskLevel  = 'low' | 'medium' | 'high' | 'inactive';
export type ColorKey   = 'amber' | 'blue' | 'green' | 'purple' | 'teal' | 'indigo';
export type Timeframe  = '24H' | '3D' | '7D' | '14D' | '30D';

// ─── Parameter forecast cards ─────────────────────────────────────────────────

export interface ParamForecastCard {
  key: string;
  label: string;
  unit: string;
  current: number;
  forecast: number;
  rangeMin: number;
  rangeMax: number;
  trend: TrendDir;
  confidence: number;
  sparkData: number[];
  colorKey: ColorKey;
}

export const paramForecastCards: ParamForecastCard[] = [
  {
    key: 'temp', label: 'Temperature', unit: '°C',
    current: 29.4, forecast: 31.2, rangeMin: 28.0, rangeMax: 33.0,
    trend: 'up', confidence: 88,
    sparkData: [28.1, 28.6, 29.0, 29.2, 29.8, 30.4, 31.2],
    colorKey: 'amber',
  },
  {
    key: 'humidity', label: 'Humidity', unit: '%',
    current: 68, forecast: 71, rangeMin: 62, rangeMax: 74,
    trend: 'slight-up', confidence: 85,
    sparkData: [65, 66, 67, 68, 68, 70, 71],
    colorKey: 'blue',
  },
  {
    key: 'moisture', label: 'Moisture Content', unit: '%',
    current: 12.4, forecast: 13.1, rangeMin: 11.0, rangeMax: 14.2,
    trend: 'slight-up', confidence: 82,
    sparkData: [11.8, 12.0, 12.2, 12.4, 12.5, 12.8, 13.1],
    colorKey: 'green',
  },
  {
    key: 'co2', label: 'CO₂ Level', unit: 'ppm',
    current: 548, forecast: 561, rangeMin: 510, rangeMax: 580,
    trend: 'up', confidence: 79,
    sparkData: [530, 535, 540, 545, 549, 554, 561],
    colorKey: 'purple',
  },
  {
    key: 'aqi', label: 'Air Quality', unit: 'AQI',
    current: 46, forecast: 49, rangeMin: 38, rangeMax: 55,
    trend: 'stable', confidence: 91,
    sparkData: [44, 45, 46, 46, 47, 48, 49],
    colorKey: 'teal',
  },
  {
    key: 'capacity', label: 'Storage Capacity', unit: '%',
    current: 62.2, forecast: 64.5, rangeMin: 60.0, rangeMax: 68.0,
    trend: 'slight-up', confidence: 94,
    sparkData: [61.0, 61.5, 61.8, 62.2, 62.8, 63.5, 64.5],
    colorKey: 'indigo',
  },
];

// ─── Main forecast chart (historical + forecast) ──────────────────────────────
// Stability indices 0–100. Historical: May 20–26. Forecast: May 26–Jun 02.
// May 26 is the transition point — appears in both historical and forecast series.

export interface ForecastPoint {
  day: string;
  // historical (null for forecast-only days)
  temp: number | null;
  humidity: number | null;
  moisture: number | null;
  co2: number | null;
  // forecast / predicted (null for past-only days, except May 26 transition)
  tempF: number | null;
  humidityF: number | null;
  moistureF: number | null;
  co2F: number | null;
}

export const mainForecastData: ForecastPoint[] = [
  { day: 'May 20', temp: 78,   humidity: 74,   moisture: 82,   co2: 88,   tempF: null, humidityF: null, moistureF: null, co2F: null },
  { day: 'May 21', temp: 79,   humidity: 68,   moisture: 79,   co2: 83,   tempF: null, humidityF: null, moistureF: null, co2F: null },
  { day: 'May 22', temp: 77,   humidity: 65,   moisture: 76,   co2: 80,   tempF: null, humidityF: null, moistureF: null, co2F: null },
  { day: 'May 23', temp: 80,   humidity: 68,   moisture: 80,   co2: 84,   tempF: null, humidityF: null, moistureF: null, co2F: null },
  { day: 'May 24', temp: 84,   humidity: 72,   moisture: 84,   co2: 88,   tempF: null, humidityF: null, moistureF: null, co2F: null },
  { day: 'May 25', temp: 87,   humidity: 76,   moisture: 87,   co2: 91,   tempF: null, humidityF: null, moistureF: null, co2F: null },
  { day: 'May 26', temp: 85,   humidity: 74,   moisture: 85,   co2: 89,   tempF: 85,   humidityF: 74,   moistureF: 85,   co2F: 89   }, // ← Today (transition)
  { day: 'May 27', temp: null, humidity: null, moisture: null, co2: null, tempF: 82,   humidityF: 71,   moistureF: 83,   co2F: 87   },
  { day: 'May 28', temp: null, humidity: null, moisture: null, co2: null, tempF: 78,   humidityF: 68,   moistureF: 80,   co2F: 85   },
  { day: 'May 29', temp: null, humidity: null, moisture: null, co2: null, tempF: 74,   humidityF: 65,   moistureF: 78,   co2F: 83   },
  { day: 'May 30', temp: null, humidity: null, moisture: null, co2: null, tempF: 71,   humidityF: 63,   moistureF: 76,   co2F: 81   },
  { day: 'May 31', temp: null, humidity: null, moisture: null, co2: null, tempF: 69,   humidityF: 61,   moistureF: 74,   co2F: 79   },
  { day: 'Jun 01', temp: null, humidity: null, moisture: null, co2: null, tempF: 67,   humidityF: 59,   moistureF: 72,   co2F: 77   },
  { day: 'Jun 02', temp: null, humidity: null, moisture: null, co2: null, tempF: 65,   humidityF: 57,   moistureF: 70,   co2F: 75   },
];

export const forecastSeries = [
  { hist: 'temp'     as const, fore: 'tempF'     as const, color: '#f59e0b', label: 'Temperature' },
  { hist: 'humidity' as const, fore: 'humidityF' as const, color: '#3b82f6', label: 'Humidity'    },
  { hist: 'moisture' as const, fore: 'moistureF' as const, color: '#10b981', label: 'Moisture'    },
  { hist: 'co2'      as const, fore: 'co2F'      as const, color: '#8b5cf6', label: 'CO₂'         },
];

// ─── Prediction summary panel ─────────────────────────────────────────────────

export const predictionSummary = {
  overallCondition: 'Moderate Risk',
  conditionLevel:   'medium'  as RiskLevel,
  trend:            'Rising temperature & humidity across campus',
  attention:        'WH-C Zone 3 requires immediate intervention',
  confidence:       91,
  aiModel:          'Advanced AI v2.4',
  nextUpdate:       '14 min',
  lastUpdated:      '10:31 AM',
};

// ─── Warehouse prediction table ───────────────────────────────────────────────

export interface WHPredictionRow {
  id: string;
  name: string;
  overallRisk:  RiskLevel;
  tempForecast: string | null;
  humForecast:  string | null;
  moistForecast: string | null;
  co2Forecast:  string | null;
  aqiForecast:  string | null;
  capForecast:  string | null;
  trend:        TrendDir | null;
}

export const whPredictionTable: WHPredictionRow[] = [
  { id: 'WH-A', name: 'Warehouse A', overallRisk: 'low',      tempForecast: '28.0 °C', humForecast: '59%', moistForecast: '12.0%', co2Forecast: '521 ppm', aqiForecast: '38', capForecast: '74%', trend: 'stable'    },
  { id: 'WH-B', name: 'Warehouse B', overallRisk: 'medium',   tempForecast: '31.5 °C', humForecast: '74%', moistForecast: '14.0%', co2Forecast: '568 ppm', aqiForecast: '52', capForecast: '68%', trend: 'up'        },
  { id: 'WH-C', name: 'Warehouse C', overallRisk: 'high',     tempForecast: '36.8 °C', humForecast: '80%', moistForecast: '16.1%', co2Forecast: '615 ppm', aqiForecast: '58', capForecast: '82%', trend: 'up'        },
  { id: 'WH-D', name: 'Warehouse D', overallRisk: 'low',      tempForecast: '27.8 °C', humForecast: '61%', moistForecast: '12.3%', co2Forecast: '528 ppm', aqiForecast: '40', capForecast: '62%', trend: 'stable'    },
  { id: 'WH-E', name: 'Warehouse E', overallRisk: 'low',      tempForecast: '27.6 °C', humForecast: '60%', moistForecast: '12.1%', co2Forecast: '524 ppm', aqiForecast: '39', capForecast: '71%', trend: 'stable'    },
  { id: 'WH-F', name: 'Warehouse F', overallRisk: 'medium',   tempForecast: '31.0 °C', humForecast: '72%', moistForecast: '14.5%', co2Forecast: '558 ppm', aqiForecast: '55', capForecast: '74%', trend: 'slight-up' },
  { id: 'WH-G', name: 'Warehouse G', overallRisk: 'low',      tempForecast: '26.8 °C', humForecast: '56%', moistForecast: '11.7%', co2Forecast: '508 ppm', aqiForecast: '34', capForecast: '53%', trend: 'stable'    },
  { id: 'WH-H', name: 'Warehouse H', overallRisk: 'inactive', tempForecast: null,      humForecast: null,  moistForecast: null,    co2Forecast: null,      aqiForecast: null, capForecast: null,  trend: null        },
];

// ─── Risk forecast chart (7-day zone risk distribution %) ─────────────────────

export interface RiskForecastPoint {
  day: string;
  Low: number;
  Medium: number;
  High: number;
}

export const riskForecastData: RiskForecastPoint[] = [
  { day: 'May 26', Low: 62.5, Medium: 21.9, High: 9.4  },
  { day: 'May 27', Low: 60.2, Medium: 22.8, High: 10.8 },
  { day: 'May 28', Low: 58.4, Medium: 23.5, High: 12.1 },
  { day: 'May 29', Low: 56.1, Medium: 24.6, High: 13.2 },
  { day: 'May 30', Low: 54.5, Medium: 25.2, High: 14.4 },
  { day: 'May 31', Low: 52.8, Medium: 25.8, High: 15.6 },
  { day: 'Jun 01', Low: 51.0, Medium: 26.5, High: 16.8 },
];
