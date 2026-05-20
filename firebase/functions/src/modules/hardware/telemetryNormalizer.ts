export type RawTelemetryPayload = {
  deviceId?: string;
  timestamp?: string;
  moisture?: number;
  temperature?: number;
  humidity?: number;
  rawPayload?: unknown;
};

export function normalizeTelemetry(payload: RawTelemetryPayload) {
  return {
    deviceId: payload.deviceId ?? 'unknown-device',
    capturedAt: payload.timestamp ?? new Date().toISOString(),
    moisture: payload.moisture,
    temperature: payload.temperature,
    humidity: payload.humidity,
    rawPayload: payload.rawPayload ?? payload,
  };
}
