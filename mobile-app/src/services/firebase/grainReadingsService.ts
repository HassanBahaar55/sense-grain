import firestore from '@react-native-firebase/firestore';

export type GrainReading = {
  id: string;
  deviceId: string;
  capturedAt: string;
  moisture?: number;
  temperature?: number;
  humidity?: number;
};

type GrainReadingDocument = Omit<GrainReading, 'id'>;

export async function listGrainReadings(maxResults = 20): Promise<GrainReading[]> {
  const snapshot = await firestore()
    .collection('grainReadings')
    .orderBy('capturedAt', 'desc')
    .limit(maxResults)
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data() as Partial<GrainReadingDocument>;
    return {
      id: doc.id,
      deviceId: data.deviceId ?? '',
      capturedAt: data.capturedAt ?? '',
      moisture: data.moisture,
      temperature: data.temperature,
      humidity: data.humidity,
    };
  });
}
