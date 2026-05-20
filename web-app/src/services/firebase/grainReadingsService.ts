export type GrainReading = {
  id: string;
  deviceId: string;
  capturedAt: string;
  moisture?: number;
  temperature?: number;
  humidity?: number;
};

export async function listGrainReadings(): Promise<GrainReading[]> {
  return [];
}
