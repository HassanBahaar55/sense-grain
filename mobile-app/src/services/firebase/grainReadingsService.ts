import {
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import {getFirebaseApp} from './firebaseApp';

export type GrainReading = {
  id: string;
  deviceId: string;
  capturedAt: string;
  moisture?: number;
  temperature?: number;
  humidity?: number;
};

type GrainReadingDocument = Omit<GrainReading, 'id'>;

function mapGrainReading(
  document: QueryDocumentSnapshot,
): GrainReading {
  const data = document.data() as Partial<GrainReadingDocument>;

  return {
    id: document.id,
    deviceId: data.deviceId ?? '',
    capturedAt: data.capturedAt ?? '',
    moisture: data.moisture,
    temperature: data.temperature,
    humidity: data.humidity,
  };
}

export async function listGrainReadings(maxResults = 20) {
  const app = getFirebaseApp();

  if (!app) {
    return [];
  }

  const firestore = getFirestore(app);
  const readingsQuery = query(
    collection(firestore, 'grainReadings'),
    orderBy('capturedAt', 'desc'),
    limit(maxResults),
  );
  const snapshot = await getDocs(readingsQuery);

  return snapshot.docs.map(mapGrainReading);
}
