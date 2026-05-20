export type TelemetryPayload = {
  deviceId: string;
  capturedAt: string;
  moisture?: number;
  temperature?: number;
  humidity?: number;
};

export async function submitTelemetry(payload: TelemetryPayload) {
  return payload;
}
