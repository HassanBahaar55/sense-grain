export type GrainReadingRecord = {
  readingId: string;
  deviceId: string;
  capturedAt: string;
  moisture?: number;
  temperature?: number;
  humidity?: number;
};

export async function onCreateReading(reading: GrainReadingRecord) {
  return reading;
}
